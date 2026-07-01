import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TOKEN_TIMEOUT_MS = 10_000;
const PAYMENT_TIMEOUT_MS = 20_000;

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getNetwalletToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const baseUrl = Deno.env.get('NETWALLET_BASE_URL') || 'https://netwalletpay.com';
  const t0 = Date.now();
  const res = await fetchWithTimeout(`${baseUrl}/api/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      primary_key: Deno.env.get('NETWALLET_PRIMARY_KEY')!,
      email: Deno.env.get('NETWALLET_EMAIL')!,
      grant_type: 'primary_key',
    }),
  }, TOKEN_TIMEOUT_MS);

  console.log(`[initiate-recharge] token ${res.status} in ${Date.now() - t0}ms`);

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Netwallet token error ${res.status}: ${txt}`);
  }

  const json = await res.json();
  cachedToken = json.access_token;
  tokenExpiresAt = Date.now() + (json.expires_in - 60) * 1000;
  return cachedToken!;
}

function mapProvider(method: string): { MethodType: string; MethodProvider: string } {
  switch (method) {
    case 'momo': return { MethodType: 'MOMO', MethodProvider: 'mtn_cm' };
    case 'om': return { MethodType: 'ORANGE_MONEY', MethodProvider: 'orange_cm' };
    default: return { MethodType: 'MOMO', MethodProvider: 'mtn_cm' };
  }
}

async function computeHash(parts: string[]): Promise<string> {
  const input = parts.join('_');
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeCameroonPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.startsWith('00237')) return digits.slice(2);
  if (digits.startsWith('237') && digits.length === 12) return digits;
  if (digits.length === 9 && digits.startsWith('6')) return `237${digits}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;

    const { amount_xaf, payment_method, phone_number } = await req.json();

    if (!amount_xaf || typeof amount_xaf !== 'number' || amount_xaf < 100) {
      return new Response(JSON.stringify({ error: 'amount_xaf must be at least 100' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payment_method || !['momo', 'om'].includes(payment_method)) {
      return new Response(JSON.stringify({ error: 'Invalid payment_method (momo, om)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!phone_number || typeof phone_number !== 'string') {
      return new Response(JSON.stringify({ error: 'phone_number is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedPhone = normalizeCameroonPhone(phone_number);
    if (!normalizedPhone) {
      return new Response(JSON.stringify({
        error: 'Invalid Cameroon phone number. Expected format: 237XXXXXXXXX or 6XXXXXXXX.',
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const commission = Math.ceil(amount_xaf * 0.05);
    const total_to_charge = amount_xaf + commission;
    const netwallet_fee = Math.ceil(amount_xaf * 0.02);
    const konnectik_profit = commission - netwallet_fee;
    const orderId = `RCH${Date.now()}${crypto.randomUUID().slice(0, 8).replace(/-/g, '')}`;

    const { MethodType, MethodProvider } = mapProvider(payment_method);
    const secondaryKey = Deno.env.get('NETWALLET_SECONDARY_KEY')!;
    const hash = await computeHash(['COLLECTION', 'MOBILE_MONEY', MethodProvider, orderId, secondaryKey]);

    const baseUrl = Deno.env.get('NETWALLET_BASE_URL') || 'https://netwalletpay.com';
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/recharge-webhook`;

    console.log('[initiate-recharge] start', { userId, amount_xaf, payment_method, orderId, phone: normalizedPhone.slice(0, 6) + '***' });

    const nwToken = await getNetwalletToken();
    const t1 = Date.now();
    const nwRes = await fetchWithTimeout(`${baseUrl}/api/v1/global/collection/request-payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nwToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        CurrencyCode: 'XAF',
        OrderID: orderId,
        Amount: total_to_charge,
        Method: 'MOBILE_MONEY',
        MethodType,
        CountryCode: 'CM',
        MethodProvider,
        PhoneNumber: normalizedPhone,
        Description: `Konnectik wallet recharge ${orderId}`,
        CallbackUrl: callbackUrl,
        Hash: hash,
      }),
    }, PAYMENT_TIMEOUT_MS);

    const nwBody = await nwRes.json();
    console.log('[initiate-recharge] request-payment', {
      httpStatus: nwRes.status,
      ms: Date.now() - t1,
      nwStatusCode: nwBody.statusCode,
      errorCode: nwBody.errorCode,
      message: nwBody.message,
    });

    if (!nwRes.ok || nwBody.statusCode !== 200) {
      return new Response(JSON.stringify({
        error: 'Payment provider error',
        detail: nwBody.message || nwBody.errorCode || 'Unknown error',
      }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aggregatorRef = nwBody.data;

    const { data: tx, error: txError } = await adminClient
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'recharge',
        amount_xaf: total_to_charge,
        fee_xaf: commission,
        net_xaf: amount_xaf,
        reference: orderId,
        aggregator_ref: aggregatorRef,
        status: 'pending',
      })
      .select('id, reference')
      .single();

    if (txError) throw txError;

    return new Response(JSON.stringify({
      transaction_id: tx.id,
      reference: tx.reference,
      aggregator_ref: aggregatorRef,
      amount_xaf,
      total_charged_xaf: total_to_charge,
      fee_xaf: commission,
      konnectik_profit_xaf: konnectik_profit,
      message: 'Recharge initiated — awaiting payment confirmation',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const e = err as Error;
    const message = e.name === 'AbortError'
      ? 'Payment provider timeout — please try again'
      : (e.message || 'Unknown error');
    console.error('[initiate-recharge] FATAL:', message, e.stack);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
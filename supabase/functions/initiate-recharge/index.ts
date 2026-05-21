import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// --- Netwallet token cache ---
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getNetwalletToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

<<<<<<< HEAD
  const baseUrl = Deno.env.get('NETWALLET_BASE_URL') || 'https://netwalletpay.com';
=======
  const baseUrl = Deno.env.get('NETWALLET_BASE_URL') || 'http://sandbox.netwalletpay.com';
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25
  const res = await fetch(`${baseUrl}/api/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      primary_key: Deno.env.get('NETWALLET_PRIMARY_KEY')!,
      email: Deno.env.get('NETWALLET_EMAIL')!,
      grant_type: 'primary_key',
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Netwallet token error ${res.status}: ${txt}`);
  }

  const json = await res.json();
  cachedToken = json.access_token;
  // Expire 60s early to avoid edge cases
  tokenExpiresAt = Date.now() + (json.expires_in - 60) * 1000;
  return cachedToken!;
}

// Map our payment_method to Netwallet provider IDs
function mapProvider(method: string): { MethodType: string; MethodProvider: string } {
  switch (method) {
    case 'momo': return { MethodType: 'MOMO', MethodProvider: 'mtn_cm' };
    case 'om': return { MethodType: 'ORANGE_MONEY', MethodProvider: 'orange_cm' };
    default: return { MethodType: 'MOMO', MethodProvider: 'mtn_cm' };
  }
}

// Compute SHA-256 HMAC hash for Netwallet request integrity
async function computeHash(parts: string[]): Promise<string> {
  const input = parts.join('_');
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
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

<<<<<<< HEAD
    // Normalize phone number to Netwallet's expected format: "237XXXXXXXXX" (no +, no spaces).
    // Accepts inputs like "+237 6XX XX XX XX", "6XXXXXXXX", "237XXXXXXXXX", "00237XXXXXXXXX".
    function normalizeCameroonPhone(raw: string): string | null {
      const digits = raw.replace(/[^\d]/g, '');
      if (digits.startsWith('00237')) return digits.slice(2);          // 00237xxx -> 237xxx
      if (digits.startsWith('237') && digits.length === 12) return digits;
      if (digits.length === 9 && digits.startsWith('6')) return `237${digits}`;
      return null;
    }
    const normalizedPhone = normalizeCameroonPhone(phone_number);
    if (!normalizedPhone) {
      return new Response(JSON.stringify({
        error: 'Invalid Cameroon phone number. Expected format: 237XXXXXXXXX or 6XXXXXXXX.',
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

=======
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Calculate commission (5% + 2% Netwallet fee)
    const commission = Math.ceil(amount_xaf * 0.05);
    const total_to_charge = amount_xaf + commission;
    const netwallet_fee = Math.ceil(amount_xaf * 0.02);
    const konnectik_profit = commission - netwallet_fee;
<<<<<<< HEAD
    // Netwallet rejects OrderIDs with hyphens (errorCode 4007 "order info invalid").
    // Keep alphanumeric only.
    const orderId = `RCH${Date.now()}${crypto.randomUUID().slice(0, 8).replace(/-/g, '')}`;
=======
    const orderId = `RCH-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25

    // --- Netwallet Collection API ---
    const { MethodType, MethodProvider } = mapProvider(payment_method);
    const secondaryKey = Deno.env.get('NETWALLET_SECONDARY_KEY')!;
    const hash = await computeHash(['COLLECTION', 'MOBILE_MONEY', MethodProvider, orderId, secondaryKey]);

<<<<<<< HEAD
    const baseUrl = Deno.env.get('NETWALLET_BASE_URL') || 'https://netwalletpay.com';
=======
    const baseUrl = Deno.env.get('NETWALLET_BASE_URL') || 'http://sandbox.netwalletpay.com';
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/recharge-webhook`;

    const nwToken = await getNetwalletToken();
    const nwRes = await fetch(`${baseUrl}/api/v1/global/collection/request-payment`, {
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
<<<<<<< HEAD
        PhoneNumber: normalizedPhone,
=======
        PhoneNumber: phone_number,
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25
        Description: `Konnectik wallet recharge ${orderId}`,
        CallbackUrl: callbackUrl,
        Hash: hash,
      }),
    });

    const nwBody = await nwRes.json();

    if (!nwRes.ok || nwBody.statusCode !== 200) {
      return new Response(JSON.stringify({
        error: 'Payment provider error',
        detail: nwBody.message || nwBody.errorCode || 'Unknown error',
      }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aggregatorRef = nwBody.data; // Netwallet transactionId e.g. "MM123456789"

<<<<<<< HEAD
    // Create pending wallet transaction.
    // net_xaf = montant crédité à l'utilisateur (ce qu'il rechargera réellement).
    // fee_xaf = commission totale prélevée (Netwallet + Konnectik profit).
=======
    // Create pending wallet transaction
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25
    const { data: tx, error: txError } = await adminClient
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'recharge',
<<<<<<< HEAD
        amount_xaf: total_to_charge,
        fee_xaf: commission,
        net_xaf: amount_xaf,
=======
        amount_xaf,
        fee_xaf: commission,
        net_xaf: konnectik_profit,
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25
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
<<<<<<< HEAD
      total_charged_xaf: total_to_charge,
      fee_xaf: commission,
      konnectik_profit_xaf: konnectik_profit,
=======
      fee_xaf: commission,
      net_xaf: konnectik_profit,
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25
      message: 'Recharge initiated — awaiting payment confirmation',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
<<<<<<< HEAD
    const e = err as Error;
    console.error('[initiate-recharge] FATAL:', e.message, e.stack);
    return new Response(JSON.stringify({
      error: e.message || 'Unknown error',
      stack: e.stack?.split('\n').slice(0, 5).join(' | '),
    }), {
=======
    return new Response(JSON.stringify({ error: (err as Error).message }), {
>>>>>>> f1babe4355523a47af564a1a0a05a5058a628e25
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

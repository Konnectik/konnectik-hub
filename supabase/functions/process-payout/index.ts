import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MINIMUM_PAYOUT_XAF = 5000;

// --- Netwallet token cache ---
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getNetwalletToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const baseUrl = Deno.env.get('NETWALLET_BASE_URL') || 'http://sandbox.netwalletpay.com';
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
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input));
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

    const { amount_xaf, payout_method, phone_number } = await req.json();

    if (!amount_xaf || typeof amount_xaf !== 'number' || amount_xaf < MINIMUM_PAYOUT_XAF) {
      return new Response(JSON.stringify({ error: `Minimum payout is ${MINIMUM_PAYOUT_XAF} XAF` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payout_method || !['momo', 'om'].includes(payout_method)) {
      return new Response(JSON.stringify({ error: 'Invalid payout_method (momo, om)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!phone_number || typeof phone_number !== 'string') {
      return new Response(JSON.stringify({ error: 'phone_number is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check wallet balance
    const { data: profile } = await adminClient
      .from('profiles')
      .select('wallet_balance_xaf')
      .eq('id', userId)
      .single();

    const currentBalance = profile?.wallet_balance_xaf ?? 0;

    if (currentBalance < amount_xaf) {
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate fee (1.5%)
    const fee = Math.ceil(amount_xaf * 0.015);
    const net = amount_xaf - fee;
    const orderId = `PAY-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    // --- Netwallet Payout API ---
    const { MethodType, MethodProvider } = mapProvider(payout_method);
    const secondaryKey = Deno.env.get('NETWALLET_SECONDARY_KEY')!;
    const hash = await computeHash(['PAYOUT', 'MOBILE_MONEY', MethodProvider, orderId, secondaryKey]);

    const baseUrl = Deno.env.get('NETWALLET_BASE_URL') || 'http://sandbox.netwalletpay.com';
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/recharge-webhook`;

    const nwToken = await getNetwalletToken();
    const nwRes = await fetch(`${baseUrl}/api/v1/global/payout/request-transfer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nwToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        CurrencyCode: 'XAF',
        OrderID: orderId,
        Amount: net, // Send the net amount after fee
        Method: 'MOBILE_MONEY',
        MethodType,
        CountryCode: 'CM',
        MethodProvider,
        PhoneNumber: phone_number,
        Description: `Konnectik payout ${orderId}`,
        CallbackUrl: callbackUrl,
        Hash: hash,
      }),
    });

    const nwBody = await nwRes.json();

    if (!nwRes.ok || nwBody.statusCode !== 200) {
      return new Response(JSON.stringify({
        error: 'Payout provider error',
        detail: nwBody.message || nwBody.errorCode || 'Unknown error',
      }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aggregatorRef = nwBody.data; // Netwallet transactionId

    // Debit wallet
    const newBalance = currentBalance - amount_xaf;
    await adminClient
      .from('profiles')
      .update({ wallet_balance_xaf: newBalance })
      .eq('id', userId);

    // Record wallet transaction
    const { data: tx, error: txError } = await adminClient
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'debit',
        amount_xaf,
        fee_xaf: fee,
        net_xaf: net,
        reference: orderId,
        aggregator_ref: aggregatorRef,
        status: 'pending', // Will be confirmed via webhook
      })
      .select('id, reference')
      .single();

    if (txError) {
      // Rollback wallet on failure
      await adminClient
        .from('profiles')
        .update({ wallet_balance_xaf: currentBalance })
        .eq('id', userId);
      throw txError;
    }

    return new Response(JSON.stringify({
      transaction_id: tx.id,
      reference: tx.reference,
      aggregator_ref: aggregatorRef,
      amount_xaf,
      fee_xaf: fee,
      net_xaf: net,
      new_balance_xaf: newBalance,
      message: 'Payout initiated — awaiting provider confirmation',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

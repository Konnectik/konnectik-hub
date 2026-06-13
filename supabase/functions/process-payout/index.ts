import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MINIMUM_PAYOUT_XAF = 5000;
const PAYOUT_FEE_RATE = 0.015; // 1.5% fee on payouts

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function fetchWithTimeout(url: string, init: RequestInit, ms: number, label: string): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  const started = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    console.log(`[process-payout] ${label} ${res.status} in ${Date.now() - started}ms`);
    return res;
  } catch (err) {
    const elapsed = Date.now() - started;
    if ((err as Error).name === 'AbortError') throw new Error(`${label} timeout after ${elapsed}ms`);
    throw new Error(`${label} network error: ${(err as Error).message}`);
  } finally {
    clearTimeout(t);
  }
}

async function getNetwalletToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const baseUrl = Deno.env.get('NETWALLET_BASE_URL') || 'https://netwalletpay.com';
  const res = await fetchWithTimeout(`${baseUrl}/api/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      primary_key: Deno.env.get('NETWALLET_PRIMARY_KEY')!,
      email: Deno.env.get('NETWALLET_EMAIL')!,
      grant_type: 'primary_key',
    }),
  }, 10000, 'token');
  if (!res.ok) throw new Error(`Netwallet token ${res.status}: ${await res.text()}`);
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
  const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeCameroonPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00237')) return digits.slice(2);
  if (digits.startsWith('237') && digits.length === 12) return digits;
  if (digits.length === 9 && digits.startsWith('6')) return `237${digits}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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

    const { amount_xaf, method, payout_method, phone_number } = await req.json();
    // Accept both `method` (new) and `payout_method` (legacy) for backward compat.
    const payoutMethod = method ?? payout_method;

    if (!amount_xaf || typeof amount_xaf !== 'number' || amount_xaf < MINIMUM_PAYOUT_XAF) {
      return new Response(JSON.stringify({ error: `Minimum payout is ${MINIMUM_PAYOUT_XAF} XAF` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!payoutMethod || !['momo', 'om', 'bank'].includes(payoutMethod)) {
      return new Response(JSON.stringify({ error: 'Invalid method (momo, om, bank)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Resolve the provider tied to the caller. Only that provider's balance
    // can be drawn from. Admins are NOT allowed to use this function; they
    // should trigger payouts via a separate admin tool.
    const { data: provider, error: provErr } = await adminClient
      .from('providers')
      .select('id, business_name, user_id, kyc_status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (provErr || !provider) {
      return new Response(JSON.stringify({ error: 'No provider profile found for this account' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (provider.kyc_status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Provider KYC not approved — payouts are disabled' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Read the PROVIDER wallet (not the user wallet). This is where the
    // earnings credited by end-segment accumulate.
    const { data: wallet, error: wErr } = await adminClient
      .from('provider_wallets')
      .select('balance_xaf')
      .eq('provider_id', provider.id)
      .maybeSingle();

    if (wErr) throw wErr;
    const currentBalance = wallet?.balance_xaf ?? 0;

    if (currentBalance < amount_xaf) {
      return new Response(JSON.stringify({
        error: 'Insufficient provider balance',
        available_xaf: currentBalance,
        requested_xaf: amount_xaf,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // For mobile money, phone is required and must be Cameroon-format.
    let normalizedPhone: string | null = null;
    if (payoutMethod === 'momo' || payoutMethod === 'om') {
      if (!phone_number || typeof phone_number !== 'string') {
        return new Response(JSON.stringify({ error: 'phone_number required for mobile money payouts' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      normalizedPhone = normalizeCameroonPhone(phone_number);
      if (!normalizedPhone) {
        return new Response(JSON.stringify({ error: 'Invalid Cameroon phone number' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const fee = Math.ceil(amount_xaf * PAYOUT_FEE_RATE);
    const net = amount_xaf - fee;
    // Netwallet rejects OrderIDs with hyphens (errorCode 4007) — alphanumeric only.
    const orderId = `PAY${Date.now()}${crypto.randomUUID().slice(0, 8).replace(/-/g, '')}`;

    // 3. Atomically debit the provider wallet AND create the payout_request
    // row. If the wallet balance changed between our SELECT and now, the
    // conditional UPDATE returns zero rows and we abort without ever calling
    // Netwallet.
    const { data: debited, error: debitErr } = await adminClient
      .from('provider_wallets')
      .update({ balance_xaf: currentBalance - amount_xaf })
      .eq('provider_id', provider.id)
      .eq('balance_xaf', currentBalance)
      .select('balance_xaf');

    if (debitErr) throw debitErr;
    if (!debited || debited.length === 0) {
      return new Response(JSON.stringify({
        error: 'Balance changed during payout request — please retry',
        code: 'CONCURRENT_MODIFICATION',
      }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: payoutRow, error: insErr } = await adminClient
      .from('payout_requests')
      .insert({
        provider_id: provider.id,
        requested_by: user.id,
        amount_xaf,
        fee_xaf: fee,
        net_xaf: net,
        method: payoutMethod,
        phone_number: normalizedPhone,
        status: 'pending',
        reference: orderId,
      })
      .select('id, reference')
      .single();

    if (insErr) {
      // Rollback the wallet debit
      await adminClient
        .from('provider_wallets')
        .update({ balance_xaf: currentBalance })
        .eq('provider_id', provider.id);
      throw insErr;
    }

    // 4. Call Netwallet (only for mobile money). Bank transfers are processed
    // manually by an admin from the dashboard — the row stays 'pending'.
    if (payoutMethod === 'bank') {
      return new Response(JSON.stringify({
        payout_id: payoutRow.id,
        reference: payoutRow.reference,
        amount_xaf,
        fee_xaf: fee,
        net_xaf: net,
        new_balance_xaf: currentBalance - amount_xaf,
        message: 'Bank transfer queued — will be processed by admin within 24h',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    try {
      const { MethodType, MethodProvider } = mapProvider(payoutMethod);
      const secondaryKey = Deno.env.get('NETWALLET_SECONDARY_KEY')!;
      const hash = await computeHash(['PAYOUT', 'MOBILE_MONEY', MethodProvider, orderId, secondaryKey]);

      const baseUrl = Deno.env.get('NETWALLET_BASE_URL') || 'https://netwalletpay.com';
      const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payout-webhook`;

      const nwToken = await getNetwalletToken();
      const nwRes = await fetchWithTimeout(`${baseUrl}/api/v1/global/payout/request-transfer`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${nwToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CurrencyCode: 'XAF', OrderID: orderId, Amount: net,
          Method: 'MOBILE_MONEY', MethodType, CountryCode: 'CM', MethodProvider,
          PhoneNumber: normalizedPhone, Description: `Konnectik payout ${provider.business_name}`,
          CallbackUrl: callbackUrl, Hash: hash,
        }),
      }, 20000, 'request-transfer');

      const nwBody = await nwRes.json();
      console.log('[process-payout] nw response', { httpStatus: nwRes.status, nwStatusCode: nwBody.statusCode, errorCode: nwBody.errorCode });

      if (!nwRes.ok || nwBody.statusCode !== 200) {
        // Mark as failed and refund the wallet.
        await adminClient.from('payout_requests')
          .update({ status: 'failed', error_message: nwBody.message || nwBody.errorCode || 'Unknown' })
          .eq('id', payoutRow.id);
        await adminClient.from('provider_wallets')
          .update({ balance_xaf: currentBalance })
          .eq('provider_id', provider.id);
        return new Response(JSON.stringify({
          error: 'Payout provider error',
          detail: nwBody.message || nwBody.errorCode || 'Unknown',
          nwBody,
        }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      await adminClient.from('payout_requests')
        .update({ status: 'processing', aggregator_ref: nwBody.data })
        .eq('id', payoutRow.id);

      return new Response(JSON.stringify({
        payout_id: payoutRow.id,
        reference: payoutRow.reference,
        aggregator_ref: nwBody.data,
        amount_xaf, fee_xaf: fee, net_xaf: net,
        new_balance_xaf: currentBalance - amount_xaf,
        message: 'Payout sent to provider — confirmation pending',
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (nwErr) {
      // Network error reaching Netwallet — refund and mark failed.
      await adminClient.from('payout_requests')
        .update({ status: 'failed', error_message: (nwErr as Error).message })
        .eq('id', payoutRow.id);
      await adminClient.from('provider_wallets')
        .update({ balance_xaf: currentBalance })
        .eq('provider_id', provider.id);
      throw nwErr;
    }
  } catch (err) {
    const e = err as Error;
    console.error('[process-payout] FATAL:', e.message);
    return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

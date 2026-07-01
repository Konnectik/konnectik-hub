import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function verifyCallbackToken(token: string, orderId: string): Promise<boolean> {
  const secondaryKey = Deno.env.get('NETWALLET_SECONDARY_KEY');
  if (!secondaryKey) return false;

  const input = `${orderId}_${secondaryKey}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  const expected = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return token === expected;
}

function mapStatus(nwStatus: string): 'confirmed' | 'failed' | 'pending' {
  switch (nwStatus.toUpperCase()) {
    case 'SUCCESS': return 'confirmed';
    case 'PENDING': return 'pending';
    case 'FAILED':
    case 'CANCELLED':
    case 'TIMEOUT':
    default: return 'failed';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { Status, TransactionId } = body;

    if (!TransactionId || typeof TransactionId !== 'string') {
      return new Response(JSON.stringify({ error: 'TransactionId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!Status || typeof Status !== 'string') {
      return new Response(JSON.stringify({ error: 'Status is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tx, error: txError } = await adminClient
      .from('wallet_transactions')
      .select('*')
      .eq('aggregator_ref', TransactionId)
      .eq('status', 'pending')
      .single();

    if (txError || !tx) {
      return new Response(JSON.stringify({ error: 'Transaction not found or already processed', idempotent: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callbackToken = req.headers.get('X-CallbackToken');
    if (callbackToken) {
      const valid = await verifyCallbackToken(callbackToken, tx.reference);
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Invalid callback token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const internalStatus = mapStatus(Status);

    if (internalStatus === 'pending') {
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (internalStatus === 'confirmed') {
      const { data: updated } = await adminClient
        .from('wallet_transactions')
        .update({ status: 'confirmed' })
        .eq('id', tx.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();

      if (!updated) {
        return new Response(JSON.stringify({ received: true, idempotent: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: profile } = await adminClient
        .from('profiles')
        .select('wallet_balance_xaf')
        .eq('id', tx.user_id)
        .single();

      const balanceBefore = profile?.wallet_balance_xaf ?? 0;
      const balanceAfter = balanceBefore + tx.net_xaf;
      await adminClient
        .from('profiles')
        .update({ wallet_balance_xaf: balanceAfter })
        .eq('id', tx.user_id);

      console.log('[recharge-webhook] credit applied', {
        txId: tx.id,
        userId: tx.user_id,
        creditedXaf: tx.net_xaf,
        balanceBefore,
        balanceAfter,
      });

      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await adminClient
      .from('wallet_transactions')
      .update({ status: 'failed' })
      .eq('id', tx.id)
      .eq('status', 'pending');

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
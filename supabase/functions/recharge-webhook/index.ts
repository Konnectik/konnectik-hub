import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // In production, validate webhook signature from Mansar
    // const signature = req.headers.get('x-mansar-signature');
    // if (!verifySignature(signature, body, secret)) { return 401; }

    const body = await req.json();
    const { mansar_ref, status, external_ref } = body;

    if (!mansar_ref || typeof mansar_ref !== 'string') {
      return new Response(JSON.stringify({ error: 'mansar_ref is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!status || !['success', 'failed'].includes(status)) {
      return new Response(JSON.stringify({ error: 'status must be success or failed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find the pending transaction
    const { data: tx, error: txError } = await adminClient
      .from('wallet_transactions')
      .select('*')
      .eq('mansar_ref', mansar_ref)
      .eq('status', 'pending')
      .single();

    if (txError || !tx) {
      return new Response(JSON.stringify({ error: 'Transaction not found or already processed' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (status === 'success') {
      // Update transaction to confirmed
      await adminClient
        .from('wallet_transactions')
        .update({ status: 'confirmed' })
        .eq('id', tx.id);

      // Credit the user's wallet with the net amount
      const { data: profile } = await adminClient
        .from('profiles')
        .select('wallet_balance_xaf')
        .eq('id', tx.user_id)
        .single();

      const currentBalance = profile?.wallet_balance_xaf ?? 0;
      await adminClient
        .from('profiles')
        .update({ wallet_balance_xaf: currentBalance + tx.net_xaf })
        .eq('id', tx.user_id);

      return new Response(JSON.stringify({
        message: 'Recharge confirmed',
        user_id: tx.user_id,
        credited_xaf: tx.net_xaf,
        new_balance_xaf: currentBalance + tx.net_xaf,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // Mark as failed
      await adminClient
        .from('wallet_transactions')
        .update({ status: 'failed' })
        .eq('id', tx.id);

      return new Response(JSON.stringify({
        message: 'Recharge failed',
        user_id: tx.user_id,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

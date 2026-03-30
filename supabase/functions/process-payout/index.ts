import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MINIMUM_PAYOUT_XAF = 5000;

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

    const { amount_xaf, payout_method, payout_destination } = await req.json();

    if (!amount_xaf || typeof amount_xaf !== 'number' || amount_xaf < MINIMUM_PAYOUT_XAF) {
      return new Response(JSON.stringify({ error: `Minimum payout is ${MINIMUM_PAYOUT_XAF} XAF` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payout_method || !['momo', 'om', 'bank'].includes(payout_method)) {
      return new Response(JSON.stringify({ error: 'Invalid payout_method (momo, om, bank)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check user wallet balance
    const { data: profile } = await adminClient
      .from('profiles')
      .select('wallet_balance_xaf')
      .eq('id', user.id)
      .single();

    const currentBalance = profile?.wallet_balance_xaf ?? 0;

    if (currentBalance < amount_xaf) {
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate payout fee (mocked: 1.5%)
    const fee = Math.ceil(amount_xaf * 0.015);
    const net = amount_xaf - fee;
    const reference = `PAY-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    // --- MOCKED MANSAR PAYOUT ---
    // In production, this calls Mansar's disbursement API to send funds
    // to the user's mobile money or bank account.
    const mockMansarRef = `MANSAR-PAY-${crypto.randomUUID().slice(0, 12)}`;
    // --- END MOCK ---

    // Debit wallet
    const newBalance = currentBalance - amount_xaf;
    await adminClient
      .from('profiles')
      .update({ wallet_balance_xaf: newBalance })
      .eq('id', user.id);

    // Record wallet transaction
    const { data: tx, error: txError } = await adminClient
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        type: 'debit',
        amount_xaf,
        fee_xaf: fee,
        net_xaf: net,
        reference,
        mansar_ref: mockMansarRef,
        status: 'confirmed',
      })
      .select('id, reference')
      .single();

    if (txError) {
      // Rollback wallet on failure
      await adminClient
        .from('profiles')
        .update({ wallet_balance_xaf: currentBalance })
        .eq('id', user.id);
      throw txError;
    }

    return new Response(JSON.stringify({
      transaction_id: tx.id,
      reference: tx.reference,
      mansar_ref: mockMansarRef,
      amount_xaf,
      fee_xaf: fee,
      net_xaf: net,
      new_balance_xaf: newBalance,
      message: 'Payout processed successfully',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

    const { amount_xaf, payment_method } = await req.json();

    if (!amount_xaf || typeof amount_xaf !== 'number' || amount_xaf < 100) {
      return new Response(JSON.stringify({ error: 'amount_xaf must be at least 100' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payment_method || !['momo', 'om', 'bank'].includes(payment_method)) {
      return new Response(JSON.stringify({ error: 'Invalid payment_method (momo, om, bank)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Calculate fee (mocked: 2% fee)
    const fee = Math.ceil(amount_xaf * 0.02);
    const net = amount_xaf - fee;
    const reference = `RCH-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    // --- MOCKED MANSAR API CALL ---
    // In production, this would call the Mansar payment gateway to initiate
    // a Mobile Money / Orange Money collection request.
    // The gateway would return a transaction reference and a payment URL/USSD prompt.
    const mockMansarRef = `MANSAR-MOCK-${crypto.randomUUID().slice(0, 12)}`;
    const mockPaymentUrl = `https://pay.mansar.mock/checkout/${mockMansarRef}`;
    // --- END MOCK ---

    // Create pending wallet transaction
    const { data: tx, error: txError } = await adminClient
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        type: 'recharge',
        amount_xaf,
        fee_xaf: fee,
        net_xaf: net,
        reference,
        mansar_ref: mockMansarRef,
        status: 'pending',
      })
      .select('id, reference')
      .single();

    if (txError) throw txError;

    return new Response(JSON.stringify({
      transaction_id: tx.id,
      reference: tx.reference,
      mansar_ref: mockMansarRef,
      payment_url: mockPaymentUrl,
      amount_xaf,
      fee_xaf: fee,
      net_xaf: net,
      message: 'Recharge initiated — awaiting payment confirmation',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

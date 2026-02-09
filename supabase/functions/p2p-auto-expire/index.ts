import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpiredOrder {
  id: string;
  order_type: 'buy' | 'sell';
  status: string;
  creator_id: string;
  executor_id: string | null;
  nova_amount: number;
  local_amount: number;
  country: string;
  matched_at: string;
  time_limit_minutes: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find orders that have expired in awaiting_payment status
    const now = new Date();
    
    // Get all orders in awaiting_payment or payment_sent that might have expired
    const { data: activeOrders, error: fetchError } = await supabase
      .from('p2p_orders')
      .select('*')
      .in('status', ['awaiting_payment', 'payment_sent'])
      .not('matched_at', 'is', null);

    if (fetchError) {
      console.error('Error fetching orders:', fetchError);
      throw fetchError;
    }

    const expiredOrders: ExpiredOrder[] = [];
    const disputedOrders: ExpiredOrder[] = [];

    // Check each order for expiration
    for (const order of activeOrders || []) {
      const matchedAt = new Date(order.matched_at);
      const expiresAt = new Date(matchedAt.getTime() + order.time_limit_minutes * 60 * 1000);
      
      if (now > expiresAt) {
        if (order.status === 'awaiting_payment') {
          expiredOrders.push(order as ExpiredOrder);
        } else if (order.status === 'payment_sent') {
          disputedOrders.push(order as ExpiredOrder);
        }
      }
    }

    const results = {
      expiredCount: 0,
      disputedCount: 0,
      errors: [] as string[],
    };

    // Process expired orders (return to market)
    for (const order of expiredOrders) {
      try {
        // Reset order to open (return to market)
        const { error: updateError } = await supabase
          .from('p2p_orders')
          .update({
            status: 'open',
            executor_id: null,
            matched_at: null,
          })
          .eq('id', order.id);

        if (updateError) throw updateError;

        // Send system message
        const systemMessage = {
          order_id: order.id,
          sender_id: order.creator_id,
          content: '⏰ Time expired – Order has been returned to the marketplace\n🔄 The transaction was not completed in time',
          content_ar: '⏰ انتهى الوقت – تم إعادة الطلب إلى السوق\n🔄 لم تكتمل الصفقة في الوقت المحدد',
          is_system_message: true,
          message_type: 'order_expired',
        };

        await supabase.from('p2p_messages').insert(systemMessage);

        // AI observability: log why this order expired
        await supabase.from('ai_activity_stream').insert({
          action_type: 'p2p_timer_expired',
          entity_type: 'p2p_order',
          entity_id: order.id,
          role: 'system',
          success: true,
          before_state: { status: 'awaiting_payment', order_type: order.order_type, nova_amount: order.nova_amount, country: order.country, matched_at: order.matched_at, time_limit_minutes: order.time_limit_minutes },
          after_state: { status: 'open', reason: 'payment_timeout' },
        });

        results.expiredCount++;
      } catch (err) {
        results.errors.push(`Error expiring order ${order.id}: ${err}`);
      }
    }

    // Process disputed orders (auto-dispute when paid but expired)
    for (const order of disputedOrders) {
      try {
        // Open dispute
        const { error: updateError } = await supabase
          .from('p2p_orders')
          .update({
            status: 'disputed',
            cancellation_reason: 'Timer expired during payment confirmation',
          })
          .eq('id', order.id);

        if (updateError) throw updateError;

        // Send system message
        const systemMessage = {
          order_id: order.id,
          sender_id: order.creator_id,
          content: '⚖️ Dispute opened: Timer expired during payment confirmation\nSupport team will join the conversation',
          content_ar: '⚖️ تم فتح نزاع: انتهى الوقت أثناء تأكيد الدفع\nفريق الدعم سينضم للمحادثة',
          is_system_message: true,
          message_type: 'dispute_opened',
        };

        await supabase.from('p2p_messages').insert(systemMessage);

        // AI observability: log auto-dispute with context
        await supabase.from('ai_activity_stream').insert({
          action_type: 'p2p_auto_dispute',
          entity_type: 'p2p_order',
          entity_id: order.id,
          role: 'system',
          success: true,
          before_state: { status: 'payment_sent', order_type: order.order_type, nova_amount: order.nova_amount, country: order.country, matched_at: order.matched_at, time_limit_minutes: order.time_limit_minutes },
          after_state: { status: 'disputed', reason: 'confirmation_timeout' },
        });

        results.disputedCount++;
      } catch (err) {
        results.errors.push(`Error disputing order ${order.id}: ${err}`);
      }
    }

    console.log('P2P Auto-Expire Results:', results);

    return new Response(JSON.stringify({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('P2P Auto-Expire Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

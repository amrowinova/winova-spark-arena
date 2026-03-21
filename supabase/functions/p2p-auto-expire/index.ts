/**
 * P2P Auto-Expire Edge Function
 * ──────────────────────────────────
 * Automatically expires stale P2P orders that exceed their time limits.
 *
 * Invocation options:
 *   - Cron trigger (pg_cron job) using CRON_SECRET in Authorization header
 *   - Manual HTTP call by authenticated admin users
 *
 * Required environment variables:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - CRON_SECRET (random 32+ char secret, shared only with pg_cron job)
 *
 * pg_cron job must send:
 *   Authorization: Bearer <CRON_SECRET>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS: restricted to the app domain only — never open to *
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://winova-spark-arena-claude.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('CRON_SECRET') ?? '';

    const authHeader = req.headers.get('Authorization');
    const bearerToken = authHeader?.replace('Bearer ', '') ?? '';

    // ── Authentication: accept service-role key OR CRON_SECRET OR admin JWT ──
    const isServiceRole = bearerToken === supabaseServiceKey;
    const isCronSecret = cronSecret.length > 0 && bearerToken === cronSecret;

    if (!isServiceRole && !isCronSecret) {
      // Fallback: allow authenticated admin user (manual invocation)
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tempClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: { user } } = await tempClient.auth.getUser(bearerToken);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: roles } = await tempClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (!roles?.some((r: { role: string }) => r.role === 'admin')) {
        return new Response(
          JSON.stringify({ error: 'Admin, service-role, or cron secret required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();

    // Get all matched orders that might have expired
    const { data: activeOrders, error: fetchError } = await supabase
      .from('p2p_orders')
      .select('id, order_type, status, creator_id, executor_id, nova_amount, local_amount, country, matched_at, time_limit_minutes')
      .in('status', ['awaiting_payment', 'payment_sent'])
      .not('matched_at', 'is', null);

    if (fetchError) throw fetchError;

    const results = { expiredCount: 0, disputedCount: 0, staleCount: 0, errors: [] as string[] };

    // Process expired orders via the atomic RPC (handles escrow unlock)
    for (const order of activeOrders || []) {
      const matchedAt = new Date(order.matched_at);
      const expiresAt = new Date(matchedAt.getTime() + order.time_limit_minutes * 60 * 1000);

      if (now > expiresAt) {
        try {
          const { data, error } = await supabase.rpc('p2p_expire_order', { p_order_id: order.id });
          if (error) throw error;

          const result = data as { success: boolean; action?: string; error?: string };
          if (!result.success) {
            results.errors.push(`Order ${order.id}: ${result.error}`);
            continue;
          }

          if (result.action === 'returned_to_market') results.expiredCount++;
          else if (result.action === 'auto_disputed') results.disputedCount++;

          // AI observability
          await supabase.from('ai_activity_stream').insert({
            action_type: result.action === 'auto_disputed' ? 'p2p_auto_dispute' : 'p2p_timer_expired',
            entity_type: 'p2p_order',
            entity_id: order.id,
            role: 'system',
            success: true,
            before_state: { status: order.status, order_type: order.order_type, nova_amount: order.nova_amount, country: order.country, matched_at: order.matched_at, time_limit_minutes: order.time_limit_minutes },
            after_state: { action: result.action },
          });
        } catch (err) {
          results.errors.push(`Error expiring order ${order.id}: ${err}`);
        }
      }
    }

    // Cleanup stale unmatched buy orders (>72h)
    try {
      const { data, error } = await supabase.rpc('p2p_cleanup_stale_orders');
      if (error) throw error;
      const cleanup = data as { success: boolean; cancelled_count: number };
      results.staleCount = cleanup.cancelled_count || 0;
    } catch (err) {
      results.errors.push(`Stale cleanup error: ${err}`);
    }

    console.log('P2P Auto-Expire Results:', results);

    return new Response(JSON.stringify({ success: true, timestamp: now.toISOString(), ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('P2P Auto-Expire Error:', error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

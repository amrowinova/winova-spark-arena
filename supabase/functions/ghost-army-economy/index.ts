import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EconomyMetrics {
  wallets_seeded: number;
  seed_amount_total: number;
  sell_orders_created: number;
  sell_orders_failed: number;
  orders_executed: number;
  orders_execute_failed: number;
  payments_confirmed: number;
  payments_failed: number;
  escrows_released: number;
  escrows_failed: number;
  ratings_submitted: number;
  ratings_failed: number;
  cycles_completed: number;
  total_nova_traded: number;
  errors: string[];
}

function pick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await adminClient.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: roles } = await adminClient.from('user_roles').select('role').eq('user_id', user.id);
      if (!roles?.some((r: any) => r.role === 'admin')) {
        return new Response(JSON.stringify({ error: 'Admin only' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const tradeCount: number = body.trade_count || 30;
    const seedAmount: number = body.seed_amount || 10; // Small Nova per agent
    const cycles: number = body.cycles || 1;

    const startTime = Date.now();

    const metrics: EconomyMetrics = {
      wallets_seeded: 0, seed_amount_total: 0,
      sell_orders_created: 0, sell_orders_failed: 0,
      orders_executed: 0, orders_execute_failed: 0,
      payments_confirmed: 0, payments_failed: 0,
      escrows_released: 0, escrows_failed: 0,
      ratings_submitted: 0, ratings_failed: 0,
      cycles_completed: 0, total_nova_traded: 0,
      errors: [],
    };

    // 1. Get ghost agents
    const { data: ghosts } = await adminClient
      .from('profiles').select('id, user_id, username')
      .like('username', 'ghost_agent_%').limit(200);

    if (!ghosts || ghosts.length < 4) {
      return new Response(JSON.stringify({ error: 'Need at least 4 ghost agents' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Seed wallets with small Nova amounts (admin inject via direct update with service role)
    const tradingAgents = pick(ghosts, Math.min(tradeCount * 2, ghosts.length));
    
    for (const agent of tradingAgents) {
      const { data: wallet } = await adminClient
        .from('wallets').select('nova_balance').eq('user_id', agent.user_id).single();
      
      if (wallet && Number(wallet.nova_balance) < seedAmount) {
        // Use admin_adjust_balance RPC if available, otherwise direct seed
        const { error: seedErr } = await adminClient.rpc('admin_adjust_balance', {
          p_user_id: agent.user_id,
          p_currency: 'nova',
          p_amount: seedAmount,
          p_reason: `[GHOST_ECONOMY] Seed for autonomous trading`,
          p_admin_id: agent.user_id, // self-seed for ghost
        });

        if (seedErr) {
          // Fallback: direct wallet update via service role
          const currentBalance = Number(wallet.nova_balance);
          const newBalance = currentBalance + seedAmount;
          const { error: directErr } = await adminClient
            .from('wallets').update({ nova_balance: newBalance }).eq('user_id', agent.user_id);
          
          if (directErr) {
            metrics.errors.push(`Seed failed for ${agent.username}: ${directErr.message}`);
            continue;
          }

          // Record in ledger manually
          await adminClient.from('wallet_ledger').insert({
            user_id: agent.user_id,
            entry_type: 'admin_credit',
            currency: 'nova',
            amount: seedAmount,
            balance_before: currentBalance,
            balance_after: newBalance,
            description: `[GHOST_ECONOMY] Trading seed`,
            description_ar: `[GHOST_ECONOMY] رصيد تداول تجريبي`,
            reference_type: 'ghost_economy',
          });
        }

        metrics.wallets_seeded++;
        metrics.seed_amount_total += seedAmount;
      } else if (wallet) {
        // Already has enough
        metrics.wallets_seeded++;
      }
    }

    // 3. Run trading cycles
    for (let cycle = 0; cycle < cycles; cycle++) {
      const shuffled = [...tradingAgents].sort(() => Math.random() - 0.5);
      const pairCount = Math.min(Math.floor(shuffled.length / 2), tradeCount);

      for (let i = 0; i < pairCount; i++) {
        const seller = shuffled[i * 2];
        const buyer = shuffled[i * 2 + 1];
        
        // Use small amounts: 1-3 Nova per trade
        const novaAmount = Math.floor(Math.random() * 3) + 1;
        const exchangeRate = Math.round((Math.random() * 2 + 1) * 100) / 100;
        const localAmount = Math.round(novaAmount * exchangeRate * 100) / 100;

        // ── STEP 1: Create Sell Order (via RPC) ──
        const { data: createResult, error: createErr } = await adminClient.rpc('p2p_create_sell_order', {
          p_creator_id: seller.user_id,
          p_nova_amount: novaAmount,
          p_local_amount: localAmount,
          p_exchange_rate: exchangeRate,
          p_country: 'SA',
          p_time_limit_minutes: 30,
          p_payment_method_id: null,
        });

        if (createErr) {
          metrics.sell_orders_failed++;
          metrics.errors.push(`Create sell failed (${seller.username}): ${createErr.message}`);
          continue;
        }

        const sellResult = createResult as any;
        if (!sellResult?.success || !sellResult?.order_id) {
          metrics.sell_orders_failed++;
          metrics.errors.push(`Create sell rejected (${seller.username}): ${sellResult?.error || 'unknown'}`);
          continue;
        }

        metrics.sell_orders_created++;
        const orderId = sellResult.order_id;

        // ── STEP 2: Execute/Match Order (buyer accepts) ──
        const { data: execResult, error: execErr } = await adminClient.rpc('p2p_execute_order', {
          p_order_id: orderId,
          p_executor_id: buyer.user_id,
          p_payment_method_id: null,
        });

        if (execErr) {
          metrics.orders_execute_failed++;
          metrics.errors.push(`Execute failed (${buyer.username}): ${execErr.message}`);
          continue;
        }

        const matchResult = execResult as any;
        if (!matchResult?.success) {
          metrics.orders_execute_failed++;
          metrics.errors.push(`Execute rejected (${buyer.username}): ${matchResult?.error || 'unknown'}`);
          continue;
        }

        metrics.orders_executed++;

        // ── STEP 3: Confirm Payment (buyer marks paid) ──
        const { data: payResult, error: payErr } = await adminClient.rpc('p2p_confirm_payment', {
          p_order_id: orderId,
          p_user_id: buyer.user_id,
        });

        if (payErr) {
          metrics.payments_failed++;
          metrics.errors.push(`Confirm payment failed: ${payErr.message}`);
          continue;
        }

        const confirmResult = payResult as any;
        if (!confirmResult?.success) {
          metrics.payments_failed++;
          metrics.errors.push(`Confirm payment rejected: ${confirmResult?.error || 'unknown'}`);
          continue;
        }

        metrics.payments_confirmed++;

        // ── STEP 4: Release Escrow (seller confirms & releases Nova) ──
        const { data: releaseResult, error: releaseErr } = await adminClient.rpc('p2p_release_escrow', {
          p_order_id: orderId,
          p_user_id: seller.user_id,
        });

        if (releaseErr) {
          metrics.escrows_failed++;
          metrics.errors.push(`Release escrow failed: ${releaseErr.message}`);
          continue;
        }

        const relResult = releaseResult as any;
        if (!relResult?.success) {
          metrics.escrows_failed++;
          metrics.errors.push(`Release escrow rejected: ${relResult?.error || 'unknown'}`);
          continue;
        }

        metrics.escrows_released++;
        metrics.total_nova_traded += novaAmount;

        // ── STEP 5: Leave Rating ──
        const isPositive = Math.random() > 0.15; // 85% positive
        const ratingComments = isPositive
          ? ['[GHOST_ECONOMY] تعامل ممتاز 👍', '[GHOST_ECONOMY] بائع سريع وموثوق', '[GHOST_ECONOMY] شكراً، تجربة رائعة']
          : ['[GHOST_ECONOMY] تأخر في الرد', '[GHOST_ECONOMY] يحتاج تحسين'];
        
        const comment = ratingComments[Math.floor(Math.random() * ratingComments.length)];

        const { error: rateErr } = await adminClient.from('p2p_ratings').insert({
          order_id: orderId,
          rater_id: buyer.user_id,
          rated_id: seller.user_id,
          rating: isPositive ? 1 : -1,
          comment,
        });

        if (rateErr) {
          metrics.ratings_failed++;
        } else {
          metrics.ratings_submitted++;
        }

        // Seller also rates buyer (50% chance)
        if (Math.random() > 0.5) {
          const sellerPositive = Math.random() > 0.1;
          const sellerComment = sellerPositive
            ? '[GHOST_ECONOMY] مشتري ممتاز، دفع بسرعة'
            : '[GHOST_ECONOMY] تأخر في الدفع';

          const { error: sellerRateErr } = await adminClient.from('p2p_ratings').insert({
            order_id: orderId,
            rater_id: seller.user_id,
            rated_id: buyer.user_id,
            rating: sellerPositive ? 1 : -1,
            comment: sellerComment,
          });

          if (!sellerRateErr) metrics.ratings_submitted++;
          else metrics.ratings_failed++;
        }
      }

      metrics.cycles_completed++;
    }

    // 4. Log to system_incidents for visibility
    const incidentRows = metrics.errors.slice(0, 20).map(err => ({
      actor_username: 'ghost_economy',
      is_ghost: true,
      screen: 'commander/ghost-army',
      feature: 'Autonomous_Economy',
      action_type: 'p2p_economy_error',
      error_message: err,
      error_code: 'economy_error',
      severity: 'medium' as const,
      category: 'Behavioral_P2P',
      endpoint: 'ghost-army-economy',
      flow: 'Autonomous Economy',
      root_cause: 'RPC rejection or insufficient balance',
      metadata: { cycle: cycles, trade_count: tradeCount },
    }));

    if (incidentRows.length > 0) {
      await adminClient.from('system_incidents').insert(incidentRows);
    }

    // 5. Log success proposal
    await adminClient.from('ai_proposals').insert({
      title: `[ECONOMY] Autonomous marketplace: ${metrics.escrows_released} trades completed, ${metrics.total_nova_traded}И traded`,
      title_ar: `[ECONOMY] سوق ذاتي: ${metrics.escrows_released} صفقة مكتملة، ${metrics.total_nova_traded}И تم تداولها`,
      description: [
        '── AUTONOMOUS ECONOMY REPORT ──',
        `Wallets seeded: ${metrics.wallets_seeded} (${metrics.seed_amount_total}И total)`,
        `Sell orders: ${metrics.sell_orders_created} created, ${metrics.sell_orders_failed} failed`,
        `Matched: ${metrics.orders_executed} (${metrics.orders_execute_failed} failed)`,
        `Payments confirmed: ${metrics.payments_confirmed} (${metrics.payments_failed} failed)`,
        `Escrows released: ${metrics.escrows_released} (${metrics.escrows_failed} failed)`,
        `Ratings: ${metrics.ratings_submitted} submitted (${metrics.ratings_failed} failed)`,
        `Total Nova traded: ${metrics.total_nova_traded}И across ${metrics.cycles_completed} cycle(s)`,
        '',
        metrics.errors.length > 0 ? `── ERRORS (${metrics.errors.length}) ──\n${metrics.errors.slice(0, 10).join('\n')}` : '✅ No errors',
      ].join('\n'),
      description_ar: `سوق ذاتي: ${metrics.escrows_released} صفقة، ${metrics.total_nova_traded}И. ${metrics.errors.length} خطأ.`,
      proposal_type: 'system_diagnostic',
      priority: metrics.errors.length > metrics.escrows_released ? 'high' : 'low',
      affected_area: 'infrastructure',
      status: 'pending',
      risk_level: metrics.errors.length > metrics.escrows_released ? 'high' : 'low',
      impact_scope: 'platform_wide',
    });

    const duration = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      summary: {
        duration_ms: duration,
        ...metrics,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

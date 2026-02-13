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
  tips_sent: number;
  tips_failed: number;
  tips_nova_total: number;
  contest_attempts: number;
  contest_joined: number;
  contest_insufficient: number;
  hunger_trades_triggered: number;
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

    // SECURITY: Mandatory admin auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
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

    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const tradeCount: number = body.trade_count || 50;
    const seedAmount: number = body.seed_amount || 10;
    const cycles: number = body.cycles || 1;
    const enableTips: boolean = body.enable_tips !== false;
    const enableHunger: boolean = body.enable_hunger !== false;
    const tipCount: number = body.tip_count || 20;

    const startTime = Date.now();

    const metrics: EconomyMetrics = {
      wallets_seeded: 0, seed_amount_total: 0,
      sell_orders_created: 0, sell_orders_failed: 0,
      orders_executed: 0, orders_execute_failed: 0,
      payments_confirmed: 0, payments_failed: 0,
      escrows_released: 0, escrows_failed: 0,
      ratings_submitted: 0, ratings_failed: 0,
      cycles_completed: 0, total_nova_traded: 0,
      tips_sent: 0, tips_failed: 0, tips_nova_total: 0,
      contest_attempts: 0, contest_joined: 0, contest_insufficient: 0,
      hunger_trades_triggered: 0,
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

    // 2. Seed wallets
    const tradingAgents = pick(ghosts, Math.min(tradeCount * 2, ghosts.length));
    for (const agent of tradingAgents) {
      const { data: wallet } = await adminClient
        .from('wallets').select('nova_balance').eq('user_id', agent.user_id).single();
      if (wallet && Number(wallet.nova_balance) < seedAmount) {
        const { error: seedErr } = await adminClient.rpc('admin_adjust_balance', {
          p_user_id: agent.user_id,
          p_currency: 'nova',
          p_amount: seedAmount,
          p_reason: `[GHOST_ECONOMY] Seed for autonomous trading`,
          p_admin_id: agent.user_id,
        });
        if (seedErr) {
          const currentBalance = Number(wallet.nova_balance);
          const newBalance = currentBalance + seedAmount;
          const { error: directErr } = await adminClient
            .from('wallets').update({ nova_balance: newBalance }).eq('user_id', agent.user_id);
          if (directErr) {
            metrics.errors.push(`Seed failed for ${agent.username}: ${directErr.message}`);
            continue;
          }
          await adminClient.from('wallet_ledger').insert({
            user_id: agent.user_id, entry_type: 'admin_credit', currency: 'nova',
            amount: seedAmount, balance_before: currentBalance, balance_after: newBalance,
            description: `[GHOST_ECONOMY] Trading seed`,
            description_ar: `[GHOST_ECONOMY] رصيد تداول تجريبي`,
            reference_type: 'ghost_economy',
          });
        }
        metrics.wallets_seeded++;
        metrics.seed_amount_total += seedAmount;
      } else if (wallet) {
        metrics.wallets_seeded++;
      }
    }

    // ═══════════════════════════════════════════
    // 3. AGGRESSIVE P2P TRADING CYCLES
    // ═══════════════════════════════════════════
    for (let cycle = 0; cycle < cycles; cycle++) {
      const shuffled = [...tradingAgents].sort(() => Math.random() - 0.5);
      const pairCount = Math.min(Math.floor(shuffled.length / 2), tradeCount);

      for (let i = 0; i < pairCount; i++) {
        const seller = shuffled[i * 2];
        const buyer = shuffled[i * 2 + 1];
        const novaAmount = Math.floor(Math.random() * 3) + 1;
        const exchangeRate = Math.round((Math.random() * 2 + 1) * 100) / 100;
        const localAmount = Math.round(novaAmount * exchangeRate * 100) / 100;

        // STEP 1: Create Sell Order
        const { data: createResult, error: createErr } = await adminClient.rpc('p2p_create_sell_order', {
          p_creator_id: seller.user_id,
          p_nova_amount: novaAmount,
          p_local_amount: localAmount,
          p_exchange_rate: exchangeRate,
          p_country: 'SA',
          p_time_limit_minutes: 30,
          p_payment_method_id: null,
        });
        if (createErr) { metrics.sell_orders_failed++; metrics.errors.push(`Create: ${seller.username}: ${createErr.message}`); continue; }
        const sellResult = createResult as any;
        if (!sellResult?.success || !sellResult?.order_id) { metrics.sell_orders_failed++; continue; }
        metrics.sell_orders_created++;
        const orderId = sellResult.order_id;

        // STEP 2: Execute Order
        const { data: execResult, error: execErr } = await adminClient.rpc('p2p_execute_order', {
          p_order_id: orderId, p_executor_id: buyer.user_id, p_payment_method_id: null,
        });
        if (execErr || !(execResult as any)?.success) { metrics.orders_execute_failed++; continue; }
        metrics.orders_executed++;

        // STEP 3: Confirm Payment
        const { data: payResult, error: payErr } = await adminClient.rpc('p2p_confirm_payment', {
          p_order_id: orderId, p_user_id: buyer.user_id,
        });
        if (payErr || !(payResult as any)?.success) { metrics.payments_failed++; continue; }
        metrics.payments_confirmed++;

        // STEP 4: Release Escrow
        const { data: releaseResult, error: releaseErr } = await adminClient.rpc('p2p_release_escrow', {
          p_order_id: orderId, p_user_id: seller.user_id,
        });
        if (releaseErr || !(releaseResult as any)?.success) { metrics.escrows_failed++; continue; }
        metrics.escrows_released++;
        metrics.total_nova_traded += novaAmount;

        // STEP 5: Leave Rating
        const isPositive = Math.random() > 0.15;
        const ratingComments = isPositive
          ? ['[GHOST_ECONOMY] تعامل ممتاز 👍', '[GHOST_ECONOMY] بائع سريع وموثوق', '[GHOST_ECONOMY] شكراً، تجربة رائعة']
          : ['[GHOST_ECONOMY] تأخر في الرد', '[GHOST_ECONOMY] يحتاج تحسين'];
        const comment = ratingComments[Math.floor(Math.random() * ratingComments.length)];
        const { error: rateErr } = await adminClient.from('p2p_ratings').insert({
          order_id: orderId, rater_id: buyer.user_id, rated_id: seller.user_id,
          rating: isPositive ? 1 : -1, comment,
        });
        if (!rateErr) metrics.ratings_submitted++; else metrics.ratings_failed++;

        // Seller rates buyer (50%)
        if (Math.random() > 0.5) {
          const sellerPositive = Math.random() > 0.1;
          const { error: sr } = await adminClient.from('p2p_ratings').insert({
            order_id: orderId, rater_id: seller.user_id, rated_id: buyer.user_id,
            rating: sellerPositive ? 1 : -1,
            comment: sellerPositive ? '[GHOST_ECONOMY] مشتري ممتاز' : '[GHOST_ECONOMY] تأخر في الدفع',
          });
          if (!sr) metrics.ratings_submitted++; else metrics.ratings_failed++;
        }
      }
      metrics.cycles_completed++;
    }

    // ═══════════════════════════════════════════
    // 4. SOCIAL GIFTING (Tips / Transfers)
    // ═══════════════════════════════════════════
    if (enableTips) {
      const tipAgents = pick(ghosts, Math.min(tipCount * 2, ghosts.length));
      for (let t = 0; t < Math.min(Math.floor(tipAgents.length / 2), tipCount); t++) {
        const sender = tipAgents[t * 2];
        const receiver = tipAgents[t * 2 + 1];
        const tipAmount = Math.round((Math.random() * 2 + 0.5) * 100) / 100; // 0.5-2.5 Nova

        const tipReasons = [
          '[GHOST_ECONOMY] هدية صغيرة 🎁',
          '[GHOST_ECONOMY] مكافأة إحالة 🤝',
          '[GHOST_ECONOMY] شكراً على المساعدة ❤️',
          '[GHOST_ECONOMY] تيب للخدمة الممتازة ⭐',
        ];
        const reason = tipReasons[Math.floor(Math.random() * tipReasons.length)];

        const { data: txResult, error: txErr } = await adminClient.rpc('execute_transfer', {
          p_sender_id: sender.user_id,
          p_receiver_id: receiver.user_id,
          p_amount: tipAmount,
          p_note: reason,
        });

        if (txErr || !(txResult as any)?.success) {
          metrics.tips_failed++;
          if (txErr) metrics.errors.push(`Tip: ${sender.username}→${receiver.username}: ${txErr.message}`);
        } else {
          metrics.tips_sent++;
          metrics.tips_nova_total += tipAmount;
        }
      }
    }

    // ═══════════════════════════════════════════
    // 5. THE HUNGER SCRIPT (Contest attempts)
    // ═══════════════════════════════════════════
    if (enableHunger) {
      // Find today's active contest
      const today = new Date().toISOString().split('T')[0];
      const { data: contest } = await adminClient
        .from('contests').select('id, entry_fee')
        .eq('contest_date', today).order('created_at', { ascending: false }).limit(1).single();

      if (contest) {
        const hungerAgents = pick(ghosts, 30);
        for (const agent of hungerAgents) {
          metrics.contest_attempts++;
          const { data: wallet } = await adminClient
            .from('wallets').select('nova_balance, aura_balance').eq('user_id', agent.user_id).single();

          const novaBalance = Number(wallet?.nova_balance || 0);
          const auraBalance = Number(wallet?.aura_balance || 0);
          const entryFee = Number(contest.entry_fee || 10);

          // Can they afford it? (Aura pays at 2:1 ratio)
          const canAfford = (auraBalance / 2) + novaBalance >= entryFee;

          if (!canAfford) {
            metrics.contest_insufficient++;
            // HUNGER: Force a quick trade to get funds
            // Find an agent with balance to sell to them
            const donor = ghosts.find(g => g.user_id !== agent.user_id);
            if (donor) {
              metrics.hunger_trades_triggered++;
              const needed = Math.ceil(entryFee - novaBalance);
              // Seed donor if needed
              await adminClient.rpc('admin_adjust_balance', {
                p_user_id: donor.user_id, p_currency: 'nova',
                p_amount: needed + 2, p_reason: '[GHOST_ECONOMY] Hunger seed',
                p_admin_id: donor.user_id,
              });
              // Quick transfer to hungry agent
              const { data: hungerTx, error: hungerErr } = await adminClient.rpc('execute_transfer', {
                p_sender_id: donor.user_id, p_receiver_id: agent.user_id,
                p_amount: needed, p_note: '[GHOST_ECONOMY] إعانة للمسابقة 🍞',
              });
              if (!hungerErr && (hungerTx as any)?.success) {
                metrics.tips_sent++;
                metrics.tips_nova_total += needed;
              }
            }
          }

          // Now try to join contest
          const { data: joinResult, error: joinErr } = await adminClient.rpc('join_contest', {
            p_contest_id: contest.id, p_user_id: agent.user_id,
          });
          if (!joinErr && (joinResult as any)?.success) {
            metrics.contest_joined++;
          } else {
            // Expected for some - log but don't count as error
            if (joinErr?.message?.includes('already joined') || (joinResult as any)?.error?.includes('already')) {
              // Skip, already entered
            } else if (joinErr) {
              metrics.errors.push(`Contest: ${agent.username}: ${joinErr.message}`);
            }
          }
        }
      }
    }

    // 6. Log incidents for visibility
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

    // 7. Log success proposal
    await adminClient.from('ai_proposals').insert({
      title: `[ECONOMY] ${metrics.escrows_released} trades, ${metrics.tips_sent} tips, ${metrics.contest_joined} contests | ${metrics.total_nova_traded + metrics.tips_nova_total}И moved`,
      title_ar: `[ECONOMY] ${metrics.escrows_released} صفقة، ${metrics.tips_sent} إكرامية، ${metrics.contest_joined} مسابقة | ${metrics.total_nova_traded + metrics.tips_nova_total}И`,
      description: [
        '── AUTONOMOUS ECONOMY REPORT ──',
        '',
        '🏙️ P2P TRADING',
        `  Sell orders: ${metrics.sell_orders_created} created (${metrics.sell_orders_failed} failed)`,
        `  Matched: ${metrics.orders_executed} (${metrics.orders_execute_failed} failed)`,
        `  Payments: ${metrics.payments_confirmed} confirmed (${metrics.payments_failed} failed)`,
        `  Escrows: ${metrics.escrows_released} released (${metrics.escrows_failed} failed)`,
        `  Ratings: ${metrics.ratings_submitted} (${metrics.ratings_failed} failed)`,
        `  Nova traded: ${metrics.total_nova_traded}И`,
        '',
        '🎁 SOCIAL GIFTING',
        `  Tips sent: ${metrics.tips_sent} (${metrics.tips_failed} failed)`,
        `  Nova tipped: ${metrics.tips_nova_total.toFixed(2)}И`,
        '',
        '🍞 HUNGER SCRIPT',
        `  Contest attempts: ${metrics.contest_attempts}`,
        `  Joined: ${metrics.contest_joined}`,
        `  Insufficient balance: ${metrics.contest_insufficient}`,
        `  Hunger trades triggered: ${metrics.hunger_trades_triggered}`,
        '',
        metrics.errors.length > 0 ? `── ERRORS (${metrics.errors.length}) ──\n${metrics.errors.slice(0, 10).join('\n')}` : '✅ No errors',
      ].join('\n'),
      description_ar: `سوق ذاتي: ${metrics.escrows_released} صفقة، ${metrics.tips_sent} إكرامية، ${metrics.contest_joined} مسابقة`,
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
      summary: { duration_ms: duration, ...metrics },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

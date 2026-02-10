import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChaosResult {
  attack: string;
  category: string;
  blocked: boolean;
  detail: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  defense_mechanism: string;
}

function pick<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

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

    const startTime = Date.now();
    const results: ChaosResult[] = [];
    const anonClient = createClient(supabaseUrl, anonKey);

    // Get ghost agents
    const { data: ghosts } = await adminClient
      .from('profiles').select('id, user_id, username, referral_code, referred_by')
      .like('username', 'ghost_agent_%').limit(200);

    if (!ghosts || ghosts.length < 6) {
      return new Response(JSON.stringify({ error: 'Need at least 6 ghost agents' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const agents = pick(ghosts, 20);

    // ═══════════════════════════════════════════════
    // ATTACK 1: Overdraft — Transfer more Nova than balance
    // ═══════════════════════════════════════════════
    {
      const attacker = agents[0];
      const victim = agents[1];
      const { data: wallet } = await adminClient
        .from('wallets').select('nova_balance').eq('user_id', attacker.user_id).single();
      const currentBalance = Number(wallet?.nova_balance || 0);
      const overdraftAmount = currentBalance + 99999;

      const { data: result, error } = await adminClient.rpc('execute_transfer', {
        p_sender_id: attacker.user_id,
        p_recipient_id: victim.user_id,
        p_amount: overdraftAmount,
        p_description: '[GHOST_CHAOS] Overdraft attack',
      });

      const r = (result as any);
      const blocked = !!error || r?.success === false;
      results.push({
        attack: 'Overdraft Transfer',
        category: 'Financial',
        blocked,
        detail: blocked
          ? `Blocked: ${error?.message || r?.error || 'insufficient funds'}`
          : `CRITICAL: ${overdraftAmount}И transferred from ${currentBalance}И balance`,
        severity: blocked ? 'low' : 'critical',
        defense_mechanism: blocked ? 'Balance CHECK constraint + RPC validation' : 'NONE',
      });
    }

    // ═══════════════════════════════════════════════
    // ATTACK 2: Negative balance injection via direct update
    // ═══════════════════════════════════════════════
    {
      const target = agents[2];
      const { data: walletBefore } = await adminClient
        .from('wallets').select('nova_balance').eq('user_id', target.user_id).single();
      
      const { error } = await adminClient
        .from('wallets').update({ nova_balance: -50000 }).eq('user_id', target.user_id);

      if (!error) {
        // Rollback immediately
        await adminClient.from('wallets').update({ nova_balance: walletBefore?.nova_balance || 0 }).eq('user_id', target.user_id);
      }

      results.push({
        attack: 'Negative Balance Injection',
        category: 'Financial',
        blocked: !!error,
        detail: error ? `Blocked: ${error.message}` : 'CRITICAL: Negative balance accepted, rolled back',
        severity: error ? 'low' : 'critical',
        defense_mechanism: error ? 'CHECK (nova_balance >= 0)' : 'NONE',
      });
    }

    // ═══════════════════════════════════════════════
    // ATTACK 3: Zero-amount P2P sell order
    // ═══════════════════════════════════════════════
    {
      const attacker = agents[3];
      const { data: result, error } = await adminClient.rpc('p2p_create_sell_order', {
        p_creator_id: attacker.user_id,
        p_nova_amount: 0,
        p_local_amount: 0,
        p_exchange_rate: 1,
        p_country: 'SA',
        p_time_limit_minutes: 15,
        p_payment_method_id: null,
      });

      const r = (result as any);
      const blocked = !!error || r?.success === false;
      results.push({
        attack: 'Zero-Amount P2P Order',
        category: 'P2P',
        blocked,
        detail: blocked ? `Blocked: ${error?.message || r?.error}` : 'CRITICAL: Zero-amount order created',
        severity: blocked ? 'low' : 'high',
        defense_mechanism: blocked ? 'RPC amount validation' : 'NONE',
      });

      // Cleanup if created
      if (!blocked && r?.order_id) {
        await adminClient.rpc('p2p_delete_order', { p_order_id: r.order_id, p_user_id: attacker.user_id });
      }
    }

    // ═══════════════════════════════════════════════
    // ATTACK 4: Negative-amount P2P sell order
    // ═══════════════════════════════════════════════
    {
      const attacker = agents[4];
      const { data: result, error } = await adminClient.rpc('p2p_create_sell_order', {
        p_creator_id: attacker.user_id,
        p_nova_amount: -100,
        p_local_amount: -100,
        p_exchange_rate: 1,
        p_country: 'SA',
        p_time_limit_minutes: 15,
        p_payment_method_id: null,
      });

      const r = (result as any);
      const blocked = !!error || r?.success === false;
      results.push({
        attack: 'Negative-Amount P2P Order',
        category: 'P2P',
        blocked,
        detail: blocked ? `Blocked: ${error?.message || r?.error}` : 'CRITICAL: Negative order created',
        severity: blocked ? 'low' : 'critical',
        defense_mechanism: blocked ? 'RPC amount validation' : 'NONE',
      });

      if (!blocked && r?.order_id) {
        await adminClient.rpc('p2p_delete_order', { p_order_id: r.order_id, p_user_id: attacker.user_id });
      }
    }

    // ═══════════════════════════════════════════════
    // ATTACK 5: Self-trade — creator executes own order
    // ═══════════════════════════════════════════════
    {
      const attacker = agents[5];
      // Seed small balance
      await adminClient.rpc('admin_adjust_balance', {
        p_user_id: attacker.user_id, p_currency: 'nova', p_amount: 5,
        p_reason: '[GHOST_CHAOS] Seed for self-trade test', p_admin_id: attacker.user_id,
      });

      const { data: sellResult } = await adminClient.rpc('p2p_create_sell_order', {
        p_creator_id: attacker.user_id, p_nova_amount: 1, p_local_amount: 1,
        p_exchange_rate: 1, p_country: 'SA', p_time_limit_minutes: 15, p_payment_method_id: null,
      });

      const sr = sellResult as any;
      if (sr?.success && sr?.order_id) {
        const { data: execResult, error: execErr } = await adminClient.rpc('p2p_execute_order', {
          p_order_id: sr.order_id, p_executor_id: attacker.user_id, p_payment_method_id: null,
        });
        const er = execResult as any;
        const blocked = !!execErr || er?.success === false;
        results.push({
          attack: 'Self-Trade (Buy Own Order)',
          category: 'P2P',
          blocked,
          detail: blocked ? `Blocked: ${execErr?.message || er?.error}` : 'CRITICAL: User traded with themselves',
          severity: blocked ? 'low' : 'critical',
          defense_mechanism: blocked ? 'RPC creator != executor check' : 'NONE',
        });
        // Cleanup
        await adminClient.rpc('p2p_delete_order', { p_order_id: sr.order_id, p_user_id: attacker.user_id });
      }
    }

    // ═══════════════════════════════════════════════
    // ATTACK 6: Release escrow on unmatched order
    // ═══════════════════════════════════════════════
    {
      const attacker = agents[6];
      await adminClient.rpc('admin_adjust_balance', {
        p_user_id: attacker.user_id, p_currency: 'nova', p_amount: 3,
        p_reason: '[GHOST_CHAOS] Seed for premature release', p_admin_id: attacker.user_id,
      });

      const { data: sellResult } = await adminClient.rpc('p2p_create_sell_order', {
        p_creator_id: attacker.user_id, p_nova_amount: 1, p_local_amount: 1,
        p_exchange_rate: 1, p_country: 'SA', p_time_limit_minutes: 15, p_payment_method_id: null,
      });

      const sr = sellResult as any;
      if (sr?.success && sr?.order_id) {
        // Try releasing before anyone matched
        const { data: releaseResult, error: releaseErr } = await adminClient.rpc('p2p_release_escrow', {
          p_order_id: sr.order_id, p_user_id: attacker.user_id,
        });
        const rr = releaseResult as any;
        const blocked = !!releaseErr || rr?.success === false;
        results.push({
          attack: 'Premature Escrow Release (No Match)',
          category: 'P2P',
          blocked,
          detail: blocked ? `Blocked: ${releaseErr?.message || rr?.error}` : 'CRITICAL: Escrow released on open order',
          severity: blocked ? 'low' : 'critical',
          defense_mechanism: blocked ? 'RPC status check (requires payment_sent)' : 'NONE',
        });
        await adminClient.rpc('p2p_delete_order', { p_order_id: sr.order_id, p_user_id: attacker.user_id });
      }
    }

    // ═══════════════════════════════════════════════
    // ATTACK 7: Rating without completed trade
    // ═══════════════════════════════════════════════
    {
      const rater = agents[7];
      const rated = agents[8];
      // Use a fake order_id
      const fakeOrderId = '00000000-0000-0000-0000-000000000001';

      const { error: rateErr } = await adminClient.rpc('p2p_submit_rating', {
        p_order_id: fakeOrderId,
        p_rated_id: rated.user_id,
        p_rating: 1,
        p_comment: '[GHOST_CHAOS] Fake rating on nonexistent order',
      });

      // Also try direct insert
      const { error: directRateErr } = await adminClient.from('p2p_ratings').insert({
        order_id: fakeOrderId,
        rater_id: rater.user_id,
        rated_id: rated.user_id,
        rating: 1,
        comment: '[GHOST_CHAOS] Direct insert fake rating',
      });

      const rpcBlocked = !!rateErr;
      const directBlocked = !!directRateErr;
      results.push({
        attack: 'Rating Without Trade (RPC)',
        category: 'Reputation',
        blocked: rpcBlocked,
        detail: rpcBlocked ? `Blocked: ${rateErr.message}` : 'CRITICAL: Rating accepted for nonexistent order',
        severity: rpcBlocked ? 'low' : 'high',
        defense_mechanism: rpcBlocked ? 'RPC order existence/status validation' : 'NONE',
      });
      results.push({
        attack: 'Rating Without Trade (Direct Insert)',
        category: 'Reputation',
        blocked: directBlocked,
        detail: directBlocked ? `Blocked: ${directRateErr.message}` : 'WARNING: Direct rating insert succeeded (cleanup needed)',
        severity: directBlocked ? 'low' : 'high',
        defense_mechanism: directBlocked ? 'FK constraint on order_id' : 'NONE',
      });

      // Cleanup if direct succeeded
      if (!directBlocked) {
        await adminClient.from('p2p_ratings').delete()
          .eq('rater_id', rater.user_id).eq('order_id', fakeOrderId);
      }
    }

    // ═══════════════════════════════════════════════
    // ATTACK 8: Self-referral
    // ═══════════════════════════════════════════════
    {
      const attacker = agents[9];
      const originalRef = attacker.referred_by;
      
      const { error } = await adminClient.from('profiles')
        .update({ referred_by: attacker.referral_code })
        .eq('user_id', attacker.user_id);

      const { data: check } = await adminClient.from('profiles')
        .select('referred_by, referral_code').eq('user_id', attacker.user_id).single();
      
      const selfRefAccepted = !error && check?.referred_by === check?.referral_code;
      
      // Rollback
      await adminClient.from('profiles')
        .update({ referred_by: originalRef || null })
        .eq('user_id', attacker.user_id);

      results.push({
        attack: 'Self-Referral',
        category: 'Referral',
        blocked: !selfRefAccepted,
        detail: selfRefAccepted ? 'CRITICAL: User referred themselves' : 'Blocked: Self-referral prevented',
        severity: selfRefAccepted ? 'high' : 'low',
        defense_mechanism: selfRefAccepted ? 'NONE' : 'CHECK or trigger (referred_by != referral_code)',
      });
    }

    // ═══════════════════════════════════════════════
    // ATTACK 9: Circular referral (A refers B, B refers A)
    // ═══════════════════════════════════════════════
    {
      const agentA = agents[10];
      const agentB = agents[11];
      const origA = agentA.referred_by;
      const origB = agentB.referred_by;

      // Set A->B
      await adminClient.from('profiles')
        .update({ referred_by: agentB.referral_code })
        .eq('user_id', agentA.user_id);
      // Set B->A
      const { error: circErr } = await adminClient.from('profiles')
        .update({ referred_by: agentA.referral_code })
        .eq('user_id', agentB.user_id);

      const { data: checkA } = await adminClient.from('profiles')
        .select('referred_by').eq('user_id', agentA.user_id).single();
      const { data: checkB } = await adminClient.from('profiles')
        .select('referred_by').eq('user_id', agentB.user_id).single();

      const circularExists = checkA?.referred_by === agentB.referral_code && checkB?.referred_by === agentA.referral_code;

      // Rollback
      await adminClient.from('profiles').update({ referred_by: origA || null }).eq('user_id', agentA.user_id);
      await adminClient.from('profiles').update({ referred_by: origB || null }).eq('user_id', agentB.user_id);

      results.push({
        attack: 'Circular Referral Chain (A↔B)',
        category: 'Referral',
        blocked: !circularExists,
        detail: circularExists ? 'WARNING: Circular referral loop allowed' : 'Blocked: Circular referral prevented',
        severity: circularExists ? 'high' : 'low',
        defense_mechanism: circularExists ? 'NONE — needs trigger' : 'Trigger/constraint on referral chain',
      });
    }

    // ═══════════════════════════════════════════════
    // ATTACK 10: Cross-user wallet read (anon client)
    // ═══════════════════════════════════════════════
    {
      const target = agents[12];
      const { data: walletData } = await anonClient
        .from('wallets').select('nova_balance, aura_balance').eq('user_id', target.user_id).maybeSingle();

      results.push({
        attack: 'Unauthenticated Wallet Read',
        category: 'RLS',
        blocked: !walletData,
        detail: walletData ? `CRITICAL: Read balance of ${target.username}` : 'Blocked: RLS denied anonymous access',
        severity: walletData ? 'critical' : 'low',
        defense_mechanism: walletData ? 'NONE' : 'RLS SELECT policy on wallets',
      });
    }

    // ═══════════════════════════════════════════════
    // ATTACK 11: Cross-user wallet update (anon client)
    // ═══════════════════════════════════════════════
    {
      const target = agents[13];
      const { error: updateErr, count } = await anonClient
        .from('wallets').update({ nova_balance: 999999 }).eq('user_id', target.user_id);

      const blocked = !!updateErr || count === 0;
      results.push({
        attack: 'Unauthenticated Wallet Update',
        category: 'RLS',
        blocked,
        detail: blocked ? `Blocked: ${updateErr?.message || 'zero rows affected'}` : 'CRITICAL: Anonymous user modified wallet',
        severity: blocked ? 'low' : 'critical',
        defense_mechanism: blocked ? 'RLS UPDATE policy + guard_wallet_direct_mutation trigger' : 'NONE',
      });
    }

    // ═══════════════════════════════════════════════
    // ATTACK 12: Double confirm payment
    // ═══════════════════════════════════════════════
    {
      const seller = agents[14];
      const buyer = agents[15];

      await adminClient.rpc('admin_adjust_balance', {
        p_user_id: seller.user_id, p_currency: 'nova', p_amount: 5,
        p_reason: '[GHOST_CHAOS] Seed for double-confirm', p_admin_id: seller.user_id,
      });

      const { data: sellR } = await adminClient.rpc('p2p_create_sell_order', {
        p_creator_id: seller.user_id, p_nova_amount: 1, p_local_amount: 1,
        p_exchange_rate: 1, p_country: 'SA', p_time_limit_minutes: 30, p_payment_method_id: null,
      });

      const sr = sellR as any;
      if (sr?.success && sr?.order_id) {
        await adminClient.rpc('p2p_execute_order', {
          p_order_id: sr.order_id, p_executor_id: buyer.user_id, p_payment_method_id: null,
        });
        // First confirm
        await adminClient.rpc('p2p_confirm_payment', {
          p_order_id: sr.order_id, p_user_id: buyer.user_id,
        });
        // Release
        await adminClient.rpc('p2p_release_escrow', {
          p_order_id: sr.order_id, p_user_id: seller.user_id,
        });
        // ATTACK: Try releasing again (double-spend)
        const { data: doubleRelease, error: doubleErr } = await adminClient.rpc('p2p_release_escrow', {
          p_order_id: sr.order_id, p_user_id: seller.user_id,
        });
        const dr = doubleRelease as any;
        const blocked = !!doubleErr || dr?.success === false;
        results.push({
          attack: 'Double Escrow Release (Double-Spend)',
          category: 'Financial',
          blocked,
          detail: blocked ? `Blocked: ${doubleErr?.message || dr?.error}` : 'CRITICAL: Escrow released twice',
          severity: blocked ? 'low' : 'critical',
          defense_mechanism: blocked ? 'RPC status check (order already completed)' : 'NONE',
        });
      }
    }

    // ═══════════════════════════════════════════════
    // ATTACK 13: Transfer to self
    // ═══════════════════════════════════════════════
    {
      const attacker = agents[16];
      await adminClient.rpc('admin_adjust_balance', {
        p_user_id: attacker.user_id, p_currency: 'nova', p_amount: 5,
        p_reason: '[GHOST_CHAOS] Seed for self-transfer', p_admin_id: attacker.user_id,
      });

      const { data: result, error } = await adminClient.rpc('execute_transfer', {
        p_sender_id: attacker.user_id,
        p_recipient_id: attacker.user_id,
        p_amount: 1,
        p_description: '[GHOST_CHAOS] Self transfer attempt',
      });
      const r = result as any;
      const blocked = !!error || r?.success === false;
      results.push({
        attack: 'Self-Transfer',
        category: 'Financial',
        blocked,
        detail: blocked ? `Blocked: ${error?.message || r?.error}` : 'WARNING: Self-transfer succeeded (no financial harm but suspicious)',
        severity: blocked ? 'low' : 'medium',
        defense_mechanism: blocked ? 'RPC sender != recipient check' : 'NONE',
      });
    }

    // ═══════════════════════════════════════════════
    // ATTACK 14: Frozen wallet operation
    // ═══════════════════════════════════════════════
    {
      const target = agents[17];
      const recipient = agents[18];
      // Freeze wallet temporarily
      await adminClient.from('wallets').update({ is_frozen: true }).eq('user_id', target.user_id);
      await adminClient.rpc('admin_adjust_balance', {
        p_user_id: target.user_id, p_currency: 'nova', p_amount: 5,
        p_reason: '[GHOST_CHAOS] Seed for frozen test', p_admin_id: target.user_id,
      });

      const { data: result, error } = await adminClient.rpc('execute_transfer', {
        p_sender_id: target.user_id,
        p_recipient_id: recipient.user_id,
        p_amount: 1,
        p_description: '[GHOST_CHAOS] Transfer from frozen wallet',
      });
      const r = result as any;
      const blocked = !!error || r?.success === false;

      // Unfreeze
      await adminClient.from('wallets').update({ is_frozen: false }).eq('user_id', target.user_id);

      results.push({
        attack: 'Transfer From Frozen Wallet',
        category: 'Financial',
        blocked,
        detail: blocked ? `Blocked: ${error?.message || r?.error}` : 'CRITICAL: Transfer from frozen wallet succeeded',
        severity: blocked ? 'low' : 'critical',
        defense_mechanism: blocked ? 'RPC frozen wallet check' : 'NONE',
      });
    }

    // ═══════════════════════════════════════════════
    // ATTACK 15: Direct wallet_ledger injection
    // ═══════════════════════════════════════════════
    {
      const attacker = agents[19];
      const { error: ledgerErr } = await anonClient.from('wallet_ledger').insert({
        user_id: attacker.user_id,
        entry_type: 'admin_credit',
        currency: 'nova',
        amount: 999999,
        balance_before: 0,
        balance_after: 999999,
        description: '[GHOST_CHAOS] Fake ledger entry',
      });

      results.push({
        attack: 'Direct Ledger Injection (Anon)',
        category: 'RLS',
        blocked: !!ledgerErr,
        detail: ledgerErr ? `Blocked: ${ledgerErr.message}` : 'CRITICAL: Anonymous ledger entry created',
        severity: ledgerErr ? 'low' : 'critical',
        defense_mechanism: ledgerErr ? 'RLS INSERT policy on wallet_ledger' : 'NONE',
      });

      // Cleanup if succeeded
      if (!ledgerErr) {
        await adminClient.from('wallet_ledger').delete()
          .eq('user_id', attacker.user_id).like('description', '%GHOST_CHAOS%');
      }
    }

    // ═══════════════════════════════════════════════
    // EXECUTIVE REPORT
    // ═══════════════════════════════════════════════
    const duration = Date.now() - startTime;
    const defenses = results.filter(r => r.blocked);
    const breaches = results.filter(r => !r.blocked);
    const criticalBreaches = breaches.filter(r => r.severity === 'critical');

    // Log to system_incidents
    const incidents = results.map(r => ({
      actor_username: 'ghost_chaos',
      is_ghost: true,
      screen: 'commander/ghost-army',
      feature: 'Controlled_Chaos',
      action_type: r.blocked ? 'defense_success' : 'security_breach',
      error_message: r.detail,
      error_code: r.blocked ? 'DEFENDED' : 'BREACHED',
      severity: r.severity,
      category: r.category,
      endpoint: 'ghost-army-chaos',
      flow: `Chaos: ${r.attack}`,
      root_cause: r.defense_mechanism,
      metadata: { attack: r.attack, blocked: r.blocked },
    }));

    await adminClient.from('system_incidents').insert(incidents);

    // Proposal
    const healthEmoji = criticalBreaches.length > 0 ? '🔴' : breaches.length > 0 ? '🟡' : '🟢';
    await adminClient.from('ai_proposals').insert({
      title: `${healthEmoji} [CHAOS] Immune system: ${defenses.length}/${results.length} attacks blocked`,
      title_ar: `${healthEmoji} [CHAOS] الجهاز المناعي: ${defenses.length}/${results.length} هجمات تم صدها`,
      description: [
        '── CONTROLLED CHAOS REPORT ──',
        `Total attacks: ${results.length}`,
        `✅ Successful defenses: ${defenses.length}`,
        `❌ Breaches: ${breaches.length} (${criticalBreaches.length} critical)`,
        `Duration: ${duration}ms`,
        '',
        '── DEFENSE LOG ──',
        ...defenses.map(d => `✅ ${d.attack}: ${d.defense_mechanism}`),
        '',
        breaches.length > 0 ? '── BREACH LOG ──' : '',
        ...breaches.map(b => `❌ ${b.attack} [${b.severity}]: ${b.detail}`),
      ].join('\n'),
      description_ar: `فحص الفوضى: ${defenses.length} صد ناجح، ${breaches.length} اختراق.`,
      proposal_type: 'system_diagnostic',
      priority: criticalBreaches.length > 0 ? 'critical' : breaches.length > 0 ? 'high' : 'low',
      affected_area: 'infrastructure',
      status: 'pending',
      risk_level: criticalBreaches.length > 0 ? 'critical' : breaches.length > 0 ? 'high' : 'low',
      impact_scope: 'platform_wide',
    });

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_attacks: results.length,
        defenses: defenses.length,
        breaches: breaches.length,
        critical_breaches: criticalBreaches.length,
        duration_ms: duration,
        immune_score: Math.round((defenses.length / results.length) * 100),
      },
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

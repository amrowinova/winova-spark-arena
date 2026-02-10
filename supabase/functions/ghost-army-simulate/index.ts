import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  test: string;
  category: string;
  status: 'pass' | 'fail' | 'warning';
  detail: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  latency_ms?: number;
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

    const { data: ghosts } = await adminClient
      .from('profiles').select('id, user_id, username, name, referral_code, referred_by')
      .like('username', 'ghost_agent_%').limit(200);

    if (!ghosts || ghosts.length === 0) {
      return new Response(JSON.stringify({ error: 'No ghost agents found. Run provisioning first.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: TestResult[] = [];
    const startTime = Date.now();
    const anonClient = createClient(supabaseUrl, anonKey);

    // ═══════════════════════════════════════════
    // SUITE 1: RLS Security
    // ═══════════════════════════════════════════
    if (ghosts.length >= 2) {
      const ghostB = ghosts[1];
      const { data: otherWallet } = await anonClient
        .from('wallets').select('*').eq('user_id', ghostB.user_id).maybeSingle();

      results.push({
        test: 'Cross-user wallet access',
        category: 'RLS_Security',
        status: otherWallet ? 'fail' : 'pass',
        detail: otherWallet
          ? `Unauthenticated client read wallet of ${ghostB.username}. RLS misconfigured.`
          : 'Anon client blocked from individual wallet data.',
        severity: otherWallet ? 'critical' : 'low',
      });

      const { data: publicProfile } = await anonClient
        .from('profiles').select('name, username').eq('user_id', ghosts[0].user_id).maybeSingle();

      results.push({
        test: 'Profile public visibility',
        category: 'RLS_Security',
        status: publicProfile ? 'pass' : 'warning',
        detail: publicProfile ? 'Profiles publicly readable.' : 'Profile access blocked.',
        severity: 'low',
      });
    }

    // ═══════════════════════════════════════════
    // SUITE 2: Wallet Integrity
    // ═══════════════════════════════════════════
    for (const ghost of ghosts.slice(0, 10)) {
      const { data: wallet } = await adminClient
        .from('wallets').select('*').eq('user_id', ghost.user_id).maybeSingle();

      if (!wallet) {
        results.push({ test: `Wallet existence: ${ghost.username}`, category: 'Data_Integrity', status: 'fail', detail: `No wallet for ${ghost.username}`, severity: 'high' });
      } else if (wallet.nova_balance < 0 || wallet.aura_balance < 0) {
        results.push({ test: `Negative balance: ${ghost.username}`, category: 'Data_Integrity', status: 'fail', detail: `Negative: Nova=${wallet.nova_balance}, Aura=${wallet.aura_balance}`, severity: 'critical' });
      }
    }

    // Overdraft test
    const { data: ogWallet } = await adminClient
      .from('wallets').select('nova_balance').eq('user_id', ghosts[0].user_id).single();

    if (ogWallet) {
      const { error: overdraftError } = await adminClient
        .from('wallets').update({ nova_balance: -(ogWallet.nova_balance + 9999) }).eq('user_id', ghosts[0].user_id);

      await adminClient.from('wallets').update({ nova_balance: ogWallet.nova_balance }).eq('user_id', ghosts[0].user_id);

      results.push({
        test: 'Overdraft protection',
        category: 'Financial_Safety',
        status: overdraftError ? 'pass' : 'fail',
        detail: overdraftError ? 'DB rejected negative balance.' : 'WARNING: Negative balance accepted. No DB constraint.',
        severity: overdraftError ? 'low' : 'critical',
      });
    }

    // ═══════════════════════════════════════════
    // SUITE 3: Referral Tree Integrity
    // ═══════════════════════════════════════════
    const { data: teamLinks } = await adminClient
      .from('team_members').select('leader_id, member_id, level')
      .in('member_id', ghosts.map(g => g.user_id));

    const ghostsWithReferral = ghosts.filter(g => g.referred_by);
    results.push({
      test: 'Referral coverage',
      category: 'Referral_Integrity',
      status: ghostsWithReferral.length > ghosts.length * 0.5 ? 'pass' : 'warning',
      detail: `${ghostsWithReferral.length}/${ghosts.length} ghosts have referral links.`,
      severity: 'medium',
    });

    // Check for circular referrals
    if (teamLinks) {
      const circularPairs = new Set<string>();
      for (const link of teamLinks) {
        const reverse = teamLinks.find(
          t => t.leader_id === link.member_id && t.member_id === link.leader_id && t.level === 1
        );
        if (reverse) circularPairs.add(`${link.leader_id}<->${link.member_id}`);
      }

      results.push({
        test: 'Circular referral detection',
        category: 'Referral_Integrity',
        status: circularPairs.size === 0 ? 'pass' : 'fail',
        detail: circularPairs.size === 0
          ? 'No circular referrals detected.'
          : `${circularPairs.size} circular referral pairs found!`,
        severity: circularPairs.size === 0 ? 'low' : 'critical',
      });

      // Level consistency
      const maxLevel = Math.max(...teamLinks.map(t => t.level), 0);
      results.push({
        test: 'Team hierarchy depth',
        category: 'Referral_Integrity',
        status: maxLevel <= 10 ? 'pass' : 'warning',
        detail: `Max hierarchy depth: ${maxLevel} levels. Links: ${teamLinks.length}.`,
        severity: 'low',
      });
    }

    // Duplicate registration test
    const usernames = ghosts.map(g => g.username);
    const uniqueUsernames = new Set(usernames);
    results.push({
      test: 'Username uniqueness',
      category: 'Data_Integrity',
      status: usernames.length === uniqueUsernames.size ? 'pass' : 'fail',
      detail: `${usernames.length} total, ${uniqueUsernames.size} unique.`,
      severity: usernames.length === uniqueUsernames.size ? 'low' : 'high',
    });

    const refCodes = ghosts.map(g => g.referral_code).filter(Boolean);
    const uniqueRefs = new Set(refCodes);
    results.push({
      test: 'Referral code uniqueness',
      category: 'Data_Integrity',
      status: refCodes.length === uniqueRefs.size ? 'pass' : 'fail',
      detail: refCodes.length === uniqueRefs.size ? `All ${refCodes.length} unique.` : 'Duplicates found.',
      severity: refCodes.length === uniqueRefs.size ? 'low' : 'high',
    });

    // ═══════════════════════════════════════════
    // SUITE 4: Chat Stress Test
    // ═══════════════════════════════════════════
    const chatTestCount = Math.min(20, ghosts.length);
    let chatLatencies: number[] = [];
    let chatErrors = 0;

    for (let i = 0; i < chatTestCount; i++) {
      const sender = ghosts[i];
      const receiver = ghosts[(i + 1) % ghosts.length];
      const chatStart = Date.now();

      const { error: msgError } = await adminClient.from('direct_messages').insert({
        sender_id: sender.user_id,
        receiver_id: receiver.user_id,
        content: `[GHOST_TEST] Stress message #${i + 1} from ${sender.username} — ${Date.now()}`,
      });

      const latency = Date.now() - chatStart;
      chatLatencies.push(latency);

      if (msgError) chatErrors++;
    }

    const avgChatLatency = chatLatencies.length > 0
      ? Math.round(chatLatencies.reduce((a, b) => a + b, 0) / chatLatencies.length) : 0;
    const maxChatLatency = Math.max(...chatLatencies, 0);

    results.push({
      test: 'Chat message delivery',
      category: 'Chat_Stress',
      status: chatErrors > 0 ? 'fail' : 'pass',
      detail: `${chatTestCount - chatErrors}/${chatTestCount} delivered. Avg: ${avgChatLatency}ms, Max: ${maxChatLatency}ms.`,
      severity: chatErrors > 0 ? 'high' : 'low',
      latency_ms: avgChatLatency,
    });

    if (maxChatLatency > 2000) {
      results.push({
        test: 'Chat latency threshold',
        category: 'Chat_Stress',
        status: 'fail',
        detail: `Max chat latency ${maxChatLatency}ms exceeds 2000ms threshold.`,
        severity: 'high',
        latency_ms: maxChatLatency,
      });
    }

    // ═══════════════════════════════════════════
    // SUITE 5: Fraud Simulation (10 agents)
    // ═══════════════════════════════════════════
    const fraudAgents = ghosts.slice(0, 10);

    // Fraud 1: Double voting attempt
    const { data: activeContests } = await adminClient
      .from('contests').select('id, title').eq('status', 'active').limit(1);

    if (activeContests && activeContests.length > 0) {
      const contestId = activeContests[0].id;
      const voter = fraudAgents[0];
      const candidate = fraudAgents[1];

      // Join and vote
      await adminClient.from('contest_participants').upsert({
        contest_id: contestId, user_id: candidate.user_id, status: 'active',
      });

      const { error: vote1Err } = await adminClient.from('contest_votes').insert({
        contest_id: contestId, voter_id: voter.user_id, contestant_id: candidate.user_id, vote_type: 'free',
      });

      const { error: vote2Err } = await adminClient.from('contest_votes').insert({
        contest_id: contestId, voter_id: voter.user_id, contestant_id: candidate.user_id, vote_type: 'free',
      });

      results.push({
        test: 'Double vote prevention',
        category: 'Fraud_Simulation',
        status: vote2Err ? 'pass' : (vote1Err ? 'warning' : 'fail'),
        detail: vote2Err ? 'Double vote correctly rejected.' : vote1Err ? 'First vote failed.' : 'Double vote accepted! Constraint missing.',
        severity: vote2Err ? 'low' : 'critical',
      });

      // Cleanup
      await adminClient.from('contest_votes').delete().eq('voter_id', voter.user_id).eq('contest_id', contestId);
      await adminClient.from('contest_participants').delete().eq('user_id', candidate.user_id).eq('contest_id', contestId);
    } else {
      results.push({
        test: 'Contest availability for fraud test',
        category: 'Fraud_Simulation',
        status: 'warning',
        detail: 'No active contests to test double voting.',
        severity: 'low',
      });
    }

    // Fraud 2: Fake referral reward claim (self-referral)
    const selfRefAgent = fraudAgents[2];
    const { error: selfRefErr } = await adminClient.from('profiles')
      .update({ referred_by: selfRefAgent.referral_code })
      .eq('user_id', selfRefAgent.user_id);

    // Check if it went through
    const { data: selfRefCheck } = await adminClient.from('profiles')
      .select('referred_by, referral_code').eq('user_id', selfRefAgent.user_id).single();

    const selfRefPassed = selfRefCheck?.referred_by === selfRefCheck?.referral_code;
    results.push({
      test: 'Self-referral prevention',
      category: 'Fraud_Simulation',
      status: selfRefPassed ? 'fail' : 'pass',
      detail: selfRefPassed
        ? 'Self-referral accepted! No DB constraint preventing self-referral.'
        : 'Self-referral properly blocked or had no effect.',
      severity: selfRefPassed ? 'high' : 'low',
    });

    // Restore
    if (selfRefPassed) {
      await adminClient.from('profiles').update({ referred_by: null }).eq('user_id', selfRefAgent.user_id);
    }

    // Fraud 3: Spending non-existent funds via direct wallet update
    const brokeAgent = fraudAgents[3];
    const { data: brokeWallet } = await adminClient
      .from('wallets').select('nova_balance').eq('user_id', brokeAgent.user_id).single();

    if (brokeWallet) {
      // Try setting to huge negative
      const { error: fraudSpendErr } = await adminClient
        .from('wallets').update({ nova_balance: -50000 }).eq('user_id', brokeAgent.user_id);

      await adminClient.from('wallets').update({ nova_balance: brokeWallet.nova_balance }).eq('user_id', brokeAgent.user_id);

      results.push({
        test: 'Fraudulent balance manipulation',
        category: 'Fraud_Simulation',
        status: fraudSpendErr ? 'pass' : 'fail',
        detail: fraudSpendErr ? 'Balance manipulation rejected by DB.' : 'Wallet accepted negative balance! No constraint.',
        severity: fraudSpendErr ? 'low' : 'critical',
      });
    }

    // ═══════════════════════════════════════════
    // SUITE 6: Performance Benchmarks
    // ═══════════════════════════════════════════
    const perfTests = [
      { name: 'Profile query (500 rows)', fn: () => adminClient.from('profiles').select('id').limit(500) },
      { name: 'Wallet query (500 rows)', fn: () => adminClient.from('wallets').select('id, nova_balance').limit(500) },
      { name: 'Team members query', fn: () => adminClient.from('team_members').select('leader_id, member_id').limit(500) },
    ];

    for (const pt of perfTests) {
      const s = Date.now();
      await pt.fn();
      const ms = Date.now() - s;

      results.push({
        test: pt.name,
        category: 'Performance',
        status: ms > 3000 ? 'fail' : ms > 2000 ? 'warning' : 'pass',
        detail: `${ms}ms${ms > 2000 ? ' — exceeds 2s threshold' : ''}`,
        severity: ms > 3000 ? 'high' : 'low',
        latency_ms: ms,
      });
    }

    // ═══════════════════════════════════════════
    // RESULTS
    // ═══════════════════════════════════════════
    const totalDuration = Date.now() - startTime;
    const failures = results.filter(r => r.status === 'fail');
    const warnings = results.filter(r => r.status === 'warning');
    const criticals = failures.filter(r => r.severity === 'critical');

    const summary = {
      agents_tested: ghosts.length,
      total_tests: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: failures.length,
      warnings: warnings.length,
      critical_issues: criticals.length,
      duration_ms: totalDuration,
      avg_chat_latency_ms: avgChatLatency,
      referral_links_tested: teamLinks?.length || 0,
      fraud_tests_run: results.filter(r => r.category === 'Fraud_Simulation').length,
    };

    const proposalPriority = criticals.length > 0 ? 'critical' : failures.length > 0 ? 'high' : warnings.length > 0 ? 'medium' : 'low';
    const failureSummary = failures.map(f => `• [${f.category}] ${f.test}: ${f.detail}`).join('\n');

    await adminClient.from('ai_proposals').insert({
      title: `🌲 Digital Forest Report: ${ghosts.length} agents, ${failures.length} bugs, ${criticals.length} critical`,
      title_ar: `🌲 تقرير الغابة الرقمية: ${ghosts.length} عميل، ${failures.length} خطأ، ${criticals.length} حرج`,
      description: [
        `Digital Forest Stress Test completed in ${totalDuration}ms.`,
        `${ghosts.length} agents, ${results.length} tests (${summary.fraud_tests_run} fraud simulations).`,
        `Results: ${summary.passed} passed, ${failures.length} failed, ${warnings.length} warnings.`,
        `Chat avg latency: ${avgChatLatency}ms. Referral links: ${teamLinks?.length || 0}.`,
        failures.length > 0 ? `\nFAILURES:\n${failureSummary}` : '',
      ].filter(Boolean).join('\n'),
      description_ar: `اختبار الغابة الرقمية اكتمل. ${ghosts.length} عميل، ${results.length} اختبار. النتائج: ${summary.passed} نجح، ${failures.length} فشل.`,
      proposal_type: 'system_diagnostic',
      priority: proposalPriority,
      affected_area: 'infrastructure',
      status: 'pending',
      risk_level: proposalPriority === 'critical' ? 'critical' : proposalPriority === 'high' ? 'high' : 'medium',
      impact_scope: 'platform_wide',
    });

    // Cleanup ghost test messages
    await adminClient.from('direct_messages').delete().like('content', '%[GHOST_TEST]%');

    return new Response(JSON.stringify({ success: true, summary, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

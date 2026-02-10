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
  // Executive translation fields
  what_happened: string;
  why_it_matters: string;
  recommended_action: string;
}

/** Generate executive-grade test result with Problem → Impact → Action */
function execResult(
  base: Omit<TestResult, 'what_happened' | 'why_it_matters' | 'recommended_action'>,
  exec: { what: string; why: string; action: string }
): TestResult {
  return { ...base, what_happened: exec.what, why_it_matters: exec.why, recommended_action: exec.action };
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

      results.push(execResult({
        test: 'Cross-user wallet access',
        category: 'RLS_Security',
        status: otherWallet ? 'fail' : 'pass',
        detail: otherWallet
          ? `Unauthenticated client read wallet of ${ghostB.username}.`
          : 'Anon client blocked from individual wallet data.',
        severity: otherWallet ? 'critical' : 'low',
      }, {
        what: otherWallet ? 'An unauthenticated request successfully read another user\'s wallet data.' : 'Unauthenticated wallet access correctly blocked.',
        why: otherWallet ? 'Any external actor could view user balances, enabling targeted financial attacks.' : 'Financial data is properly isolated per user.',
        action: otherWallet ? 'Enforce RLS SELECT policy on wallets table requiring auth.uid() match.' : 'No action needed.',
      }));

      const { data: publicProfile } = await anonClient
        .from('profiles').select('name, username').eq('user_id', ghosts[0].user_id).maybeSingle();

      results.push(execResult({
        test: 'Profile public visibility',
        category: 'RLS_Security',
        status: publicProfile ? 'pass' : 'warning',
        detail: publicProfile ? 'Profiles publicly readable.' : 'Profile access blocked.',
        severity: 'low',
      }, {
        what: publicProfile ? 'Public profiles are accessible as expected.' : 'Profile data is not publicly accessible.',
        why: 'Public profiles are needed for social features like team hierarchy and leaderboards.',
        action: publicProfile ? 'No action needed.' : 'Review if profile SELECT policy is intentionally restrictive.',
      }));
    }

    // ═══════════════════════════════════════════
    // SUITE 2: Wallet Integrity & Overdraft Protection
    // ═══════════════════════════════════════════
    for (const ghost of ghosts.slice(0, 10)) {
      const { data: wallet } = await adminClient
        .from('wallets').select('*').eq('user_id', ghost.user_id).maybeSingle();

      if (!wallet) {
        results.push(execResult({
          test: `Wallet existence: ${ghost.username}`,
          category: 'Data_Integrity',
          status: 'fail',
          detail: `No wallet for ${ghost.username}`,
          severity: 'high',
        }, {
          what: `User ${ghost.username} has no wallet record.`,
          why: 'Users without wallets cannot participate in financial operations, breaking core functionality.',
          action: 'Investigate wallet provisioning trigger. Ensure signup flow creates wallets atomically.',
        }));
      } else if (Number(wallet.nova_balance) < 0 || Number(wallet.aura_balance) < 0) {
        results.push(execResult({
          test: `Negative balance: ${ghost.username}`,
          category: 'Data_Integrity',
          status: 'fail',
          detail: `Negative: Nova=${wallet.nova_balance}, Aura=${wallet.aura_balance}`,
          severity: 'critical',
        }, {
          what: `User ${ghost.username} has a negative balance (Nova: ${wallet.nova_balance}, Aura: ${wallet.aura_balance}).`,
          why: 'Negative balances indicate exploit potential — funds may have been extracted without proper validation.',
          action: 'Audit transaction history for this user. Enforce CHECK constraints on wallet balance columns.',
        }));
      }
    }

    // Overdraft test — attempt to set negative balance
    const { data: ogWallet } = await adminClient
      .from('wallets').select('nova_balance').eq('user_id', ghosts[0].user_id).single();

    if (ogWallet) {
      const { error: overdraftError } = await adminClient
        .from('wallets').update({ nova_balance: -(Number(ogWallet.nova_balance) + 9999) }).eq('user_id', ghosts[0].user_id);

      // Restore if it somehow went through
      if (!overdraftError) {
        await adminClient.from('wallets').update({ nova_balance: ogWallet.nova_balance }).eq('user_id', ghosts[0].user_id);
      }

      results.push(execResult({
        test: 'Overdraft protection',
        category: 'Financial_Safety',
        status: overdraftError ? 'pass' : 'fail',
        detail: overdraftError ? 'Database rejected negative balance.' : 'WARNING: Negative balance accepted.',
        severity: overdraftError ? 'low' : 'critical',
      }, {
        what: overdraftError
          ? 'Attempted overdraft was rejected by database CHECK constraint.'
          : 'Overdraft attempt succeeded — wallet accepted a negative balance.',
        why: overdraftError
          ? 'Financial integrity is protected at the database level.'
          : 'Without database-level protection, attackers could extract unlimited funds through race conditions or direct mutations.',
        action: overdraftError
          ? 'No action needed. Constraint is active.'
          : 'URGENT: Add CHECK (nova_balance >= 0) constraint to wallets table. Block all direct balance mutations.',
      }));
    }

    // ═══════════════════════════════════════════
    // SUITE 3: Referral Tree Integrity
    // ═══════════════════════════════════════════
    const { data: teamLinks } = await adminClient
      .from('team_members').select('leader_id, member_id, level')
      .in('member_id', ghosts.map(g => g.user_id));

    const ghostsWithReferral = ghosts.filter(g => g.referred_by);
    results.push(execResult({
      test: 'Referral coverage',
      category: 'Referral_Integrity',
      status: ghostsWithReferral.length > ghosts.length * 0.5 ? 'pass' : 'warning',
      detail: `${ghostsWithReferral.length}/${ghosts.length} ghosts have referral links.`,
      severity: 'medium',
    }, {
      what: `${ghostsWithReferral.length} of ${ghosts.length} test accounts are linked in the referral tree.`,
      why: 'Referral coverage below 50% indicates provisioning gaps that may mask hierarchy bugs.',
      action: ghostsWithReferral.length > ghosts.length * 0.5 ? 'No action needed.' : 'Re-run provisioning to establish full referral hierarchy.',
    }));

    // Circular referrals
    if (teamLinks) {
      const circularPairs = new Set<string>();
      for (const link of teamLinks) {
        const reverse = teamLinks.find(
          t => t.leader_id === link.member_id && t.member_id === link.leader_id && t.level === 1
        );
        if (reverse) circularPairs.add(`${link.leader_id}<->${link.member_id}`);
      }

      results.push(execResult({
        test: 'Circular referral detection',
        category: 'Referral_Integrity',
        status: circularPairs.size === 0 ? 'pass' : 'fail',
        detail: circularPairs.size === 0 ? 'No circular referrals detected.' : `${circularPairs.size} circular pairs found.`,
        severity: circularPairs.size === 0 ? 'low' : 'critical',
      }, {
        what: circularPairs.size === 0 ? 'Referral tree has no circular dependencies.' : `${circularPairs.size} circular referral loop(s) detected.`,
        why: circularPairs.size === 0 ? 'Tree integrity maintained.' : 'Circular referrals enable infinite commission cascading — a critical financial exploit.',
        action: circularPairs.size === 0 ? 'No action needed.' : 'Add database trigger to prevent A→B→A referral chains. Audit affected users.',
      }));

      const maxLevel = Math.max(...teamLinks.map(t => t.level), 0);
      results.push(execResult({
        test: 'Team hierarchy depth',
        category: 'Referral_Integrity',
        status: maxLevel <= 10 ? 'pass' : 'warning',
        detail: `Max depth: ${maxLevel} levels. Links: ${teamLinks.length}.`,
        severity: 'low',
      }, {
        what: `Referral hierarchy reaches ${maxLevel} levels deep with ${teamLinks.length} total links.`,
        why: 'Deep hierarchies may slow commission calculations and increase query latency.',
        action: maxLevel > 10 ? 'Consider capping hierarchy depth or optimizing commission queries.' : 'No action needed.',
      }));
    }

    // Uniqueness checks
    const usernames = ghosts.map(g => g.username);
    const uniqueUsernames = new Set(usernames);
    results.push(execResult({
      test: 'Username uniqueness',
      category: 'Data_Integrity',
      status: usernames.length === uniqueUsernames.size ? 'pass' : 'fail',
      detail: `${usernames.length} total, ${uniqueUsernames.size} unique.`,
      severity: usernames.length === uniqueUsernames.size ? 'low' : 'high',
    }, {
      what: usernames.length === uniqueUsernames.size ? 'All usernames are unique.' : 'Duplicate usernames detected.',
      why: 'Duplicate usernames break user identification and can enable impersonation attacks.',
      action: usernames.length === uniqueUsernames.size ? 'No action needed.' : 'Add UNIQUE constraint on profiles.username column.',
    }));

    const refCodes = ghosts.map(g => g.referral_code).filter(Boolean);
    const uniqueRefs = new Set(refCodes);
    results.push(execResult({
      test: 'Referral code uniqueness',
      category: 'Data_Integrity',
      status: refCodes.length === uniqueRefs.size ? 'pass' : 'fail',
      detail: refCodes.length === uniqueRefs.size ? `All ${refCodes.length} unique.` : 'Duplicates found.',
      severity: refCodes.length === uniqueRefs.size ? 'low' : 'high',
    }, {
      what: refCodes.length === uniqueRefs.size ? 'All referral codes are unique.' : 'Duplicate referral codes exist.',
      why: 'Duplicate referral codes route new signups to wrong leaders, corrupting commission distribution.',
      action: refCodes.length === uniqueRefs.size ? 'No action needed.' : 'Add UNIQUE constraint on profiles.referral_code.',
    }));

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
    const deliveredCount = chatTestCount - chatErrors;

    results.push(execResult({
      test: 'Chat message delivery',
      category: 'Chat_Stress',
      status: chatErrors > 0 ? 'fail' : 'pass',
      detail: `${deliveredCount}/${chatTestCount} delivered. Avg: ${avgChatLatency}ms, Max: ${maxChatLatency}ms.`,
      severity: chatErrors > 0 ? 'high' : 'low',
      latency_ms: avgChatLatency,
    }, {
      what: chatErrors > 0
        ? `${chatErrors} of ${chatTestCount} messages failed to deliver.`
        : `All ${chatTestCount} messages delivered successfully.`,
      why: chatErrors > 0
        ? 'Message delivery failures indicate RLS policy issues on direct_messages or missing foreign key references. Note: ghost accounts use service_role for insertion; failures suggest schema-level constraints, not permission issues.'
        : 'Chat system handles concurrent messaging without delivery failures.',
      action: chatErrors > 0
        ? 'Check direct_messages RLS policies and foreign key constraints. Verify sender_id/receiver_id reference valid auth.users entries.'
        : 'No action needed.',
    }));

    if (maxChatLatency > 2000) {
      results.push(execResult({
        test: 'Chat latency threshold',
        category: 'Chat_Stress',
        status: 'fail',
        detail: `Max chat latency ${maxChatLatency}ms exceeds 2000ms threshold.`,
        severity: 'high',
        latency_ms: maxChatLatency,
      }, {
        what: `Peak message delivery took ${maxChatLatency}ms — exceeding the 2-second operational threshold.`,
        why: 'Users experience visible lag, degrading perceived platform quality and increasing churn risk.',
        action: 'Add database index on direct_messages(sender_id, receiver_id). Review Realtime subscription load.',
      }));
    }

    // ═══════════════════════════════════════════
    // SUITE 5: Fraud Simulation (10 agents)
    // ═══════════════════════════════════════════
    const fraudAgents = ghosts.slice(0, 10);

    // Fraud 1: Double voting
    const { data: activeContests } = await adminClient
      .from('contests').select('id, title').eq('status', 'active').limit(1);

    if (activeContests && activeContests.length > 0) {
      const contestId = activeContests[0].id;
      const voter = fraudAgents[0];
      const candidate = fraudAgents[1];

      await adminClient.from('contest_participants').upsert({
        contest_id: contestId, user_id: candidate.user_id, status: 'active',
      });

      const { error: vote1Err } = await adminClient.from('contest_votes').insert({
        contest_id: contestId, voter_id: voter.user_id, contestant_id: candidate.user_id, vote_type: 'free',
      });

      const { error: vote2Err } = await adminClient.from('contest_votes').insert({
        contest_id: contestId, voter_id: voter.user_id, contestant_id: candidate.user_id, vote_type: 'free',
      });

      results.push(execResult({
        test: 'Double vote prevention',
        category: 'Fraud_Simulation',
        status: vote2Err ? 'pass' : (vote1Err ? 'warning' : 'fail'),
        detail: vote2Err ? 'Double vote rejected.' : vote1Err ? 'First vote failed.' : 'Double vote accepted.',
        severity: vote2Err ? 'low' : 'critical',
      }, {
        what: vote2Err ? 'Second vote attempt correctly rejected by unique constraint.' : 'System accepted duplicate votes from the same user.',
        why: vote2Err ? 'Vote integrity maintained.' : 'Vote manipulation can distort contest outcomes and undermine platform trust.',
        action: vote2Err ? 'No action needed.' : 'Add UNIQUE constraint on contest_votes(contest_id, voter_id, contestant_id, vote_type).',
      }));

      // Cleanup
      await adminClient.from('contest_votes').delete().eq('voter_id', voter.user_id).eq('contest_id', contestId);
      await adminClient.from('contest_participants').delete().eq('user_id', candidate.user_id).eq('contest_id', contestId);
    } else {
      results.push(execResult({
        test: 'Contest availability',
        category: 'Fraud_Simulation',
        status: 'warning',
        detail: 'No active contests to test double voting.',
        severity: 'low',
      }, {
        what: 'No active contest found for fraud simulation.',
        why: 'Double-vote testing requires an active contest.',
        action: 'Create a test contest to enable fraud simulation, or run test during an active contest cycle.',
      }));
    }

    // Fraud 2: Self-referral
    const selfRefAgent = fraudAgents[2];
    const { error: selfRefErr } = await adminClient.from('profiles')
      .update({ referred_by: selfRefAgent.referral_code })
      .eq('user_id', selfRefAgent.user_id);

    const { data: selfRefCheck } = await adminClient.from('profiles')
      .select('referred_by, referral_code').eq('user_id', selfRefAgent.user_id).single();

    const selfRefPassed = selfRefCheck?.referred_by === selfRefCheck?.referral_code;
    results.push(execResult({
      test: 'Self-referral prevention',
      category: 'Fraud_Simulation',
      status: selfRefPassed ? 'fail' : 'pass',
      detail: selfRefPassed ? 'Self-referral accepted.' : 'Self-referral blocked.',
      severity: selfRefPassed ? 'high' : 'low',
    }, {
      what: selfRefPassed ? 'A user successfully referred themselves, creating a self-commission loop.' : 'Self-referral attempt was properly blocked.',
      why: selfRefPassed ? 'Self-referral enables infinite commission farming without genuine user growth.' : 'Referral integrity maintained.',
      action: selfRefPassed ? 'Add CHECK constraint: referred_by != referral_code. Add trigger to validate referral assignment.' : 'No action needed.',
    }));

    if (selfRefPassed) {
      await adminClient.from('profiles').update({ referred_by: null }).eq('user_id', selfRefAgent.user_id);
    }

    // Fraud 3: Direct negative balance injection
    const brokeAgent = fraudAgents[3];
    const { data: brokeWallet } = await adminClient
      .from('wallets').select('nova_balance').eq('user_id', brokeAgent.user_id).single();

    if (brokeWallet) {
      const { error: fraudSpendErr } = await adminClient
        .from('wallets').update({ nova_balance: -50000 }).eq('user_id', brokeAgent.user_id);

      if (!fraudSpendErr) {
        await adminClient.from('wallets').update({ nova_balance: brokeWallet.nova_balance }).eq('user_id', brokeAgent.user_id);
      }

      results.push(execResult({
        test: 'Negative balance injection',
        category: 'Fraud_Simulation',
        status: fraudSpendErr ? 'pass' : 'fail',
        detail: fraudSpendErr ? 'Balance manipulation rejected.' : 'Wallet accepted negative balance.',
        severity: fraudSpendErr ? 'low' : 'critical',
      }, {
        what: fraudSpendErr
          ? 'Direct attempt to set balance to -50,000 was rejected by database constraint.'
          : 'Direct balance manipulation succeeded — wallet accepted -50,000 balance.',
        why: fraudSpendErr
          ? 'Database-level financial protection is active.'
          : 'Without CHECK constraints, attackers can extract unlimited funds through direct mutation or race conditions.',
        action: fraudSpendErr
          ? 'No action needed. CHECK constraint is enforcing financial integrity.'
          : 'CRITICAL: Immediately add CHECK (nova_balance >= 0) to wallets table.',
      }));
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
      const exceeded = ms > 2000;

      results.push(execResult({
        test: pt.name,
        category: 'Performance',
        status: ms > 3000 ? 'fail' : ms > 2000 ? 'warning' : 'pass',
        detail: `${ms}ms${exceeded ? ' — exceeds threshold' : ''}`,
        severity: ms > 3000 ? 'high' : 'low',
        latency_ms: ms,
      }, {
        what: `${pt.name} completed in ${ms}ms.`,
        why: exceeded ? 'Slow queries degrade user experience and increase timeout risk under load.' : 'Query performance within acceptable range.',
        action: exceeded ? 'Add database indexes. Review query complexity. Consider pagination.' : 'No action needed.',
      }));
    }

    // ═══════════════════════════════════════════
    // EXECUTIVE REPORT — Problem → Impact → Action
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
      chat_delivered: deliveredCount,
      chat_attempted: chatTestCount,
      referral_links_tested: teamLinks?.length || 0,
      fraud_tests_run: results.filter(r => r.category === 'Fraud_Simulation').length,
    };

    // Build executive-grade proposal description
    const executiveSummary = [
      `Stress test completed: ${ghosts.length} agents, ${results.length} tests, ${totalDuration}ms.`,
      '',
      `RESULTS: ${summary.passed} passed, ${failures.length} failed, ${warnings.length} warnings.`,
      `Chat: ${deliveredCount}/${chatTestCount} delivered, avg ${avgChatLatency}ms.`,
      `Referral links: ${teamLinks?.length || 0}.`,
    ];

    if (criticals.length > 0) {
      executiveSummary.push('', '── CRITICAL ISSUES REQUIRING IMMEDIATE ACTION ──');
      for (const c of criticals) {
        executiveSummary.push(
          '',
          `▸ ${c.test}`,
          `  Problem: ${c.what_happened}`,
          `  Impact: ${c.why_it_matters}`,
          `  Action: ${c.recommended_action}`,
        );
      }
    }

    if (failures.filter(f => f.severity !== 'critical').length > 0) {
      executiveSummary.push('', '── OTHER FAILURES ──');
      for (const f of failures.filter(ff => ff.severity !== 'critical')) {
        executiveSummary.push(`▸ ${f.test}: ${f.what_happened} → ${f.recommended_action}`);
      }
    }

    const proposalPriority = criticals.length > 0 ? 'critical' : failures.length > 0 ? 'high' : warnings.length > 0 ? 'medium' : 'low';

    await adminClient.from('ai_proposals').insert({
      title: `Stress Test: ${ghosts.length} agents — ${criticals.length} critical, ${failures.length} failures`,
      title_ar: `اختبار الضغط: ${ghosts.length} عميل — ${criticals.length} حرج، ${failures.length} فشل`,
      description: executiveSummary.join('\n'),
      description_ar: `اختبار الغابة الرقمية اكتمل. ${ghosts.length} عميل، ${results.length} اختبار. النتائج: ${summary.passed} نجح، ${failures.length} فشل، ${criticals.length} حرج.`,
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

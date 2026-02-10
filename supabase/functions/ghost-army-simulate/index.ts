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
  what_happened: string;
  why_it_matters: string;
  recommended_action: string;
}

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

    // Parse scenario
    let body: any = {};
    try { body = await req.json(); } catch (_) {}
    const scenario: string = body.scenario || 'full';
    const safeMode: boolean = body.safe_mode !== false;

    const runSuite = (name: string) => scenario === 'full' || scenario === name;

    const { data: ghosts } = await adminClient
      .from('profiles').select('id, user_id, username, name, referral_code, referred_by')
      .like('username', 'ghost_agent_%').limit(200);

    if (!ghosts || ghosts.length === 0) {
      return new Response(JSON.stringify({ error: 'No ghost agents found.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: TestResult[] = [];
    const startTime = Date.now();
    const anonClient = createClient(supabaseUrl, anonKey);

    // ═══ SUITE 1: RLS Security ═══
    if (runSuite('wallet') && ghosts.length >= 2) {
      const ghostB = ghosts[1];
      const { data: otherWallet } = await anonClient
        .from('wallets').select('*').eq('user_id', ghostB.user_id).maybeSingle();

      results.push(execResult({
        test: 'Cross-user wallet access', category: 'RLS_Security',
        status: otherWallet ? 'fail' : 'pass',
        detail: otherWallet ? `Anon read wallet of ${ghostB.username}.` : 'Anon blocked.',
        severity: otherWallet ? 'critical' : 'low',
      }, {
        what: otherWallet ? 'Unauthenticated request read another user\'s wallet.' : 'Unauthenticated wallet access blocked.',
        why: otherWallet ? 'External actors could view balances.' : 'Financial data properly isolated.',
        action: otherWallet ? 'Enforce RLS SELECT on wallets.' : 'No action needed.',
      }));

      const { data: publicProfile } = await anonClient
        .from('profiles').select('name, username').eq('user_id', ghosts[0].user_id).maybeSingle();

      results.push(execResult({
        test: 'Profile public visibility', category: 'RLS_Security',
        status: publicProfile ? 'pass' : 'warning',
        detail: publicProfile ? 'Profiles publicly readable.' : 'Profile access blocked.',
        severity: 'low',
      }, {
        what: publicProfile ? 'Public profiles accessible.' : 'Profile data not publicly accessible.',
        why: 'Public profiles needed for social features.',
        action: publicProfile ? 'No action needed.' : 'Review profile SELECT policy.',
      }));
    }

    // ═══ SUITE 2: Wallet Integrity ═══
    if (runSuite('wallet')) {
      for (const ghost of ghosts.slice(0, safeMode ? 5 : 10)) {
        const { data: wallet } = await adminClient
          .from('wallets').select('*').eq('user_id', ghost.user_id).maybeSingle();

        if (!wallet) {
          results.push(execResult({
            test: `Wallet existence: ${ghost.username}`, category: 'Data_Integrity',
            status: 'fail', detail: `No wallet for ${ghost.username}`, severity: 'high',
          }, {
            what: `User ${ghost.username} has no wallet record.`,
            why: 'Users without wallets cannot participate in financial operations.',
            action: 'Investigate wallet provisioning trigger.',
          }));
        } else if (Number(wallet.nova_balance) < 0 || Number(wallet.aura_balance) < 0) {
          results.push(execResult({
            test: `Negative balance: ${ghost.username}`, category: 'Data_Integrity',
            status: 'fail', detail: `Nova=${wallet.nova_balance}, Aura=${wallet.aura_balance}`, severity: 'critical',
          }, {
            what: `User ${ghost.username} has negative balance.`,
            why: 'Negative balances indicate exploit potential.',
            action: 'Enforce CHECK constraints on wallet balance columns.',
          }));
        }
      }

      // Overdraft test
      const { data: ogWallet } = await adminClient
        .from('wallets').select('nova_balance').eq('user_id', ghosts[0].user_id).single();

      if (ogWallet) {
        const { error: overdraftError } = await adminClient
          .from('wallets').update({ nova_balance: -(Number(ogWallet.nova_balance) + 9999) }).eq('user_id', ghosts[0].user_id);

        if (!overdraftError) {
          await adminClient.from('wallets').update({ nova_balance: ogWallet.nova_balance }).eq('user_id', ghosts[0].user_id);
        }

        results.push(execResult({
          test: 'Overdraft protection', category: 'Financial_Safety',
          status: overdraftError ? 'pass' : 'fail',
          detail: overdraftError ? 'Database rejected negative balance.' : 'Negative balance accepted.',
          severity: overdraftError ? 'low' : 'critical',
        }, {
          what: overdraftError ? 'Overdraft rejected by CHECK constraint.' : 'Overdraft succeeded — wallet accepted negative balance.',
          why: overdraftError ? 'Financial integrity protected.' : 'Attackers could extract unlimited funds.',
          action: overdraftError ? 'No action needed.' : 'URGENT: Add CHECK (nova_balance >= 0).',
        }));
      }
    }

    // ═══ SUITE 3: Referral Tree Integrity ═══
    let teamLinks: any[] | null = null;
    if (runSuite('referral')) {
      const { data: tl } = await adminClient
        .from('team_members').select('leader_id, member_id, level')
        .in('member_id', ghosts.map(g => g.user_id));
      teamLinks = tl;

      const ghostsWithReferral = ghosts.filter(g => g.referred_by);
      results.push(execResult({
        test: 'Referral coverage', category: 'Referral_Integrity',
        status: ghostsWithReferral.length > ghosts.length * 0.5 ? 'pass' : 'warning',
        detail: `${ghostsWithReferral.length}/${ghosts.length} have referral links.`,
        severity: 'medium',
      }, {
        what: `${ghostsWithReferral.length} of ${ghosts.length} accounts linked in referral tree.`,
        why: 'Low coverage masks hierarchy bugs.',
        action: ghostsWithReferral.length > ghosts.length * 0.5 ? 'No action needed.' : 'Re-run provisioning.',
      }));

      if (teamLinks) {
        const circularPairs = new Set<string>();
        for (const link of teamLinks) {
          const reverse = teamLinks.find(
            t => t.leader_id === link.member_id && t.member_id === link.leader_id && t.level === 1
          );
          if (reverse) circularPairs.add(`${link.leader_id}<->${link.member_id}`);
        }

        results.push(execResult({
          test: 'Circular referral detection', category: 'Referral_Integrity',
          status: circularPairs.size === 0 ? 'pass' : 'fail',
          detail: circularPairs.size === 0 ? 'No circular referrals.' : `${circularPairs.size} circular pairs.`,
          severity: circularPairs.size === 0 ? 'low' : 'critical',
        }, {
          what: circularPairs.size === 0 ? 'No circular dependencies.' : `${circularPairs.size} circular loop(s) detected.`,
          why: circularPairs.size === 0 ? 'Tree integrity maintained.' : 'Circular referrals enable infinite commission cascading.',
          action: circularPairs.size === 0 ? 'No action needed.' : 'Add trigger to prevent A→B→A chains.',
        }));

        const maxLevel = Math.max(...teamLinks.map(t => t.level), 0);
        results.push(execResult({
          test: 'Team hierarchy depth', category: 'Referral_Integrity',
          status: maxLevel <= 10 ? 'pass' : 'warning',
          detail: `Max: ${maxLevel} levels, ${teamLinks.length} links.`,
          severity: 'low',
        }, {
          what: `Hierarchy reaches ${maxLevel} levels with ${teamLinks.length} links.`,
          why: 'Deep hierarchies may slow commission calculations.',
          action: maxLevel > 10 ? 'Consider capping depth.' : 'No action needed.',
        }));
      }

      // Uniqueness checks
      const usernames = ghosts.map(g => g.username);
      const uniqueUsernames = new Set(usernames);
      results.push(execResult({
        test: 'Username uniqueness', category: 'Data_Integrity',
        status: usernames.length === uniqueUsernames.size ? 'pass' : 'fail',
        detail: `${usernames.length} total, ${uniqueUsernames.size} unique.`,
        severity: usernames.length === uniqueUsernames.size ? 'low' : 'high',
      }, {
        what: usernames.length === uniqueUsernames.size ? 'All usernames unique.' : 'Duplicate usernames detected.',
        why: 'Duplicates enable impersonation.',
        action: usernames.length === uniqueUsernames.size ? 'No action needed.' : 'Add UNIQUE constraint.',
      }));

      const refCodes = ghosts.map(g => g.referral_code).filter(Boolean);
      const uniqueRefs = new Set(refCodes);
      results.push(execResult({
        test: 'Referral code uniqueness', category: 'Data_Integrity',
        status: refCodes.length === uniqueRefs.size ? 'pass' : 'fail',
        detail: refCodes.length === uniqueRefs.size ? `All ${refCodes.length} unique.` : 'Duplicates found.',
        severity: refCodes.length === uniqueRefs.size ? 'low' : 'high',
      }, {
        what: refCodes.length === uniqueRefs.size ? 'All referral codes unique.' : 'Duplicate referral codes exist.',
        why: 'Duplicates route signups to wrong leaders.',
        action: refCodes.length === uniqueRefs.size ? 'No action needed.' : 'Add UNIQUE constraint on referral_code.',
      }));
    }

    // ═══ SUITE 4: Chat Stress Test ═══
    const chatTestCount = Math.min(safeMode ? 10 : 20, ghosts.length);
    let chatLatencies: number[] = [];
    let chatErrors = 0;
    let chatErrorDetails: string[] = [];
    let avgChatLatency = 0;
    let maxChatLatency = 0;
    let deliveredCount = 0;

    if (runSuite('chat')) {
      for (let i = 0; i < chatTestCount; i++) {
        const sender = ghosts[i];
        const receiver = ghosts[(i + 1) % ghosts.length];
        const chatStart = Date.now();

        // Find or create conversation
        const { data: existingConv } = await adminClient
          .from('conversations')
          .select('id')
          .or(`and(participant1_id.eq.${sender.user_id},participant2_id.eq.${receiver.user_id}),and(participant1_id.eq.${receiver.user_id},participant2_id.eq.${sender.user_id})`)
          .maybeSingle();

        let conversationId = existingConv?.id;

        if (!conversationId) {
          const { data: newConv, error: convErr } = await adminClient.from('conversations').insert({
            participant1_id: sender.user_id,
            participant2_id: receiver.user_id,
          }).select('id').single();

          if (convErr) {
            chatErrors++;
            chatErrorDetails.push(`Conv creation: ${convErr.message}`);
            chatLatencies.push(Date.now() - chatStart);
            continue;
          }
          conversationId = newConv.id;
        }

        const { error: msgError } = await adminClient.from('direct_messages').insert({
          conversation_id: conversationId,
          sender_id: sender.user_id,
          content: `[GHOST_TEST] Stress message #${i + 1} from ${sender.username} — ${Date.now()}`,
          message_type: 'text',
        });

        const latency = Date.now() - chatStart;
        chatLatencies.push(latency);
        if (msgError) {
          chatErrors++;
          chatErrorDetails.push(`Msg insert: ${msgError.message}`);
        }
      }

      avgChatLatency = chatLatencies.length > 0
        ? Math.round(chatLatencies.reduce((a, b) => a + b, 0) / chatLatencies.length) : 0;
      maxChatLatency = Math.max(...chatLatencies, 0);
      deliveredCount = chatTestCount - chatErrors;

      results.push(execResult({
        test: 'Chat message delivery', category: 'Chat_Stress',
        status: chatErrors > 0 ? 'fail' : 'pass',
        detail: `${deliveredCount}/${chatTestCount} delivered. Avg: ${avgChatLatency}ms, Max: ${maxChatLatency}ms.`,
        severity: chatErrors > 0 ? 'high' : 'low',
        latency_ms: avgChatLatency,
      }, {
        what: chatErrors > 0
          ? `${chatErrors}/${chatTestCount} failed.${chatErrorDetails.length > 0 ? ' ' + chatErrorDetails.slice(0, 3).join('; ') : ''}`
          : `All ${chatTestCount} messages delivered.`,
        why: chatErrors > 0
          ? 'Message delivery failures block real-time communication.'
          : 'Chat handles concurrent messaging.',
        action: chatErrors > 0
          ? 'Review conversation creation and direct_messages schema.'
          : 'No action needed.',
      }));

      if (maxChatLatency > 2000) {
        results.push(execResult({
          test: 'Chat latency threshold', category: 'Chat_Stress',
          status: 'fail', detail: `Max: ${maxChatLatency}ms exceeds 2000ms.`, severity: 'high',
          latency_ms: maxChatLatency,
        }, {
          what: `Peak delivery took ${maxChatLatency}ms.`,
          why: 'Visible lag degrades user experience.',
          action: 'Add indexes on direct_messages. Review Realtime load.',
        }));
      }
    }

    // ═══ SUITE 5: Fraud Simulation ═══
    if (runSuite('fraud') || runSuite('wallet') || runSuite('contest')) {
      const fraudAgents = ghosts.slice(0, safeMode ? 5 : 10);

      // Double voting
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
          test: 'Double vote prevention', category: 'Fraud_Simulation',
          status: vote2Err ? 'pass' : (vote1Err ? 'warning' : 'fail'),
          detail: vote2Err ? 'Double vote rejected.' : vote1Err ? 'First vote failed.' : 'Double vote accepted.',
          severity: vote2Err ? 'low' : 'critical',
        }, {
          what: vote2Err ? 'Second vote rejected by constraint.' : 'Duplicate votes accepted.',
          why: vote2Err ? 'Vote integrity maintained.' : 'Vote manipulation distorts contest outcomes.',
          action: vote2Err ? 'No action needed.' : 'Add UNIQUE constraint on contest_votes.',
        }));

        await adminClient.from('contest_votes').delete().eq('voter_id', voter.user_id).eq('contest_id', contestId);
        await adminClient.from('contest_participants').delete().eq('user_id', candidate.user_id).eq('contest_id', contestId);
      } else {
        results.push(execResult({
          test: 'Contest availability', category: 'Fraud_Simulation',
          status: 'warning', detail: 'No active contests for testing.', severity: 'low',
        }, {
          what: 'No active contest found.',
          why: 'Double-vote testing requires an active contest.',
          action: 'Run test during active contest cycle.',
        }));
      }

      // Self-referral
      const selfRefAgent = fraudAgents[2];
      const { error: _selfRefErr } = await adminClient.from('profiles')
        .update({ referred_by: selfRefAgent.referral_code })
        .eq('user_id', selfRefAgent.user_id);

      const { data: selfRefCheck } = await adminClient.from('profiles')
        .select('referred_by, referral_code').eq('user_id', selfRefAgent.user_id).single();

      const selfRefPassed = selfRefCheck?.referred_by === selfRefCheck?.referral_code;
      results.push(execResult({
        test: 'Self-referral prevention', category: 'Fraud_Simulation',
        status: selfRefPassed ? 'fail' : 'pass',
        detail: selfRefPassed ? 'Self-referral accepted.' : 'Self-referral blocked.',
        severity: selfRefPassed ? 'high' : 'low',
      }, {
        what: selfRefPassed ? 'User referred themselves.' : 'Self-referral blocked.',
        why: selfRefPassed ? 'Enables infinite commission farming.' : 'Referral integrity maintained.',
        action: selfRefPassed ? 'Add CHECK: referred_by != referral_code.' : 'No action needed.',
      }));

      if (selfRefPassed) {
        await adminClient.from('profiles').update({ referred_by: null }).eq('user_id', selfRefAgent.user_id);
      }

      // Negative balance injection
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
          test: 'Negative balance injection', category: 'Fraud_Simulation',
          status: fraudSpendErr ? 'pass' : 'fail',
          detail: fraudSpendErr ? 'Manipulation rejected.' : 'Negative balance accepted.',
          severity: fraudSpendErr ? 'low' : 'critical',
        }, {
          what: fraudSpendErr ? 'Balance -50,000 rejected by constraint.' : 'Wallet accepted -50,000.',
          why: fraudSpendErr ? 'DB-level protection active.' : 'Unlimited fund extraction possible.',
          action: fraudSpendErr ? 'No action needed.' : 'CRITICAL: Add CHECK (nova_balance >= 0).',
        }));
      }
    }

    // ═══ SUITE 6: Performance Benchmarks ═══
    if (runSuite('wallet') || runSuite('chat') || runSuite('referral')) {
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
          test: pt.name, category: 'Performance',
          status: ms > 3000 ? 'fail' : ms > 2000 ? 'warning' : 'pass',
          detail: `${ms}ms${exceeded ? ' — exceeds threshold' : ''}`,
          severity: ms > 3000 ? 'high' : 'low',
          latency_ms: ms,
        }, {
          what: `${pt.name} completed in ${ms}ms.`,
          why: exceeded ? 'Slow queries degrade UX.' : 'Performance acceptable.',
          action: exceeded ? 'Add indexes. Consider pagination.' : 'No action needed.',
        }));
      }
    }

    // ═══ EXECUTIVE REPORT ═══
    const totalDuration = Date.now() - startTime;
    const failures = results.filter(r => r.status === 'fail');
    const warnings = results.filter(r => r.status === 'warning');
    const criticals = failures.filter(r => r.severity === 'critical');

    const summary = {
      scenario,
      safe_mode: safeMode,
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

    const executiveSummary = [
      `[${scenario.toUpperCase()}] Stress test: ${ghosts.length} agents, ${results.length} tests, ${totalDuration}ms.`,
      `RESULTS: ${summary.passed} passed, ${failures.length} failed, ${warnings.length} warnings.`,
    ];

    if (runSuite('chat')) {
      executiveSummary.push(`Chat: ${deliveredCount}/${chatTestCount} delivered, avg ${avgChatLatency}ms.`);
    }

    if (criticals.length > 0) {
      executiveSummary.push('', '── CRITICAL ISSUES ──');
      for (const c of criticals) {
        executiveSummary.push(
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
      title: `[${scenario.toUpperCase()}] ${ghosts.length} agents — ${criticals.length} critical, ${failures.length} failures`,
      title_ar: `[${scenario}] ${ghosts.length} عميل — ${criticals.length} حرج، ${failures.length} فشل`,
      description: executiveSummary.join('\n'),
      description_ar: `اختبار ${scenario} اكتمل. ${summary.passed} نجح، ${failures.length} فشل.`,
      proposal_type: 'system_diagnostic',
      priority: proposalPriority,
      affected_area: 'infrastructure',
      status: 'pending',
      risk_level: proposalPriority === 'critical' ? 'critical' : proposalPriority === 'high' ? 'high' : 'medium',
      impact_scope: 'platform_wide',
    });

    // Cleanup ghost test data
    await adminClient.from('direct_messages').delete().like('content', '%[GHOST_TEST]%');
    const ghostUserIds = ghosts.map(g => g.user_id);
    await adminClient.from('conversations').delete()
      .in('participant1_id', ghostUserIds)
      .in('participant2_id', ghostUserIds);

    return new Response(JSON.stringify({ success: true, summary, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

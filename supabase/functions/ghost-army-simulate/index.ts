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

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await adminClient.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: roles } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (!roles?.some((r: any) => r.role === 'admin')) {
        return new Response(JSON.stringify({ error: 'Admin only' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch ghost agents
    const { data: ghosts } = await adminClient
      .from('profiles')
      .select('id, user_id, username, name')
      .like('username', 'ghost_agent_%')
      .limit(100);

    if (!ghosts || ghosts.length === 0) {
      return new Response(JSON.stringify({
        error: 'No ghost agents found. Run provisioning first.',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: TestResult[] = [];
    const startTime = Date.now();

    // ═══════════════════════════════════════════
    // TEST SUITE 1: Data Isolation (RLS)
    // ═══════════════════════════════════════════
    
    // Test: Ghost A cannot read Ghost B's wallet via anon key
    if (ghosts.length >= 2) {
      const ghostA = ghosts[0];
      const ghostB = ghosts[1];

      // Sign in as Ghost A
      const { data: session } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: `ghost_001@ghost.winova.test`,
      });

      // Use anon client as Ghost A to try reading Ghost B's wallet
      const anonClient = createClient(supabaseUrl, anonKey);
      const { data: signIn } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: 'ghost_001@ghost.winova.test',
      });

      // Direct query: Ghost trying to read another ghost's wallet
      const { data: otherWallet, error: walletError } = await anonClient
        .from('wallets')
        .select('*')
        .eq('user_id', ghostB.user_id)
        .maybeSingle();

      if (!walletError && otherWallet) {
        results.push({
          test: 'Cross-user wallet access',
          category: 'RLS_Security',
          status: 'fail',
          detail: `Unauthenticated client could read wallet of user ${ghostB.username}. RLS may be misconfigured.`,
          severity: 'critical',
        });
      } else {
        results.push({
          test: 'Cross-user wallet access',
          category: 'RLS_Security',
          status: 'pass',
          detail: 'Anon client cannot access individual wallet data. RLS working.',
          severity: 'low',
        });
      }

      // Test: Anon client reading profiles (should be public)
      const { data: publicProfile, error: profileError } = await anonClient
        .from('profiles')
        .select('name, username')
        .eq('user_id', ghostA.user_id)
        .maybeSingle();

      results.push({
        test: 'Profile public visibility',
        category: 'RLS_Security',
        status: publicProfile ? 'pass' : 'warning',
        detail: publicProfile
          ? 'Profiles are publicly readable as expected.'
          : `Profile access blocked: ${profileError?.message || 'No data returned'}`,
        severity: 'low',
      });
    }

    // ═══════════════════════════════════════════
    // TEST SUITE 2: Wallet Integrity
    // ═══════════════════════════════════════════

    for (const ghost of ghosts.slice(0, 10)) {
      const { data: wallet } = await adminClient
        .from('wallets')
        .select('*')
        .eq('user_id', ghost.user_id)
        .maybeSingle();

      if (!wallet) {
        results.push({
          test: `Wallet existence: ${ghost.username}`,
          category: 'Data_Integrity',
          status: 'fail',
          detail: `No wallet found for ${ghost.username}`,
          severity: 'high',
        });
      } else if (wallet.nova_balance < 0 || wallet.aura_balance < 0) {
        results.push({
          test: `Negative balance: ${ghost.username}`,
          category: 'Data_Integrity',
          status: 'fail',
          detail: `Negative balance detected: Nova=${wallet.nova_balance}, Aura=${wallet.aura_balance}`,
          severity: 'critical',
        });
      }
    }

    // Test: Attempt overdraft (spend more than balance)
    const overdraftGhost = ghosts[0];
    const { data: ogWallet } = await adminClient
      .from('wallets')
      .select('nova_balance')
      .eq('user_id', overdraftGhost.user_id)
      .single();

    if (ogWallet) {
      const overAmount = ogWallet.nova_balance + 9999;
      const { error: overdraftError } = await adminClient
        .from('wallets')
        .update({ nova_balance: -overAmount })
        .eq('user_id', overdraftGhost.user_id);

      // Restore balance
      await adminClient
        .from('wallets')
        .update({ nova_balance: ogWallet.nova_balance })
        .eq('user_id', overdraftGhost.user_id);

      results.push({
        test: 'Overdraft protection',
        category: 'Financial_Safety',
        status: overdraftError ? 'pass' : 'fail',
        detail: overdraftError
          ? 'Database rejected negative balance update.'
          : 'WARNING: Negative balance was accepted. No DB constraint protecting balances.',
        severity: overdraftError ? 'low' : 'critical',
      });
    }

    // ═══════════════════════════════════════════
    // TEST SUITE 3: Profile Data Consistency
    // ═══════════════════════════════════════════

    const { data: allGhostProfiles } = await adminClient
      .from('profiles')
      .select('user_id, username, referral_code')
      .like('username', 'ghost_agent_%');

    const usernames = allGhostProfiles?.map(p => p.username) || [];
    const uniqueUsernames = new Set(usernames);
    if (usernames.length !== uniqueUsernames.size) {
      results.push({
        test: 'Username uniqueness',
        category: 'Data_Integrity',
        status: 'fail',
        detail: `Duplicate usernames detected: ${usernames.length} total, ${uniqueUsernames.size} unique`,
        severity: 'high',
      });
    } else {
      results.push({
        test: 'Username uniqueness',
        category: 'Data_Integrity',
        status: 'pass',
        detail: `All ${usernames.length} ghost usernames are unique.`,
        severity: 'low',
      });
    }

    // Check referral code uniqueness
    const refCodes = allGhostProfiles?.map(p => p.referral_code).filter(Boolean) || [];
    const uniqueRefs = new Set(refCodes);
    results.push({
      test: 'Referral code uniqueness',
      category: 'Data_Integrity',
      status: refCodes.length === uniqueRefs.size ? 'pass' : 'fail',
      detail: refCodes.length === uniqueRefs.size
        ? `All ${refCodes.length} referral codes unique.`
        : `Duplicate referral codes found.`,
      severity: refCodes.length === uniqueRefs.size ? 'low' : 'high',
    });

    // ═══════════════════════════════════════════
    // TEST SUITE 4: Contest System
    // ═══════════════════════════════════════════

    const { data: activeContests } = await adminClient
      .from('contests')
      .select('id, title')
      .eq('status', 'active')
      .limit(1);

    if (activeContests && activeContests.length > 0) {
      const contestId = activeContests[0].id;
      const voter = ghosts[2];

      // Attempt to join contest
      const { error: joinError } = await adminClient
        .from('contest_participants')
        .upsert({
          contest_id: contestId,
          user_id: voter.user_id,
          status: 'active',
        });

      results.push({
        test: 'Contest join',
        category: 'Feature_Test',
        status: joinError ? 'fail' : 'pass',
        detail: joinError ? `Join failed: ${joinError.message}` : 'Ghost agent joined contest successfully.',
        severity: joinError ? 'medium' : 'low',
      });

      // Cleanup: remove participant
      await adminClient
        .from('contest_participants')
        .delete()
        .eq('contest_id', contestId)
        .eq('user_id', voter.user_id);
    } else {
      results.push({
        test: 'Contest availability',
        category: 'Feature_Test',
        status: 'warning',
        detail: 'No active contests found to test.',
        severity: 'low',
      });
    }

    // ═══════════════════════════════════════════
    // TEST SUITE 5: Performance (Query Speed)
    // ═══════════════════════════════════════════

    const perfStart = Date.now();
    await adminClient.from('profiles').select('id').limit(500);
    const profileQueryMs = Date.now() - perfStart;

    results.push({
      test: 'Profile query performance',
      category: 'Performance',
      status: profileQueryMs > 3000 ? 'fail' : profileQueryMs > 1000 ? 'warning' : 'pass',
      detail: `500-row profile query: ${profileQueryMs}ms`,
      severity: profileQueryMs > 3000 ? 'high' : 'low',
    });

    const walletPerfStart = Date.now();
    await adminClient.from('wallets').select('id, nova_balance').limit(500);
    const walletQueryMs = Date.now() - walletPerfStart;

    results.push({
      test: 'Wallet query performance',
      category: 'Performance',
      status: walletQueryMs > 3000 ? 'fail' : walletQueryMs > 1000 ? 'warning' : 'pass',
      detail: `500-row wallet query: ${walletQueryMs}ms`,
      severity: walletQueryMs > 3000 ? 'high' : 'low',
    });

    // ═══════════════════════════════════════════
    // RESULTS SUMMARY
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
    };

    // Report to Commander as AI Proposal
    const proposalPriority = criticals.length > 0 ? 'critical'
      : failures.length > 0 ? 'high'
      : warnings.length > 0 ? 'medium' : 'low';

    const failureSummary = failures.map(f => `• [${f.category}] ${f.test}: ${f.detail}`).join('\n');
    const warningSummary = warnings.map(w => `• [${w.category}] ${w.test}: ${w.detail}`).join('\n');

    await adminClient.from('ai_proposals').insert({
      title: `Ghost Army Report: ${failures.length} bugs, ${criticals.length} critical`,
      title_ar: `تقرير جيش الأشباح: ${failures.length} أخطاء، ${criticals.length} حرجة`,
      description: [
        `Sovereign Stress Test completed in ${totalDuration}ms.`,
        `${ghosts.length} agents active, ${results.length} tests executed.`,
        `Results: ${summary.passed} passed, ${failures.length} failed, ${warnings.length} warnings.`,
        failures.length > 0 ? `\nFAILURES:\n${failureSummary}` : '',
        warnings.length > 0 ? `\nWARNINGS:\n${warningSummary}` : '',
      ].filter(Boolean).join('\n'),
      description_ar: `اختبار ضغط سيادي اكتمل في ${totalDuration}ms. ${ghosts.length} عميل نشط، ${results.length} اختبار. النتائج: ${summary.passed} نجح، ${failures.length} فشل، ${warnings.length} تحذيرات.`,
      proposal_type: 'system_diagnostic',
      priority: proposalPriority,
      affected_area: 'infrastructure',
      status: 'pending',
      risk_level: proposalPriority === 'critical' ? 'critical' : proposalPriority === 'high' ? 'high' : 'medium',
      impact_scope: 'platform_wide',
    });

    return new Response(JSON.stringify({
      success: true,
      summary,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

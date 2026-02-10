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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      if (!roles?.some((r: any) => r.role === 'admin')) {
        return new Response(JSON.stringify({ error: 'Admin only' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Collect intelligence
    const { count: ghostCount } = await supabase
      .from('profiles').select('id', { count: 'exact', head: true }).like('username', 'ghost_agent_%');

    const { data: recentProposals } = await supabase
      .from('ai_proposals')
      .select('title, description, priority, risk_level, created_at')
      .eq('proposal_type', 'system_diagnostic')
      .like('title', '%Digital Forest%')
      .order('created_at', { ascending: false })
      .limit(3);

    const { data: teamStats } = await supabase
      .from('team_members')
      .select('level')
      .in('member_id', (await supabase.from('profiles').select('user_id').like('username', 'ghost_agent_%')).data?.map(g => g.user_id) || []);

    const levelDistribution: Record<number, number> = {};
    teamStats?.forEach(t => {
      levelDistribution[t.level] = (levelDistribution[t.level] || 0) + 1;
    });

    const { data: walletStats } = await supabase
      .from('wallets')
      .select('nova_balance, aura_balance')
      .in('user_id', (await supabase.from('profiles').select('user_id').like('username', 'ghost_agent_%')).data?.map(g => g.user_id) || []);

    const totalNova = walletStats?.reduce((sum, w) => sum + (w.nova_balance || 0), 0) || 0;
    const totalAura = walletStats?.reduce((sum, w) => sum + (w.aura_balance || 0), 0) || 0;
    const avgNova = walletStats?.length ? Math.round(totalNova / walletStats.length) : 0;

    // Build analysis context
    const analysisContext = {
      ghost_count: ghostCount || 0,
      team_hierarchy: levelDistribution,
      total_team_links: teamStats?.length || 0,
      financial: { total_nova: totalNova, total_aura: totalAura, avg_nova_per_agent: avgNova },
      recent_test_reports: recentProposals?.map(p => ({
        title: p.title,
        priority: p.priority,
        risk_level: p.risk_level,
        findings_excerpt: p.description?.substring(0, 300),
      })) || [],
    };

    // Extract key findings from recent reports
    const criticalFindings: string[] = [];
    const recommendations: string[] = [];

    recentProposals?.forEach(p => {
      if (p.priority === 'critical' || p.risk_level === 'critical') {
        criticalFindings.push(p.title || 'Unknown critical issue');
      }
      if (p.description?.includes('FAILURES:')) {
        const failSection = p.description.split('FAILURES:')[1]?.split('\n').filter((l: string) => l.trim().startsWith('•'));
        failSection?.forEach((f: string) => criticalFindings.push(f.trim()));
      }
    });

    // Generate strategic summary without external LLM
    const hasIssues = criticalFindings.length > 0;
    const hierarchyDepth = Object.keys(levelDistribution).length;

    if (criticalFindings.length > 0) {
      recommendations.push('Immediate: Address all critical security and financial integrity failures before launch.');
    }
    if (hierarchyDepth < 3) {
      recommendations.push('Referral tree is shallow. Consider increasing ghost provisioning to test deeper hierarchies.');
    }
    if (avgNova > 1000) {
      recommendations.push('Average wallet balance is high for test agents. Verify commission calculation under load.');
    }
    if (!hasIssues) {
      recommendations.push('All systems nominal. Recommend proceeding with expanded behavioral testing.');
    }

    const strategicSummary = {
      title: '🕵️ Spy Agent Strategic Summary',
      date: new Date().toISOString().split('T')[0],
      ghost_army_size: ghostCount || 0,
      hierarchy_depth: hierarchyDepth,
      financial_overview: { total_nova: totalNova, total_aura: totalAura, avg_balance: avgNova },
      critical_findings: criticalFindings,
      recommendations,
      overall_health: criticalFindings.length === 0 ? 'HEALTHY' : criticalFindings.length <= 2 ? 'NEEDS_ATTENTION' : 'CRITICAL',
    };

    // Post summary as CEO briefing proposal
    await supabase.from('ai_proposals').insert({
      title: `🕵️ Spy Agent CEO Summary: ${strategicSummary.overall_health} — ${criticalFindings.length} issues`,
      title_ar: `🕵️ ملخص العميل المراقب: ${strategicSummary.overall_health} — ${criticalFindings.length} مشكلة`,
      description: [
        `**Digital Forest Intelligence Report**`,
        `Date: ${strategicSummary.date}`,
        `Agents: ${strategicSummary.ghost_army_size} | Hierarchy Depth: ${hierarchyDepth} levels`,
        `Financials: И${totalNova} Nova, ✦${totalAura} Aura across fleet`,
        '',
        criticalFindings.length > 0 ? `**Critical Findings:**\n${criticalFindings.map(f => `• ${f}`).join('\n')}` : '**No critical findings.**',
        '',
        `**Recommendations:**\n${recommendations.map(r => `→ ${r}`).join('\n')}`,
        '',
        `Overall System Health: **${strategicSummary.overall_health}**`,
      ].join('\n'),
      description_ar: `تقرير استخبارات الغابة الرقمية. ${strategicSummary.ghost_army_size} عميل. صحة النظام: ${strategicSummary.overall_health}. مشاكل حرجة: ${criticalFindings.length}.`,
      proposal_type: 'system_diagnostic',
      priority: criticalFindings.length > 0 ? 'high' : 'low',
      affected_area: 'infrastructure',
      status: 'pending',
      risk_level: criticalFindings.length > 0 ? 'high' : 'low',
      impact_scope: 'platform_wide',
    });

    return new Response(JSON.stringify({
      success: true,
      summary: strategicSummary,
      context: analysisContext,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

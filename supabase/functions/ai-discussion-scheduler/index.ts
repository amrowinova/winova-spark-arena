import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Analysis topics for scheduled discussions (Level 3 - Autonomous with Human Gate)
const ANALYSIS_TOPICS = [
  {
    id: 'wallet_integrity',
    topic: 'Wallet & Financial Integrity Analysis',
    topicAr: 'تحليل سلامة المحفظة والنظام المالي',
    agents: ['backend_engineer', 'fraud_analyst', 'system_architect', 'challenger_ai'],
    prompt: `حلل سلامة نظام المحفظة في WINOVA:
- تحقق من تطابق wallet_ledger مع balances
- ابحث عن أي race conditions محتملة
- راجع الـ RPCs المالية
- تحقق من سلامة escrow في P2P
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'p2p_health',
    topic: 'P2P Trading System Health',
    topicAr: 'صحة نظام التداول P2P',
    agents: ['p2p_moderator', 'backend_engineer', 'fraud_analyst', 'qa_breaker', 'challenger_ai'],
    prompt: `حلل نظام P2P:
- راجع status transitions
- ابحث عن disputes غير محلولة
- تحقق من timer expiration logic
- ابحث عن أي ثغرات في flow
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'team_hierarchy',
    topic: 'Team Hierarchy & Referral Analysis',
    topicAr: 'تحليل هيكل الفريق والإحالات',
    agents: ['leader_team', 'backend_engineer', 'system_architect', 'fraud_analyst'],
    prompt: `حلل نظام الفريق والإحالات:
- تحقق من سلامة team_members
- راجع rank promotions
- ابحث عن circular references
- تحقق من earnings distribution
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'security_audit',
    topic: 'Security & RLS Audit',
    topicAr: 'تدقيق الأمان وسياسات RLS',
    agents: ['system_architect', 'fraud_analyst', 'backend_engineer', 'challenger_ai'],
    prompt: `تدقيق أمني شامل:
- راجع RLS policies
- ابحث عن exposed endpoints
- تحقق من auth flows
- ابحث عن privilege escalation
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'performance_review',
    topic: 'Performance & Scalability Review',
    topicAr: 'مراجعة الأداء وقابلية التوسع',
    agents: ['system_architect', 'backend_engineer', 'web_engineer', 'android_engineer', 'ios_engineer'],
    prompt: `مراجعة الأداء:
- ابحث عن N+1 queries
- راجع indexes
- حلل realtime subscriptions
- قيّم mobile performance
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  }
];

// Agent-specific discussion prompts
const AGENT_PROMPTS: Record<string, string> = {
  backend_engineer: `أنت مهندس Backend خبير. ركز على:
- سلامة الـ schema والـ RPCs
- الـ atomicity والأمان
- race conditions محتملة
- اقترح حلولاً تقنية محددة مع Risk + Impact + Rollback`,

  system_architect: `أنت معماري نظام. ركز على:
- قابلية التوسع
- البنية العامة
- مخاطر طويلة المدى
- التكامل بين المكونات`,

  fraud_analyst: `أنت محلل احتيال. ابحث عن:
- ثغرات أمنية محتملة
- سيناريوهات إساءة الاستخدام
- multi-accounting
- اقترح آليات حماية`,

  qa_breaker: `أنت مختبر QA متخصص في كسر السيناريوهات. ابحث عن:
- edge cases غير معالجة
- مدخلات غريبة
- race conditions
- سيناريوهات فشل`,

  p2p_moderator: `أنت مشرف P2P. راقب:
- دورة حياة الطلبات
- أنماط النزاعات
- التحقق من الدفع
- إدارة الوقت`,

  leader_team: `أنت قائد فريق. راجع:
- صحة هيكل الفريق
- ظهور الأعضاء بشكل صحيح
- منطق المستويات`,

  android_engineer: `أنت مهندس Android. حلل من منظور:
- تجربة المستخدم على الموبايل
- الأداء والذاكرة
- توافق الإصدارات`,

  ios_engineer: `أنت مهندس iOS. راجع حسب:
- Apple Human Interface Guidelines
- أداء iOS
- توافق الأجهزة`,

  web_engineer: `أنت مهندس Web متخصص. ركز على:
- أداء React/TypeScript
- SEO والـ accessibility
- أفضل ممارسات PWA`,

  challenger_ai: `أنت "المتحدي" (Devil's Advocate) - دورك هو:
- تحدي كل الحلول المقترحة بشكل بناء
- طرح أسئلة استفزازية
- كشف نقاط الضعف في التفكير
- طرح سيناريوهات "ماذا لو"
- لا توافق بسهولة، ابحث عن الثغرات`,
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchSystemContext(supabase: any) {
  const [
    { count: totalUsers },
    { count: realUsers },
    { count: totalOrders },
    { count: disputedOrders },
    { count: activeContests },
    { count: totalTeamLinks },
    { count: openTickets },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_ai', false),
    supabase.from('p2p_orders').select('*', { count: 'exact', head: true }),
    supabase.from('p2p_orders').select('*', { count: 'exact', head: true }).eq('status', 'disputed'),
    supabase.from('contests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('team_members').select('*', { count: 'exact', head: true }),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  return {
    totalUsers: totalUsers || 0,
    realUsers: realUsers || 0,
    totalOrders: totalOrders || 0,
    disputedOrders: disputedOrders || 0,
    activeContests: activeContests || 0,
    totalTeamLinks: totalTeamLinks || 0,
    openTickets: openTickets || 0,
    timestamp: new Date().toISOString(),
  };
}

async function generateAgentAnalysis(
  apiKey: string,
  agent: any,
  topic: string,
  prompt: string,
  previousResponses: string[],
  turnNumber: number,
  systemContext: any
): Promise<string> {
  const agentPrompt = AGENT_PROMPTS[agent.agent_role] || 
    `أنت ${agent.agent_name_ar}. أجب من منظور دورك بدقة.`;

  const previousContext = previousResponses.length > 0
    ? `\n\nتحليلات الزملاء السابقة:\n${previousResponses.join('\n\n---\n\n')}\n\nالآن دورك. اقرأ ما قاله الآخرون أولاً، ثم أضف تحليلك من منظور دورك. لا تكرر.`
    : '';

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: `أنت ${agent.agent_name_ar} في فريق WINOVA الهندسي.
${agentPrompt}

📊 معلومات النظام الحالية:
- المستخدمين الحقيقيين: ${systemContext.realUsers}
- طلبات P2P: ${systemContext.totalOrders}
- النزاعات المفتوحة: ${systemContext.disputedOrders}
- المسابقات النشطة: ${systemContext.activeContests}
- تذاكر الدعم المفتوحة: ${systemContext.openTickets}

📌 قواعد Level 3 (Autonomous with Human Gate):
- حلل واكتشف المشاكل
- اقترح حلولاً مع Risk + Impact + Rollback
- أي تغيير = Proposal فقط، ليس تنفيذ
- التنفيذ يحتاج موافقة Admin
- ❌ ممنوع: Auto-Deploy، تعديل Production، حذف/تحديث مالي مباشر
- ✅ مسموح: Review + Suggest + Generate only

${previousContext}`,
        },
        {
          role: 'user',
          content: `الموضوع: ${topic}\n\n${prompt}\n\nدورك الآن (المتحدث ${turnNumber + 1}):`,
        },
      ],
      max_tokens: 700,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'لم أتمكن من التحليل.';
}

async function generateSessionSummary(
  apiKey: string,
  topic: string,
  responses: Array<{ agent: string; response: string }>
): Promise<{ summary: string; proposals: any[] }> {
  const responsesText = responses
    .map((r, i) => `[${i + 1}] ${r.agent}:\n${r.response}`)
    .join('\n\n---\n\n');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: `أنت منسق فريق AI في WINOVA (Level 3 Governance).

مهمتك:
1. تلخيص تحليلات الفريق
2. استخراج المشاكل المكتشفة
3. تجميع الحلول كـ Proposals مع تفاصيل كاملة

⚠️ قواعد Level 3:
- كل اقتراح = Proposal يحتاج موافقة Admin
- لا تنفيذ تلقائي أبداً
- وضح Risk + Impact + Rollback لكل proposal

أخرج JSON:
{
  "summary": "ملخص تنفيذي موجز",
  "proposals": [
    {
      "title": "عنوان الاقتراح",
      "description": "وصف الحل",
      "priority": "critical|high|medium|low",
      "area": "backend|frontend|security|ux|wallet|p2p|team",
      "risk_level": "high|medium|low",
      "impact_scope": "وصف نطاق التأثير",
      "rollback_plan": "خطة التراجع في حال الفشل",
      "estimated_effort": "small|medium|large",
      "suggested_by": "اسم الوكيل"
    }
  ]
}

باللغة العربية فقط.`,
        },
        {
          role: 'user',
          content: `الموضوع: ${topic}\n\nتحليلات الفريق:\n${responsesText}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.5,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  
  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[1] || jsonMatch?.[0] || '{}');
    return {
      summary: parsed.summary || 'لم أتمكن من إنشاء الملخص.',
      proposals: parsed.proposals || []
    };
  } catch {
    return { summary: content, proposals: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get request body (optional topic override)
    let topicId: string | null = null;
    try {
      const body = await req.json();
      topicId = body?.topic_id;
    } catch {
      // No body, use random topic
    }
    
    // Select topic
    const topic = topicId 
      ? ANALYSIS_TOPICS.find(t => t.id === topicId)
      : ANALYSIS_TOPICS[Math.floor(Math.random() * ANALYSIS_TOPICS.length)];
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting Level 3 scheduled discussion: ${topic.id}`);

    // Fetch system context
    const systemContext = await fetchSystemContext(supabase);

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('ai_discussion_sessions')
      .insert({
        trigger_type: 'scheduled',
        status: 'in_progress',
        discussion_topic: topic.topic,
        discussion_topic_ar: topic.topicAr,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Get relevant agents
    const { data: allAgents, error: agentsError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('is_active', true)
      .in('agent_role', topic.agents);

    if (agentsError) throw agentsError;

    const selectedAgents = allAgents || [];
    
    // Get system architect for session messages
    const systemArchitect = selectedAgents.find(a => a.agent_role === 'system_architect') || selectedAgents[0];
    if (!systemArchitect) {
      throw new Error('No agents available for discussion');
    }

    // Insert topic announcement
    await supabase.from('ai_chat_room').insert({
      agent_id: systemArchitect.id,
      content: `📋 جلسة تحليل مجدولة (Level 3)\n\n**الموضوع:** ${topic.topicAr}\n\n${topic.prompt}\n\n⚠️ جميع الاقتراحات ستحتاج موافقة Admin قبل التنفيذ.`,
      content_ar: `📋 جلسة تحليل مجدولة (Level 3)\n\n**الموضوع:** ${topic.topicAr}\n\n${topic.prompt}\n\n⚠️ جميع الاقتراحات ستحتاج موافقة Admin قبل التنفيذ.`,
      message_type: 'scheduled_topic',
      ai_session_id: session.id,
      turn_order: 0,
    });

    // Generate responses SEQUENTIALLY with delay (Turn-based, Deliberate Mode)
    const responses: Array<{ agent: string; agentId: string; response: string }> = [];
    const previousResponses: string[] = [];
    
    for (let i = 0; i < selectedAgents.length; i++) {
      const agent = selectedAgents[i];
      
      // Deliberate delay (5-10 seconds between responses)
      if (i > 0) {
        await delay(5000 + Math.random() * 5000);
      }

      const response = await generateAgentAnalysis(
        lovableApiKey,
        agent,
        topic.topicAr,
        topic.prompt,
        previousResponses,
        i,
        systemContext
      );
      
      responses.push({
        agent: agent.agent_name_ar,
        agentId: agent.id,
        response
      });
      
      previousResponses.push(`${agent.agent_name_ar}: ${response}`);

      // Insert agent response with turn order
      await supabase.from('ai_chat_room').insert({
        agent_id: agent.id,
        content: response,
        content_ar: response,
        message_type: 'analysis',
        ai_session_id: session.id,
        turn_order: i + 1,
        previous_context: previousResponses.slice(0, -1).join('\n---\n'),
      });
    }

    // Final delay before summary
    await delay(3000);

    // Generate summary with proposals
    const { summary, proposals } = await generateSessionSummary(
      lovableApiKey,
      topic.topicAr,
      responses.map(r => ({ agent: r.agent, response: r.response }))
    );

    // Insert summary
    await supabase.from('ai_chat_room').insert({
      agent_id: systemArchitect.id,
      content: `📋 ملخص جلسة التحليل (Level 3):\n\n${summary}\n\n⚠️ جميع الاقتراحات (${proposals.length}) تحتاج موافقة Admin قبل التنفيذ.\n❌ لا Auto-Deploy. ❌ لا تعديل مباشر.`,
      content_ar: `📋 ملخص جلسة التحليل (Level 3):\n\n${summary}\n\n⚠️ جميع الاقتراحات (${proposals.length}) تحتاج موافقة Admin قبل التنفيذ.\n❌ لا Auto-Deploy. ❌ لا تعديل مباشر.`,
      message_type: 'summary',
      ai_session_id: session.id,
      is_summary: true,
      turn_order: selectedAgents.length + 1,
      is_proposal: proposals.length > 0,
    });

    // Insert proposals with full Level 3 governance fields
    for (const proposal of proposals) {
      const proposingAgent = selectedAgents.find(a => 
        a.agent_name_ar === proposal.suggested_by || 
        a.agent_name === proposal.suggested_by
      );
      
      await supabase.from('ai_proposals').insert({
        session_id: session.id,
        title: proposal.title,
        title_ar: proposal.title,
        description: proposal.description,
        description_ar: proposal.description,
        proposal_type: 'enhancement',
        priority: proposal.priority || 'medium',
        affected_area: proposal.area,
        proposed_by: proposingAgent?.id || systemArchitect.id,
        status: 'pending',
        risk_level: proposal.risk_level || 'medium',
        impact_scope: proposal.impact_scope,
        rollback_plan: proposal.rollback_plan,
        estimated_effort: proposal.estimated_effort,
      });
    }

    // Update session
    await supabase
      .from('ai_discussion_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary,
        summary_ar: summary,
        messages_count: responses.length + 2,
        participants_count: selectedAgents.length,
        findings_count: 0,
        proposals_generated: proposals.length,
      })
      .eq('id', session.id);

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        topic: topic.id,
        agents_participated: responses.length,
        proposals_generated: proposals.length,
        governance: 'Level 3 - Human Gate Required',
        summary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('AI Discussion Scheduler Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

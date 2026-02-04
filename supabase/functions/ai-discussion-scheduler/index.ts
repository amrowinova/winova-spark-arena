import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AI Agent Analysis Prompts (Arabic)
const AGENT_PROMPTS: Record<string, string> = {
  user_tester: `أنت مستخدم عادي في منصة WINOVA. قم بتحليل تجربة المستخدم من منظور:
- سهولة التسجيل والدخول
- وضوح المحفظة والأرصدة
- تجربة المسابقات والتصويت
- سهولة P2P
اكتب ملاحظاتك بلغة مستخدم عادي.`,

  marketer_growth: `أنت مسوّق نمو في WINOVA. حلل:
- منطق الإحالات وفعاليته
- نمو الفرق
- وضوح onboarding
- لماذا لا ينمو الفريق؟
اقترح تحسينات للنمو.`,

  leader_team: `أنت قائد فريق في WINOVA. راجع:
- صحة هيكل الفريق (مباشر/غير مباشر)
- ظهور الأعضاء بشكل صحيح
- منطق المستويات
أبلغ عن أي خلل في team_members.`,

  manager_stats: `أنت مدير إحصائيات. تحقق من:
- دقة الأرقام في الداشبورد
- تطابق UI مع DB
- هل هناك بيانات وهمية؟
أبلغ عن أي تناقض.`,

  backend_engineer: `أنت مهندس backend خبير. حلل:
- سلامة الـ schema
- صحة RPCs والـ triggers
- الـ atomicity والأمان
- race conditions محتملة
اشرح السبب التقني بدقة واقترح إصلاحات.`,

  system_architect: `أنت معماري نظام. فكر في:
- سلامة النظام ككل
- قابلية التوسع
- مخاطر إساءة الاستخدام
- الاستقرار طويل المدى (6-12 شهر)
حذر من الأنماط الخطرة.`,

  qa_breaker: `أنت مختبر QA متخصص في كسر السيناريوهات. ابحث عن:
- edge cases غير معالجة
- مدخلات غريبة قد تكسر النظام
- race conditions
- أخطاء في validation
حاول إيجاد ثغرات.`,

  fraud_analyst: `أنت محلل احتيال. ابحث عن:
- ثغرات في المحفظة
- احتيال الإحالات
- multi-accounting
- التلاعب بالتصويت
اقترح آليات حماية.`,

  support_agent: `أنت وكيل دعم. حلل:
- المشاكل الشائعة للمستخدمين
- أنماط التذاكر المتكررة
- جودة الردود
- وقت الحل
اقترح حلول جذرية.`,

  power_user: `أنت مستخدم متقدم ونشط جداً. اختبر:
- كل الميزات المتقدمة
- حدود الاستخدام اليومي
- الأداء مع الاستخدام المكثف
- تجربة الموبايل
أبلغ عن أي مشاكل.`,

  contest_judge: `أنت حكم مسابقات. راقب:
- نزاهة التصويت
- توزيع الجوائز
- سلوك المشاركين
- توقيت المسابقات
أبلغ عن أي مخالفة.`,

  p2p_moderator: `أنت مشرف P2P. راقب:
- دورة حياة الطلبات
- أنماط النزاعات
- التحقق من الدفع
- إدارة الوقت
اقترح تحسينات للأمان.`,
};

interface AnalysisResult {
  agent_id: string;
  agent_name_ar: string;
  agent_role: string;
  analysis: string;
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

    // Create a new discussion session
    const { data: session, error: sessionError } = await supabase
      .from('ai_discussion_sessions')
      .insert({ trigger_type: 'scheduled', status: 'in_progress' })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Fetch all active AI agents
    const { data: agents, error: agentsError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('is_active', true);

    if (agentsError) throw agentsError;

    // Fetch system stats for context
    const systemContext = await fetchSystemContext(supabase);

    const analyses: AnalysisResult[] = [];

    // Each agent analyzes based on their role
    for (const agent of agents) {
      const prompt = AGENT_PROMPTS[agent.agent_role];
      if (!prompt) continue;

      const analysis = await generateAgentAnalysis(
        lovableApiKey,
        agent,
        prompt,
        systemContext
      );

      analyses.push({
        agent_id: agent.id,
        agent_name_ar: agent.agent_name_ar,
        agent_role: agent.agent_role,
        analysis,
      });

      // Insert individual analysis as chat message
      await supabase.from('ai_chat_room').insert({
        agent_id: agent.id,
        content: analysis,
        content_ar: analysis,
        message_type: 'analysis',
        session_id: session.id,
      });
    }

    // Generate discussion between agents
    const discussion = await generateDiscussion(lovableApiKey, analyses, systemContext);

    // Insert discussion messages
    for (const msg of discussion.messages) {
      const agent = agents.find(a => a.agent_role === msg.role);
      if (agent) {
        await supabase.from('ai_chat_room').insert({
          agent_id: agent.id,
          content: msg.content,
          content_ar: msg.content,
          message_type: 'discussion',
          session_id: session.id,
        });
      }
    }

    // Generate final summary
    const summary = await generateSummary(lovableApiKey, analyses, discussion);

    // Insert summary
    const summaryAgent = agents.find(a => a.agent_role === 'system_architect');
    if (summaryAgent) {
      await supabase.from('ai_chat_room').insert({
        agent_id: summaryAgent.id,
        content: summary.text,
        content_ar: summary.text,
        message_type: 'summary',
        session_id: session.id,
        is_summary: true,
      });
    }

    // Update session
    await supabase
      .from('ai_discussion_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        participants_count: agents.length,
        messages_count: analyses.length + discussion.messages.length + 1,
        summary_ar: summary.text,
        action_items: summary.actionItems,
      })
      .eq('id', session.id);

    // Log findings to ai_analysis_logs
    for (const item of summary.actionItems) {
      const relatedAgent = agents.find(a => a.agent_role === item.suggested_by);
      if (relatedAgent) {
        await supabase.from('ai_analysis_logs').insert({
          agent_id: relatedAgent.id,
          analysis_type: 'scheduled_review',
          title: item.title,
          title_ar: item.title,
          description: item.description,
          description_ar: item.description,
          severity: item.priority,
          affected_area: item.area,
          status: 'open',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        agents_participated: agents.length,
        findings: summary.actionItems.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('AI Discussion Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchSystemContext(supabase: any) {
  // Fetch real system stats for AI analysis
  const [
    { count: totalUsers },
    { count: realUsers },
    { count: aiUsers },
    { count: totalOrders },
    { count: disputedOrders },
    { count: activeContests },
    { count: totalTeamLinks },
    { count: openTickets },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_ai', false),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_ai', true),
    supabase.from('p2p_orders').select('*', { count: 'exact', head: true }),
    supabase.from('p2p_orders').select('*', { count: 'exact', head: true }).eq('status', 'disputed'),
    supabase.from('contests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('team_members').select('*', { count: 'exact', head: true }),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  // Fetch recent issues
  const { data: recentLogs } = await supabase
    .from('ai_analysis_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    stats: {
      totalUsers: totalUsers || 0,
      realUsers: realUsers || 0,
      aiUsers: aiUsers || 0,
      totalOrders: totalOrders || 0,
      disputedOrders: disputedOrders || 0,
      activeContests: activeContests || 0,
      totalTeamLinks: totalTeamLinks || 0,
      openTickets: openTickets || 0,
    },
    recentIssues: recentLogs || [],
    timestamp: new Date().toISOString(),
  };
}

async function generateAgentAnalysis(
  apiKey: string,
  agent: any,
  prompt: string,
  context: any
): Promise<string> {
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
          content: `أنت ${agent.agent_name_ar} في نظام WINOVA الداخلي.
${prompt}

معلومات النظام الحالية:
- إجمالي المستخدمين: ${context.stats.totalUsers}
- المستخدمين الحقيقيين: ${context.stats.realUsers}
- طلبات P2P: ${context.stats.totalOrders}
- النزاعات المفتوحة: ${context.stats.disputedOrders}
- المسابقات النشطة: ${context.stats.activeContests}
- روابط الفريق: ${context.stats.totalTeamLinks}
- تذاكر الدعم المفتوحة: ${context.stats.openTickets}

المشاكل الأخيرة المكتشفة:
${context.recentIssues.map((i: any) => `- ${i.title_ar || i.title}`).join('\n')}

اكتب تحليلك باللغة العربية فقط. كن محدداً ومختصراً.`,
        },
        {
          role: 'user',
          content: 'قدم تحليلك للنظام من منظور دورك.',
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'لم أتمكن من إجراء التحليل.';
}

async function generateDiscussion(
  apiKey: string,
  analyses: AnalysisResult[],
  context: any
): Promise<{ messages: Array<{ role: string; content: string }> }> {
  const analysisContext = analyses
    .map(a => `${a.agent_name_ar} (${a.agent_role}):\n${a.analysis}`)
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
          content: `أنت منسق نقاش بين فريق AI في WINOVA.
          
التحليلات الفردية:
${analysisContext}

قم بإنشاء نقاش قصير (4-6 رسائل) بين الأعضاء يتناقشون فيه حول:
1. أهم المشاكل المكتشفة
2. الأولويات
3. الحلول المقترحة

أرجع JSON بالشكل:
{
  "messages": [
    {"role": "backend_engineer", "content": "..."},
    {"role": "fraud_analyst", "content": "..."}
  ]
}

اللغة العربية فقط.`,
        },
        {
          role: 'user',
          content: 'ابدأ النقاش.',
        },
      ],
      max_tokens: 1000,
      temperature: 0.8,
    }),
  });

  const data = await response.json();
  try {
    const content = data.choices?.[0]?.message?.content || '{}';
    // Extract JSON from possible markdown code blocks
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[1] || jsonMatch?.[0] || '{"messages":[]}');
  } catch {
    return { messages: [] };
  }
}

async function generateSummary(
  apiKey: string,
  analyses: AnalysisResult[],
  discussion: { messages: Array<{ role: string; content: string }> }
): Promise<{ text: string; actionItems: Array<any> }> {
  const allContent = [
    ...analyses.map(a => `${a.agent_name_ar}: ${a.analysis}`),
    ...discussion.messages.map(m => `${m.role}: ${m.content}`),
  ].join('\n\n');

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
          content: `أنت ملخص اجتماعات فريق AI في WINOVA.
          
بناءً على التحليلات والنقاش:
${allContent}

أنشئ:
1. ملخص تنفيذي (فقرة واحدة)
2. قائمة Action Items

أرجع JSON:
{
  "text": "الملخص هنا...",
  "actionItems": [
    {
      "title": "عنوان المهمة",
      "description": "الوصف",
      "priority": "critical|high|medium|low",
      "area": "auth|wallet|p2p|team|contest|support",
      "suggested_by": "backend_engineer"
    }
  ]
}

اللغة العربية فقط.`,
        },
        {
          role: 'user',
          content: 'لخص الاجتماع.',
        },
      ],
      max_tokens: 1500,
      temperature: 0.5,
    }),
  });

  const data = await response.json();
  try {
    const content = data.choices?.[0]?.message?.content || '{}';
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[1] || jsonMatch?.[0] || '{"text":"","actionItems":[]}');
  } catch {
    return { text: 'لم أتمكن من إنشاء الملخص.', actionItems: [] };
  }
}

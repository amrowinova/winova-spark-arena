import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agent selection based on question context
const AGENT_KEYWORDS: Record<string, string[]> = {
  backend_engineer: ['backend', 'api', 'rpc', 'trigger', 'database', 'قاعدة', 'بيانات', 'خطأ', 'error', 'bug'],
  system_architect: ['architecture', 'scale', 'design', 'بنية', 'توسع', 'تصميم', 'نظام'],
  fraud_analyst: ['fraud', 'احتيال', 'أمان', 'security', 'ثغرة', 'hack'],
  qa_breaker: ['test', 'اختبار', 'سيناريو', 'edge case', 'كسر'],
  user_tester: ['ui', 'ux', 'تجربة', 'مستخدم', 'واجهة', 'user'],
  marketer_growth: ['growth', 'نمو', 'إحالة', 'referral', 'تسويق'],
  leader_team: ['team', 'فريق', 'هيكل', 'structure', 'مستوى'],
  manager_stats: ['stats', 'إحصائيات', 'أرقام', 'dashboard', 'لوحة'],
  support_agent: ['support', 'دعم', 'تذكرة', 'ticket', 'شكوى'],
  p2p_moderator: ['p2p', 'تداول', 'نزاع', 'dispute', 'طلب'],
  contest_judge: ['contest', 'مسابقة', 'تصويت', 'vote', 'فائز'],
  power_user: ['feature', 'ميزة', 'استخدام', 'usage', 'أداء'],
  android_engineer: ['android', 'أندرويد', 'mobile', 'موبايل', 'kotlin', 'app'],
  ios_engineer: ['ios', 'آيفون', 'apple', 'swift', 'iphone'],
  web_engineer: ['web', 'ويب', 'react', 'frontend', 'واجهة', 'seo', 'performance'],
  challenger_ai: ['تحدي', 'challenge', 'نقد', 'critique', 'ضعف', 'weakness'],
};

// Agent-specific prompts for turn-based discussion
const AGENT_DISCUSSION_PROMPTS: Record<string, string> = {
  backend_engineer: `أنت مهندس Backend خبير. ركز على:
- سلامة الـ schema والـ RPCs
- الـ atomicity والأمان
- race conditions محتملة
- اقترح حلولاً تقنية محددة`,

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

  android_engineer: `أنت مهندس Android. حلل من منظور:
- تجربة المستخدم على الموبايل
- الأداء والذاكرة
- توافق الإصدارات
- أفضل ممارسات Material Design`,

  ios_engineer: `أنت مهندس iOS. راجع حسب:
- Apple Human Interface Guidelines
- أداء iOS
- توافق الأجهزة
- متطلبات App Store`,

  web_engineer: `أنت مهندس Web متخصص. ركز على:
- أداء React/TypeScript
- SEO والـ accessibility
- تجربة المستخدم على الويب
- أفضل ممارسات PWA`,

  challenger_ai: `أنت "المتحدي" - دورك هو:
- تحدي كل الحلول المقترحة
- طرح أسئلة استفزازية بناءة
- كشف نقاط الضعف في التفكير
- طرح سيناريوهات "ماذا لو"
- لا توافق بسهولة، ابحث عن الثغرات`,
};

function selectRelevantAgents(question: string, allAgents: any[]): any[] {
  const questionLower = question.toLowerCase();
  const scores: Map<string, number> = new Map();
  
  // Score each agent based on keyword matches
  for (const agent of allAgents) {
    const keywords = AGENT_KEYWORDS[agent.agent_role] || [];
    let score = 0;
    for (const keyword of keywords) {
      if (questionLower.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    scores.set(agent.id, score);
  }
  
  // Sort by score and take top 5
  const sorted = allAgents.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
  const withScores = sorted.filter(a => (scores.get(a.id) || 0) > 0);
  
  if (withScores.length >= 3) {
    // Always include challenger for critical thinking
    const challenger = allAgents.find(a => a.agent_role === 'challenger_ai');
    const result = withScores.slice(0, 4);
    if (challenger && !result.find(a => a.id === challenger.id)) {
      result.push(challenger);
    }
    return result.slice(0, 5);
  }
  
  // Default: backend + architect + web + challenger
  const defaults = ['backend_engineer', 'system_architect', 'web_engineer', 'challenger_ai'];
  return allAgents.filter(a => defaults.includes(a.agent_role));
}

// Delay function for deliberate mode
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateAgentResponse(
  apiKey: string,
  agent: any,
  question: string,
  previousResponses: string[],
  turnNumber: number
): Promise<string> {
  const agentPrompt = AGENT_DISCUSSION_PROMPTS[agent.agent_role] || 
    `أنت ${agent.agent_name_ar}. أجب من منظور دورك بدقة.`;

  const previousContext = previousResponses.length > 0
    ? `\n\nردود الزملاء السابقة:\n${previousResponses.join('\n\n---\n\n')}\n\nالآن دورك للرد. خذ بعين الاعتبار ما قاله الآخرون، لا تكرر، وأضف قيمة جديدة.`
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

📌 قواعد النقاش:
- هذا نقاش هندسي عميق، ليس chat سريع
- اقرأ ردود زملائك قبل الرد
- لا تكرر ما قالوه، أضف زاوية جديدة
- كن محدداً وعملياً
- اقترح حلولاً قابلة للتنفيذ فقط
- أي تعديل تقترحه = اقتراح (Proposal) وليس قرار نهائي
- التنفيذ يحتاج موافقة Admin
- استخدم اللغة العربية فقط
${previousContext}`,
        },
        {
          role: 'user',
          content: `سؤال المدير: ${question}\n\nدورك الآن (المتحدث ${turnNumber + 1}):`,
        },
      ],
      max_tokens: 600,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'لم أتمكن من الرد.';
}

async function generateProposalSummary(
  apiKey: string,
  question: string,
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
          content: `أنت منسق فريق AI في WINOVA. مهمتك:
1. تلخيص نقاش الفريق الهندسي
2. استخراج الاقتراحات (Proposals) القابلة للتنفيذ
3. تصنيف كل اقتراح حسب الأولوية

السؤال الأصلي: ${question}

النقاش:
${responsesText}

أخرج JSON بالشكل التالي:
{
  "summary": "ملخص تنفيذي موجز...",
  "proposals": [
    {
      "title": "عنوان الاقتراح",
      "description": "وصف مختصر",
      "priority": "critical|high|medium|low",
      "area": "backend|frontend|security|ux|infrastructure",
      "suggested_by": "اسم الوكيل"
    }
  ]
}

⚠️ مهم: كل اقتراح يحتاج موافقة Admin قبل التنفيذ.
باللغة العربية فقط.`,
        },
        {
          role: 'user',
          content: 'لخص النقاش واستخرج الاقتراحات.',
        },
      ],
      max_tokens: 1000,
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
    
    // Get auth header for user verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user has access
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check access
    const { data: hasAccess } = await supabase.rpc('can_access_ai_control_room', {
      p_user_id: user.id
    });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { question } = await req.json();
    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create session with sequential mode
    const { data: session, error: sessionError } = await supabase
      .from('ai_human_sessions')
      .insert({
        question,
        asked_by: user.id,
        status: 'processing',
        response_mode: 'sequential'
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Get active agents
    const { data: allAgents, error: agentsError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('is_active', true);

    if (agentsError) throw agentsError;

    // Select relevant agents
    const selectedAgents = selectRelevantAgents(question, allAgents || []);
    const agentsOrder = selectedAgents.map(a => a.id);

    // Update session with agents order
    await supabase
      .from('ai_human_sessions')
      .update({ agents_order: agentsOrder })
      .eq('id', session.id);

    // Get a default agent for the human question message
    const systemArchitect = allAgents?.find(a => a.agent_role === 'system_architect');
    if (!systemArchitect) throw new Error('System architect not found');

    // Insert the human question as a message
    await supabase.from('ai_chat_room').insert({
      agent_id: systemArchitect.id,
      content: `❓ سؤال من المدير:\n\n${question}`,
      content_ar: `❓ سؤال من المدير:\n\n${question}`,
      message_type: 'human_question',
      session_id: session.id,
      human_sender_id: user.id,
      turn_order: 0,
    });

    // Generate responses SEQUENTIALLY with delay (Turn-based, Deliberate Mode)
    const responses: Array<{ agent: string; agentId: string; response: string }> = [];
    const previousResponses: string[] = [];
    
    for (let i = 0; i < selectedAgents.length; i++) {
      const agent = selectedAgents[i];
      
      // Deliberate delay between responses (5-8 seconds)
      if (i > 0) {
        await delay(5000 + Math.random() * 3000);
      }

      // Generate response with context of previous responses
      const response = await generateAgentResponse(
        lovableApiKey, 
        agent, 
        question,
        previousResponses,
        i
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
        message_type: 'human_response',
        session_id: session.id,
        turn_order: i + 1,
        previous_context: previousResponses.slice(0, -1).join('\n---\n'),
      });
    }

    // Final delay before summary
    await delay(3000);

    // Generate summary with proposals
    const { summary, proposals } = await generateProposalSummary(
      lovableApiKey,
      question,
      responses.map(r => ({ agent: r.agent, response: r.response }))
    );

    // Insert summary
    await supabase.from('ai_chat_room').insert({
      agent_id: systemArchitect.id,
      content: `📋 ملخص الفريق:\n\n${summary}\n\n⚠️ جميع الاقتراحات تحتاج موافقة Admin قبل التنفيذ.`,
      content_ar: `📋 ملخص الفريق:\n\n${summary}\n\n⚠️ جميع الاقتراحات تحتاج موافقة Admin قبل التنفيذ.`,
      message_type: 'summary',
      session_id: session.id,
      is_summary: true,
      turn_order: selectedAgents.length + 1,
      is_proposal: proposals.length > 0,
    });

    // Insert proposals into ai_proposals table
    for (const proposal of proposals) {
      const proposingAgent = allAgents?.find(a => 
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
      });
    }

    // Update session
    await supabase
      .from('ai_human_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary_ar: summary
      })
      .eq('id', session.id);

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        agents_responded: responses.length,
        proposals_count: proposals.length,
        summary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('AI Human Question Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

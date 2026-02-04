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
  
  // Sort by score and take top 4, or at least 2 if no matches
  const sorted = allAgents.sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
  const withScores = sorted.filter(a => (scores.get(a.id) || 0) > 0);
  
  if (withScores.length >= 2) {
    return withScores.slice(0, 4);
  }
  
  // Default: backend engineer + system architect + 2 random
  const defaults = ['backend_engineer', 'system_architect'];
  const defaultAgents = allAgents.filter(a => defaults.includes(a.agent_role));
  const others = allAgents.filter(a => !defaults.includes(a.agent_role)).slice(0, 2);
  return [...defaultAgents, ...others];
}

async function generateAgentResponse(
  apiKey: string,
  agent: any,
  question: string
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
          content: `أنت ${agent.agent_name_ar} في فريق WINOVA الداخلي.
دورك: ${agent.agent_role}
مجالات تركيزك: ${agent.focus_areas?.join('، ') || 'عام'}

أجب على سؤال المدير من منظور دورك بدقة واختصار.
- كن محدداً وعملياً
- اقترح حلولاً قابلة للتنفيذ
- استخدم اللغة العربية فقط
- لا تكرر ما قد يقوله غيرك`,
        },
        {
          role: 'user',
          content: question,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'لم أتمكن من الرد.';
}

async function generateSummary(
  apiKey: string,
  question: string,
  responses: Array<{ agent: string; response: string }>
): Promise<string> {
  const responsesText = responses
    .map(r => `${r.agent}:\n${r.response}`)
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
          content: `أنت منسق فريق AI في WINOVA. لخص ردود الفريق على سؤال المدير.

السؤال الأصلي: ${question}

ردود الفريق:
${responsesText}

اكتب ملخصاً تنفيذياً يتضمن:
1. النقاط الرئيسية المتفق عليها
2. التوصيات العملية
3. الخطوات التالية المقترحة

باللغة العربية فقط. كن موجزاً ومفيداً.`,
        },
        {
          role: 'user',
          content: 'لخص الردود.',
        },
      ],
      max_tokens: 500,
      temperature: 0.5,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'لم أتمكن من إنشاء الملخص.';
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

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('ai_human_sessions')
      .insert({
        question,
        asked_by: user.id,
        status: 'processing'
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
    });

    // Generate responses from each selected agent
    const responses: Array<{ agent: string; agentId: string; response: string }> = [];
    
    for (const agent of selectedAgents) {
      const response = await generateAgentResponse(lovableApiKey, agent, question);
      responses.push({
        agent: agent.agent_name_ar,
        agentId: agent.id,
        response
      });

      // Insert agent response
      await supabase.from('ai_chat_room').insert({
        agent_id: agent.id,
        content: response,
        content_ar: response,
        message_type: 'human_response',
        session_id: session.id,
      });
    }

    // Generate summary
    const summary = await generateSummary(
      lovableApiKey,
      question,
      responses.map(r => ({ agent: r.agent, response: r.response }))
    );

    // Insert summary
    await supabase.from('ai_chat_room').insert({
      agent_id: systemArchitect.id,
      content: `📋 ملخص الفريق:\n\n${summary}`,
      content_ar: `📋 ملخص الفريق:\n\n${summary}`,
      message_type: 'summary',
      session_id: session.id,
      is_summary: true,
    });

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

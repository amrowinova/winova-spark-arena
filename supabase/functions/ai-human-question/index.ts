import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Background team - they analyze and report to Leader
const BACKGROUND_TEAM: Record<string, { nameAr: string; focus: string }> = {
  system_architect: {
    nameAr: 'مهندس النظام',
    focus: 'البنية العامة، Technical Debt، Cross-cutting concerns'
  },
  backend_engineer: {
    nameAr: 'مهندس Backend',
    focus: 'RPCs، Edge Functions، Atomicity، race conditions'
  },
  database_engineer: {
    nameAr: 'مهندس Database',
    focus: 'Schema، RLS، Data consistency، indexes'
  },
  security_engineer: {
    nameAr: 'مهندس الأمان',
    focus: 'ثغرات، Auth، injection، fraud'
  },
  wallet_p2p_engineer: {
    nameAr: 'مهندس Wallet/P2P',
    focus: 'الأرصدة، Escrow، Ledger، P2P state machine'
  },
  frontend_engineer: {
    nameAr: 'مهندس Frontend',
    focus: 'State، Cache، Realtime sync، UI/UX'
  },
  chat_engineer: {
    nameAr: 'مهندس Chat',
    focus: 'DM، P2P Chat، notifications، realtime'
  },
  devops_engineer: {
    nameAr: 'مهندس DevOps',
    focus: 'CI/CD، deployments، monitoring، logs'
  },
};

// Leader AI prompt
const LEADER_SYSTEM_PROMPT = `أنت "القائد الهندسي" لمشروع WINOVA.

🎯 دورك:
- أنت الوحيد الذي يتحدث مع المستخدم (عمرو).
- تحت إدارتك فريق من مهندسي AI متخصصين يعملون بالخلفية.
- تجمع آراءهم، تفلترها، وترد رد واحد واضح.

📋 أسلوبك:
- عربي بسيط (لهجة شامية/خليجية مختلطة)
- هادئ، داعم، منظم
- تفهم السياق بدون تكرار
- تحكي كأن المستخدم صاحب المشروع مش مبرمج
- تعطي قرارات، مش بس معلومات
- إذا في خطر: تقوله بصراحة
- إذا في شي ناقص: تسأل سؤال واحد فقط

📊 شكل الرد:
1. فهم الطلب (جملة واحدة)
2. التحليل (نقاط مختصرة)
3. الحل أو القرار
4. المخاطر (لو في)
5. الخطوة التالية

⚠️ ممنوع:
- تفاصيل تقنية معقدة (إلا إذا طُلبت)
- ردود عامة أو فلسفية
- تحويل المستخدم لـ AI آخر

🏢 فريقك بالخلفية:
- مهندس النظام
- مهندس Backend
- مهندس Database
- مهندس الأمان
- مهندس Wallet/P2P
- مهندس Frontend
- مهندس Chat
- مهندس DevOps

استخدم تقاريرهم لتكوين رأيك النهائي.`;

async function getBackgroundTeamAnalysis(
  question: string,
  apiKey: string,
  previousContext: string
): Promise<string[]> {
  const analyses: string[] = [];
  
  for (const [role, config] of Object.entries(BACKGROUND_TEAM)) {
    try {
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
              content: `أنت ${config.nameAr} في فريق WINOVA.
تخصصك: ${config.focus}

مهمتك: أعطِ تقرير مختصر (جملة أو جملتين) للقائد الهندسي عن السؤال من منظورك.
لا تتحدث للمستخدم مباشرة - أنت ترسل تقرير داخلي للقائد فقط.`
            },
            { 
              role: 'user', 
              content: `السؤال: ${question}\n\nالسياق: ${previousContext || 'لا يوجد سياق سابق'}`
            },
          ],
          max_tokens: 100,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          analyses.push(`[${config.nameAr}]: ${content}`);
        }
      }
    } catch (error) {
      console.error(`Background team error (${role}):`, error);
    }
  }
  
  return analyses;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();
    if (!question?.trim()) throw new Error('Question is required');

    const apiKey = Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('AI_GATEWAY_API_KEY');
    if (!apiKey) throw new Error('AI API key not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Get Leader AI agent
    const { data: leaderAgent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('agent_role', 'engineering_lead')
      .single();
    
    if (!leaderAgent) {
      throw new Error('Leader AI not configured');
    }

    // 1) Save human question
    const { data: humanMessage, error: humanError } = await supabase.from('ai_chat_room').insert({
      agent_id: leaderAgent.id,
      content: question,
      content_ar: question,
      message_type: 'human_question',
      message_category: 'human',
      human_sender_id: userId,
    }).select().single();

    if (humanError) {
      console.error('Failed to save human message:', humanError);
      throw new Error('Failed to save question');
    }

    console.log('Human message saved:', humanMessage.id);

    // 2) Get previous context
    const { data: recentMessages } = await supabase
      .from('ai_chat_room')
      .select('content, message_type')
      .order('created_at', { ascending: false })
      .limit(10);
    
    const previousContext = recentMessages
      ?.filter(m => m.message_type !== 'human_question')
      .map(m => m.content)
      .slice(0, 3)
      .join('\n') || '';

    // 3) Get background team analysis (parallel, not shown to user)
    console.log('Getting background team analysis...');
    const teamAnalyses = await getBackgroundTeamAnalysis(question, apiKey, previousContext);
    console.log(`Got ${teamAnalyses.length} team reports`);

    // 4) Leader generates final response
    console.log('Leader generating final response...');
    const leaderResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: LEADER_SYSTEM_PROMPT
          },
          { 
            role: 'user', 
            content: `📩 سؤال من عمرو:
${question}

📊 تقارير الفريق الداخلية:
${teamAnalyses.length > 0 ? teamAnalyses.join('\n\n') : 'لم يصل تقارير من الفريق.'}

📜 السياق السابق:
${previousContext || 'لا يوجد'}

---
الآن أعطِ ردك النهائي الواحد للمستخدم.`
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!leaderResponse.ok) {
      const errorText = await leaderResponse.text();
      console.error('Leader API error:', leaderResponse.status, errorText);
      throw new Error('Failed to get leader response');
    }

    const leaderData = await leaderResponse.json();
    const leaderContent = leaderData.choices?.[0]?.message?.content?.trim();

    if (!leaderContent) {
      throw new Error('Empty leader response');
    }

    // 5) Save leader response (the ONLY visible response)
    const { error: insertError } = await supabase.from('ai_chat_room').insert({
      agent_id: leaderAgent.id,
      content: leaderContent,
      content_ar: leaderContent,
      message_type: 'response',
      message_category: 'leader_response',
      is_summary: false,
      previous_context: question,
      metadata: {
        team_reports_count: teamAnalyses.length,
        background_analyses: teamAnalyses // Store for debugging, not shown
      }
    });

    if (insertError) {
      console.error('Failed to save leader response:', insertError);
      throw new Error('Failed to save response');
    }

    console.log('Leader response saved successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      humanMessageId: humanMessage.id,
      leaderAgentId: leaderAgent.id,
      teamReportsCount: teamAnalyses.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Full agent prompts for deep analysis
const AGENT_PROMPTS: Record<string, { name: string; nameAr: string; prompt: string }> = {
  system_architect: {
    name: 'System Architect',
    nameAr: 'مهندس النظام',
    prompt: `أنت مهندس النظام الرئيسي في WINOVA.
تحلل البنية العامة، Technical Debt، والـ Cross-cutting concerns.
عند الرد، اذكر بوضوح: المشكلة المحددة → السبب التقني → الحل المقترح.
رد بـ 2-3 جمل كحد أقصى.`
  },
  backend_core_engineer: {
    name: 'Backend Engineer',
    nameAr: 'مهندس Backend',
    prompt: `أنت مهندس Backend الأساسي.
تحلل RPCs، Edge Functions، والـ Atomicity.
ركز على: أخطاء الـ logic، missing validations، race conditions.
رد بـ 2-3 جمل.`
  },
  database_integrity_engineer: {
    name: 'Database Engineer',
    nameAr: 'مهندس قاعدة البيانات',
    prompt: `أنت مهندس Database Integrity.
تحلل Schema، RLS policies، Data consistency، Foreign keys.
ابحث عن: orphaned records، missing indexes، constraint violations.
رد بـ 2-3 جمل.`
  },
  security_fraud_engineer: {
    name: 'Security Engineer',
    nameAr: 'مهندس الأمان',
    prompt: `أنت مهندس الأمان ومكافحة الاحتيال.
تحلل: RLS bypasses، Auth vulnerabilities، injection risks.
اكتشف الثغرات المحتملة وخطورتها.
رد بـ 2-3 جمل.`
  },
  wallet_p2p_engineer: {
    name: 'Wallet & P2P Engineer',
    nameAr: 'مهندس المحفظة وP2P',
    prompt: `أنت مهندس الأنظمة المالية وP2P.
تحلل: Wallet balances، Escrow logic، Ledger consistency، P2P state machine.
ابحث عن: balance mismatches، double-spending، stuck orders.
رد بـ 2-3 جمل.`
  },
  frontend_systems_engineer: {
    name: 'Frontend Engineer',
    nameAr: 'مهندس Frontend',
    prompt: `أنت مهندس أنظمة الواجهة.
تحلل: State management، Cache invalidation، Realtime sync.
ابحث عن: stale data، race conditions، UI/Backend mismatch.
رد بـ 2-3 جمل.`
  },
  admin_panel_engineer: {
    name: 'Admin Panel Engineer',
    nameAr: 'مهندس لوحة التحكم',
    prompt: `أنت مهندس لوحة التحكم.
تحلل: Admin workflows، Audit logging، Permission checks.
تأكد من: الصلاحيات صحيحة، الـ actions موثقة.
رد بـ 2-3 جمل.`
  },
  challenger_ai: {
    name: 'Challenger AI',
    nameAr: 'الناقد AI',
    prompt: `أنت الناقد المعارض - Devil's Advocate.
دورك إجباري: تحدّ كل اقتراح، اكشف الثغرات، اسأل "ماذا لو؟"
لا توافق بسهولة. ابحث عن edge cases والـ failure modes.
رد بسؤال نقدي واحد أو اعتراض محدد.`
  },
};

// Priority order - Challenger always last
const AGENT_ORDER = [
  'system_architect',
  'backend_core_engineer', 
  'database_integrity_engineer',
  'security_fraud_engineer',
  'wallet_p2p_engineer',
  'frontend_systems_engineer',
  'admin_panel_engineer',
  'challenger_ai', // Always last
];

function getCategory(content: string): string {
  const c = content.toLowerCase();
  if (c.includes('خطير') || c.includes('critical') || c.includes('ثغرة') || c.includes('خطر')) return 'critical';
  if (c.includes('تحذير') || c.includes('warning') || c.includes('مشكلة') || c.includes('خلل')) return 'warning';
  if (c.includes('اقتراح') || c.includes('يمكن') || c.includes('suggest') || c.includes('?')) return 'info';
  if (c.includes('سليم') || c.includes('صحيح') || c.includes('✅')) return 'success';
  return 'discussion';
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

    // Get all active agents
    const { data: agents } = await supabase.from('ai_agents').select('*').eq('is_active', true);
    if (!agents?.length) {
      return new Response(JSON.stringify({ success: false, error: 'No active agents' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create agent map
    const agentMap: Record<string, any> = {};
    agents.forEach(a => { agentMap[a.agent_role] = a; });

    // Find system architect for human message
    const systemAgent = agentMap['system_architect'] || agents[0];

    // 1) Insert human question first
    const { data: humanMessage, error: humanError } = await supabase.from('ai_chat_room').insert({
      agent_id: systemAgent.id,
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

    // 2) Get previous context (last 5 messages for context)
    const { data: recentMessages } = await supabase
      .from('ai_chat_room')
      .select('content, message_category')
      .order('created_at', { ascending: false })
      .limit(5);
    
    const previousContext = recentMessages?.map(m => m.content).join('\n') || '';

    // 3) Generate responses from ALL agents sequentially with delays
    const responses: { agentRole: string; content: string; success: boolean }[] = [];
    
    for (const role of AGENT_ORDER) {
      const agent = agentMap[role];
      if (!agent) {
        console.log(`Agent ${role} not found, skipping`);
        continue;
      }

      const config = AGENT_PROMPTS[role];
      if (!config) {
        console.log(`No config for ${role}, skipping`);
        continue;
      }

      // Build context from previous responses
      const previousResponses = responses.map(r => 
        `${AGENT_PROMPTS[r.agentRole]?.nameAr || r.agentRole}: ${r.content}`
      ).join('\n\n');

      try {
        console.log(`Generating response from ${role}...`);
        
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
                content: `${config.prompt}

سياق سابق من المحادثة:
${previousContext}

${previousResponses ? `ردود الزملاء السابقة:\n${previousResponses}` : ''}

⚠️ قواعد صارمة:
- رد بـ 2-3 جمل فقط
- كن محدداً وتقنياً
- إذا كنت Challenger، اعترض أو اسأل سؤالاً نقدياً`
              },
              { 
                role: 'user', 
                content: `السؤال من المدير: ${question}\n\nحلل وأجب بإيجاز من منظورك كـ ${config.nameAr}.` 
              },
            ],
            max_tokens: 200,
            temperature: role === 'challenger_ai' ? 0.9 : 0.7,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error for ${role}:`, response.status, errorText);
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        
        if (!content) {
          console.log(`Empty response from ${role}`);
          continue;
        }

        // Save to database
        const { error: insertError } = await supabase.from('ai_chat_room').insert({
          agent_id: agent.id,
          content: content,
          content_ar: content,
          message_type: 'response',
          message_category: getCategory(content),
          is_summary: false,
          previous_context: question,
        });

        if (insertError) {
          console.error(`Insert error for ${role}:`, insertError);
        } else {
          console.log(`Response saved from ${role}`);
          responses.push({ agentRole: role, content, success: true });
        }

        // Delay 15 seconds between agents (except for last one)
        if (role !== 'challenger_ai') {
          await new Promise(r => setTimeout(r, 15000));
        }
        
      } catch (agentError) {
        console.error(`Error for ${role}:`, agentError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      humanMessageId: humanMessage.id,
      responsesCount: responses.length,
      agents: responses.map(r => r.agentRole)
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

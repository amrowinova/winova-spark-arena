import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Short response prompts
const AGENT_PROMPTS: Record<string, string> = {
  system_architect: 'مهندس النظام. تحلل البنية. رد بجملة أو جملتين فقط.',
  backend_core_engineer: 'مهندس Backend. تحلل RPCs. رد بجملة أو جملتين فقط.',
  database_integrity_engineer: 'مهندس DB. تحلل Schema. رد بجملة أو جملتين فقط.',
  security_fraud_engineer: 'مهندس أمان. تحلل الثغرات. رد بجملة أو جملتين فقط.',
  wallet_p2p_engineer: 'مهندس مالي. تحلل Ledger. رد بجملة أو جملتين فقط.',
  frontend_systems_engineer: 'مهندس Frontend. تحلل State. رد بجملة أو جملتين فقط.',
  admin_panel_engineer: 'مهندس Admin. تحلل Audit. رد بجملة أو جملتين فقط.',
  challenger_ai: 'الناقد. تتحدى. سؤال واحد فقط.',
};

function getCategory(content: string): string {
  const c = content.toLowerCase();
  if (c.includes('خطير') || c.includes('ثغرة')) return 'critical';
  if (c.includes('تحذير') || c.includes('مشكلة')) return 'warning';
  if (c.includes('اقتراح') || c.includes('يمكن')) return 'info';
  return 'discussion';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();
    if (!question) throw new Error('Question is required');

    // Use LOVABLE_API_KEY (auto-provisioned) or fallback to AI_GATEWAY_API_KEY
    const apiKey = Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('AI_GATEWAY_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

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

    // Insert human question
    const systemAgent = (await supabase.from('ai_agents').select('id').eq('agent_role', 'system_architect').single()).data;
    
    await supabase.from('ai_chat_room').insert({
      agent_id: systemAgent?.id || '00000000-0000-0000-0000-000000000000',
      content: question,
      content_ar: question,
      message_type: 'human_question',
      message_category: 'human',
      human_sender_id: userId,
    });

    // Get active agents
    const { data: agents } = await supabase.from('ai_agents').select('*').eq('is_active', true);
    if (!agents?.length) {
      return new Response(JSON.stringify({ success: true, message: 'No agents' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pick 3-4 relevant agents
    const selectedAgents = agents.slice(0, 4);

    // Generate short responses
    for (const agent of selectedAgents) {
      await new Promise(r => setTimeout(r, 2000)); // 2s delay between agents
      
      const prompt = AGENT_PROMPTS[agent.agent_role] || 'مهندس WINOVA. رد قصير جداً.';
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: `أنت ${prompt}\n\n⚠️ قاعدة صارمة: ردك جملة أو جملتين فقط. لا تطل.` },
            { role: 'user', content: `السؤال: ${question}\n\nأجب بإيجاز شديد.` },
          ],
          max_tokens: 120,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || 'لا توجد ملاحظات.';
      
      await supabase.from('ai_chat_room').insert({
        agent_id: agent.id,
        content: content,
        content_ar: content,
        message_type: 'response',
        message_category: getCategory(content),
        is_summary: false,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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

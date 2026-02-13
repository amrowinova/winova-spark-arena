import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ghost agent personas mapped to WINOVA ranks
const PERSONAS: Record<string, { nameAr: string; traits: string }> = {
  marketer: {
    nameAr: 'مسوّق',
    traits: 'enthusiastic about referrals, always looking for ways to grow the team, talks about commissions and bonuses',
  },
  leader: {
    nameAr: 'قائد',
    traits: 'strategic thinker, mentors others, discusses team performance and growth tactics',
  },
  subscriber: {
    nameAr: 'مشترك',
    traits: 'new user, asks basic questions, confused about features, excited about earning Nova',
  },
  trader: {
    nameAr: 'تاجر',
    traits: 'focused on P2P trades, talks about prices, payment methods, disputes, and trust ratings',
  },
  critic: {
    nameAr: 'ناقد',
    traits: 'complains about UX friction, slow loading, confusing navigation, suggests improvements',
  },
  whale: {
    nameAr: 'حوت',
    traits: 'high-volume trader, discusses large transactions, worried about security and wallet limits',
  },
};

const PERSONA_KEYS = Object.keys(PERSONAS);

function pick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Conversation topic templates
const TOPICS = [
  'تجربتك مع تداول النوڤا P2P — هل واجهت مشاكل؟',
  'ما رأيك بنظام الإحالات والعمولات؟',
  'كيف تقيّم أمان المحفظة الرقمية؟',
  'ما الميزة اللي تتمنى تنضاف للتطبيق؟',
  'هل واجهت مشكلة مع التحقق من الحساب؟',
  'ما أفضل استراتيجية لتنمية الفريق؟',
  'كيف تتعامل مع النزاعات في التداول؟',
  'رأيك في المسابقات الأسبوعية — عادلة؟',
  'تجربة الدردشة داخل التطبيق — سلسة ولا فيها مشاكل؟',
  'ما أكبر عائق واجهته كمستخدم جديد؟',
  'هل النظام يكافئ المستخدمين النشطين بشكل كافٍ؟',
  'تجربتك مع خدمة الدعم الفني — سريعة؟',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // SECURITY: Mandatory admin auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
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

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: any = {};
    try { body = await req.json(); } catch (_) {}
    const chatCount = Math.min(body.chat_count || 30, 60); // max 60 conversations per run
    const messagesPerChat = Math.min(body.messages_per_chat || 4, 8);

    // Fetch ghost agents
    const { data: ghosts } = await adminClient
      .from('profiles').select('id, user_id, username, name')
      .like('username', 'ghost_agent_%').limit(200);

    if (!ghosts || ghosts.length < 4) {
      return new Response(JSON.stringify({ error: 'Need at least 4 ghost agents. Deploy first.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const startTime = Date.now();
    const conversationsCreated: string[] = [];
    const messagesSent: number[] = [];
    const errors: string[] = [];

    // Create conversation pairs
    const pairs: Array<{ a: typeof ghosts[0]; b: typeof ghosts[0]; personaA: string; personaB: string; topic: string }> = [];

    for (let i = 0; i < chatCount; i++) {
      const [a, b] = pick(ghosts, 2);
      if (a.user_id === b.user_id) continue;
      pairs.push({
        a, b,
        personaA: pickOne(PERSONA_KEYS),
        personaB: pickOne(PERSONA_KEYS),
        topic: pickOne(TOPICS),
      });
    }

    // Process in batches of 5 to avoid rate limits
    const BATCH_SIZE = 5;
    for (let batchStart = 0; batchStart < pairs.length; batchStart += BATCH_SIZE) {
      const batch = pairs.slice(batchStart, batchStart + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (pair) => {
          const { a, b, personaA, personaB, topic } = pair;
          const pA = PERSONAS[personaA];
          const pB = PERSONAS[personaB];

          // Generate conversation via LLM
          const systemPrompt = `أنت محرك محاكاة اجتماعية لتطبيق WINOVA (تطبيق مالي اجتماعي عربي).

أنشئ محادثة طبيعية باللهجة العربية بين مستخدمَين:

المستخدم الأول: "${a.name || a.username}" — دوره: ${pA.nameAr} (${pA.traits})
المستخدم الثاني: "${b.name || b.username}" — دوره: ${pB.nameAr} (${pB.traits})

الموضوع: ${topic}

القواعد:
- اكتب ${messagesPerChat} رسائل بالتناوب (تبدأ بالمستخدم الأول)
- اللغة: عربية عامية طبيعية (مزيج فصحى وعامية خليجية)
- كل رسالة 1-3 جمل فقط
- اجعل المحادثة واقعية: اتفاق، اختلاف، أسئلة، شكاوى، نصائح
- لا تكتب أسماء المستخدمين قبل الرسائل
- أرجع النتيجة كـ JSON array فقط: ["رسالة1", "رسالة2", ...]
- لا تضف أي نص خارج الـ JSON`;

          try {
            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: `أنشئ المحادثة الآن عن: ${topic}` },
                ],
                temperature: 0.9,
              }),
            });

            if (!aiResponse.ok) {
              const errText = await aiResponse.text();
              throw new Error(`AI gateway ${aiResponse.status}: ${errText.substring(0, 200)}`);
            }

            const aiData = await aiResponse.json();
            const rawContent = aiData.choices?.[0]?.message?.content || '[]';

            // Parse messages from LLM response
            let messages: string[] = [];
            try {
              // Extract JSON array from response (handle markdown code blocks)
              const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                messages = JSON.parse(jsonMatch[0]);
              }
            } catch {
              // Fallback: split by newlines
              messages = rawContent.split('\n').filter((l: string) => l.trim().length > 5).slice(0, messagesPerChat);
            }

            if (messages.length === 0) return { sent: 0, error: 'Empty AI response' };

            // Find or create conversation
            const { data: existingConv } = await adminClient
              .from('conversations').select('id')
              .or(`and(participant1_id.eq.${a.user_id},participant2_id.eq.${b.user_id}),and(participant1_id.eq.${b.user_id},participant2_id.eq.${a.user_id})`)
              .maybeSingle();

            let conversationId = existingConv?.id;
            if (!conversationId) {
              const { data: newConv, error: convErr } = await adminClient.from('conversations').insert({
                participant1_id: a.user_id,
                participant2_id: b.user_id,
              }).select('id').single();
              if (convErr) throw convErr;
              conversationId = newConv.id;
            }

            conversationsCreated.push(conversationId);

            // Insert messages with realistic timing gaps
            let sentCount = 0;
            for (let i = 0; i < messages.length; i++) {
              const sender = i % 2 === 0 ? a : b;
              const content = `[GHOST_SOCIAL] ${messages[i]}`;
              const createdAt = new Date(Date.now() - (messages.length - i) * 30000).toISOString(); // 30s apart

              const { error: msgErr } = await adminClient.from('direct_messages').insert({
                conversation_id: conversationId,
                sender_id: sender.user_id,
                content,
                message_type: 'text',
                created_at: createdAt,
              });

              if (!msgErr) sentCount++;
            }

            // Update conversation last_message
            await adminClient.from('conversations').update({
              last_message: `[GHOST_SOCIAL] ${messages[messages.length - 1]?.substring(0, 100)}`,
              last_message_at: new Date().toISOString(),
            }).eq('id', conversationId);

            return { sent: sentCount };
          } catch (err: any) {
            return { sent: 0, error: err.message };
          }
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          messagesSent.push(result.value.sent);
          if (result.value.error) errors.push(result.value.error);
        } else {
          errors.push(result.reason?.message || 'Unknown error');
        }
      }

      // Small delay between batches to respect rate limits
      if (batchStart + BATCH_SIZE < pairs.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    const totalMessages = messagesSent.reduce((a, b) => a + b, 0);
    const totalConversations = new Set(conversationsCreated).size;
    const duration = Date.now() - startTime;

    const summary = {
      conversations_created: totalConversations,
      messages_sent: totalMessages,
      errors: errors.length,
      duration_ms: duration,
      personas_used: PERSONA_KEYS,
      topics_covered: [...new Set(pairs.map(p => p.topic))].length,
    };

    // Log as proposal
    await adminClient.from('ai_proposals').insert({
      title: `🧠 Sentient Social: ${totalConversations} conversations, ${totalMessages} messages`,
      title_ar: `🧠 المحاكاة الاجتماعية: ${totalConversations} محادثة، ${totalMessages} رسالة`,
      description: `Ghost agents generated ${totalConversations} LLM-powered Arabic conversations with ${totalMessages} messages across ${PERSONA_KEYS.length} personas. ${errors.length} errors. Duration: ${duration}ms.`,
      description_ar: `أنشأ العملاء ${totalConversations} محادثة ذكية بالعربية مع ${totalMessages} رسالة. ${errors.length} أخطاء.`,
      proposal_type: 'system_diagnostic',
      priority: errors.length > totalConversations / 2 ? 'high' : 'low',
      affected_area: 'infrastructure',
      status: 'pending',
      risk_level: 'low',
      impact_scope: 'platform_wide',
    });

    return new Response(JSON.stringify({ success: true, summary, errors: errors.slice(0, 10) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

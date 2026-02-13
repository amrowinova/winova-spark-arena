import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ── Trusted sources registry ── */
const SOURCES = [
  {
    name: "OWASP Top 10",
    url: "https://owasp.org/API-Security/editions/2023/en/0x11-t10/",
    category: "security",
    tags: ["security", "api", "owasp"],
  },
  {
    name: "Fintech Design Patterns",
    url: "https://raw.githubusercontent.com/topics/fintech",
    category: "fintech",
    tags: ["fintech", "patterns", "architecture"],
  },
  {
    name: "React Best Practices",
    url: "https://react.dev/learn",
    category: "engineering",
    tags: ["react", "frontend", "best-practices"],
  },
  {
    name: "Supabase Blog",
    url: "https://supabase.com/blog",
    category: "engineering",
    tags: ["supabase", "backend", "database"],
  },
  {
    name: "Chainalysis Crypto Crime",
    url: "https://www.chainalysis.com/blog/",
    category: "security",
    tags: ["fraud", "crypto", "compliance"],
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth Gate: Service Role or Admin ──
  {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (token !== svcKey) {
      const authClient = createClient(Deno.env.get('SUPABASE_URL')!, svcKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: { user } } = await authClient.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: roles } = await authClient.from('user_roles').select('role').eq('user_id', user.id);
      if (!roles?.some((r: any) => r.role === 'admin')) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { category, max_sources } = await req.json().catch(() => ({
      category: null,
      max_sources: 5,
    }));

    // Filter sources by category if provided
    const targetSources = category
      ? SOURCES.filter((s) => s.category === category)
      : SOURCES.slice(0, max_sources || 5);

    const results: any[] = [];

    for (const source of targetSources) {
      try {
        // Fetch content from source
        const response = await fetch(source.url, {
          headers: { "User-Agent": "WINOVA-AI-Collector/1.0" },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          console.warn(`Failed to fetch ${source.name}: ${response.status}`);
          continue;
        }

        const rawContent = await response.text();

        // Truncate to manageable size
        const content = rawContent.substring(0, 5000);

        // If we have Anthropic key, summarize and extract insights
        let processedTitle = `${source.name} — ${new Date().toISOString().split("T")[0]}`;
        let processedContent = content;
        let relevanceScore = 50;

        if (anthropicKey) {
          try {
            const aiResponse = await fetch(
              "https://api.anthropic.com/v1/messages",
              {
                method: "POST",
                headers: {
                  "x-api-key": anthropicKey,
                  "content-type": "application/json",
                  "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                  model: "claude-sonnet-4-20250514",
                  max_tokens: 500,
                  messages: [
                    {
                      role: "user",
                      content: `You are an AI analyst for WINOVA, a fintech platform with P2P trading, contests, team management, and Nova/Aura currency.

Analyze this content from "${source.name}" (category: ${source.category}).
Extract ONLY insights relevant to WINOVA's operations.

Content:
${content.substring(0, 3000)}

Respond in JSON:
{
  "title": "concise insight title",
  "summary": "2-3 sentence summary of relevant finding",
  "relevance_score": 0-100,
  "tags": ["tag1", "tag2"]
}`,
                    },
                  ],
                }),
              }
            );

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const parsed = JSON.parse(
                aiData.content[0].text.replace(/```json\n?|\n?```/g, "")
              );
              processedTitle = parsed.title || processedTitle;
              processedContent = parsed.summary || processedContent;
              relevanceScore = parsed.relevance_score || 50;
            }
          } catch (aiErr) {
            console.warn("AI summarization failed, storing raw:", aiErr);
          }
        }

        // Store in external_knowledge
        const { error } = await supabase.from("external_knowledge").insert({
          source_name: source.name,
          source_url: source.url,
          source_category: source.category,
          title: processedTitle,
          content: processedContent,
          relevance_score: relevanceScore,
          tags: source.tags,
          is_processed: !!anthropicKey,
          metadata: { raw_length: rawContent.length },
        });

        if (error) {
          console.error(`DB insert error for ${source.name}:`, error);
        } else {
          results.push({
            source: source.name,
            title: processedTitle,
            relevance: relevanceScore,
          });
        }
      } catch (sourceErr) {
        console.warn(`Error processing ${source.name}:`, sourceErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        collected: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Collector error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHOST_COUNT = 100;
const GHOST_EMAIL_DOMAIN = 'ghost.winova.test';
const GHOST_PASSWORD = 'GhostAgent!2026#Secure';

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

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Check admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      const isAdmin = roles?.some((r: any) => r.role === 'admin');
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Admin only' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const count = Math.min(body.count || GHOST_COUNT, 200);

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
      ghost_ids: [] as string[],
    };

    for (let i = 1; i <= count; i++) {
      const paddedId = String(i).padStart(3, '0');
      const email = `ghost_${paddedId}@${GHOST_EMAIL_DOMAIN}`;
      const username = `ghost_agent_${paddedId}`;
      const name = `Ghost Agent ${paddedId}`;

      try {
        // Check if ghost already exists
        const { data: existing } = await supabase
          .from('profiles')
          .select('id, user_id')
          .eq('username', username)
          .maybeSingle();

        if (existing) {
          results.skipped++;
          results.ghost_ids.push(existing.user_id);
          continue;
        }

        // Create auth user
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: GHOST_PASSWORD,
          email_confirm: true,
          user_metadata: {
            name,
            username,
            country: 'Saudi Arabia',
            is_ghost: true,
          },
        });

        if (authError) {
          // User might already exist in auth but not profiles
          results.errors.push(`Auth ${paddedId}: ${authError.message}`);
          continue;
        }

        const userId = authUser.user.id;
        results.ghost_ids.push(userId);

        // Create profile (tagged as ghost/test_data)
        await supabase.from('profiles').upsert({
          user_id: userId,
          name,
          username,
          country: 'Saudi Arabia',
          wallet_country: 'Saudi Arabia',
          referral_code: `WINOVA-${username.toUpperCase()}-SA`,
          bio: '[GHOST_AGENT:test_data] Autonomous stress-test agent',
        });

        // Create wallet with test balances
        await supabase.from('wallets').upsert({
          user_id: userId,
          nova_balance: 500 + Math.floor(Math.random() * 1500),
          aura_balance: 100 + Math.floor(Math.random() * 400),
          locked_nova_balance: 0,
        });

        results.created++;
      } catch (err) {
        results.errors.push(`Agent ${paddedId}: ${String(err)}`);
      }
    }

    // Log provisioning to ai_proposals for Commander visibility
    await supabase.from('ai_proposals').insert({
      title: `Ghost Army Provisioned: ${results.created} agents deployed`,
      title_ar: `جيش الأشباح: تم نشر ${results.created} عميل`,
      description: `Stress test army provisioned. Created: ${results.created}, Skipped: ${results.skipped}, Errors: ${results.errors.length}. All accounts tagged as test_data.`,
      description_ar: `تم تجهيز جيش اختبار الضغط. تم إنشاء: ${results.created}، تم تخطي: ${results.skipped}، أخطاء: ${results.errors.length}. جميع الحسابات مُعلَّمة كبيانات اختبار.`,
      proposal_type: 'system_diagnostic',
      priority: 'medium',
      affected_area: 'infrastructure',
      status: 'pending',
      risk_level: 'low',
      impact_scope: 'internal_testing',
    });

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_requested: count,
        created: results.created,
        skipped: results.skipped,
        errors: results.errors.length,
      },
      ghost_ids: results.ghost_ids,
      errors: results.errors.slice(0, 10),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

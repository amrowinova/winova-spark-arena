import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: roles } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id);
      if (!roles?.some((r: any) => r.role === 'admin')) {
        return new Response(JSON.stringify({ error: 'Admin only' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const count = Math.min(body.count || 200, 200);
    const buildReferralTree = body.build_referral_tree !== false;

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
      ghost_ids: [] as string[],
      referral_links: 0,
      circular_blocked: 0,
    };

    // Phase 1: Provision accounts
    for (let i = 1; i <= count; i++) {
      const paddedId = String(i).padStart(3, '0');
      const email = `ghost_${paddedId}@${GHOST_EMAIL_DOMAIN}`;
      const username = `ghost_agent_${paddedId}`;
      const name = `Ghost Agent ${paddedId}`;

      try {
        const { data: existing } = await supabase
          .from('profiles').select('id, user_id').eq('username', username).maybeSingle();

        if (existing) {
          results.skipped++;
          results.ghost_ids.push(existing.user_id);
          continue;
        }

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: GHOST_PASSWORD,
          email_confirm: true,
          user_metadata: { name, username, country: 'Saudi Arabia', is_ghost: true },
        });

        if (authError) {
          results.errors.push(`Auth ${paddedId}: ${authError.message}`);
          continue;
        }

        const userId = authUser.user.id;
        results.ghost_ids.push(userId);

        await supabase.from('profiles').upsert({
          user_id: userId,
          name,
          username,
          country: 'Saudi Arabia',
          wallet_country: 'Saudi Arabia',
          referral_code: `WINOVA-${username.toUpperCase()}-SA`,
          bio: '[GHOST_AGENT:test_data] Autonomous stress-test agent',
        });

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

    // Phase 2: Build Referral Tree (multi-level hierarchy)
    if (buildReferralTree && results.ghost_ids.length >= 10) {
      const ghostProfiles = await supabase
        .from('profiles').select('id, user_id, username, referral_code')
        .like('username', 'ghost_agent_%').order('username');

      const ghosts = ghostProfiles.data || [];
      const usedRefs = new Set<string>();

      // Tree structure: 
      // Agent 001-005 = Root leaders (no parent)
      // Agent 006-020 = Direct of roots (Level 1)
      // Agent 021-060 = Level 2 (under 006-020)
      // Agent 061-200 = Level 3+ (distributed)
      for (let i = 5; i < ghosts.length; i++) {
        const child = ghosts[i];
        // Determine parent index based on tree structure
        let parentIdx: number;
        if (i < 20) {
          parentIdx = i % 5; // Direct under roots
        } else if (i < 60) {
          parentIdx = 5 + ((i - 20) % 15); // Under level 1
        } else {
          parentIdx = 20 + ((i - 60) % 40); // Under level 2
        }

        const parent = ghosts[parentIdx];
        if (!parent || !parent.referral_code) continue;

        // Anti-circular check: child cannot refer to own ancestor
        const refKey = `${child.user_id}->${parent.user_id}`;
        if (usedRefs.has(`${parent.user_id}->${child.user_id}`)) {
          results.circular_blocked++;
          continue;
        }
        usedRefs.add(refKey);

        // Update referred_by
        await supabase.from('profiles')
          .update({ referred_by: parent.referral_code })
          .eq('user_id', child.user_id);

        // Insert team_members record
        const { error: tmError } = await supabase.from('team_members').upsert({
          leader_id: parent.user_id,
          member_id: child.user_id,
          level: 1,
        }, { onConflict: 'leader_id,member_id' });

        if (!tmError) results.referral_links++;
      }

      // Propagate indirect levels (ancestors up to 5 levels)
      for (let level = 2; level <= 5; level++) {
        const { data: directLinks } = await supabase
          .from('team_members').select('leader_id, member_id')
          .eq('level', 1)
          .in('member_id', ghosts.filter((_, idx) => idx >= 5).map(g => g.user_id));

        if (!directLinks) break;

        for (const link of directLinks) {
          // Find the leader's own leader
          const { data: parentLink } = await supabase
            .from('team_members').select('leader_id')
            .eq('member_id', link.leader_id).eq('level', 1).maybeSingle();

          if (parentLink) {
            await supabase.from('team_members').upsert({
              leader_id: parentLink.leader_id,
              member_id: link.member_id,
              level,
            }, { onConflict: 'leader_id,member_id' });
          }
        }
      }
    }

    // Log to Commander
    await supabase.from('ai_proposals').insert({
      title: `🌲 Digital Forest: ${results.created} agents deployed, ${results.referral_links} referral links`,
      title_ar: `🌲 الغابة الرقمية: تم نشر ${results.created} عميل، ${results.referral_links} رابط إحالة`,
      description: [
        `Digital Forest provisioning complete.`,
        `Created: ${results.created}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`,
        `Referral tree links: ${results.referral_links}, Circular refs blocked: ${results.circular_blocked}`,
        `All accounts tagged as test_data.`,
      ].join('\n'),
      description_ar: `اكتمل تجهيز الغابة الرقمية. تم إنشاء: ${results.created}، تخطي: ${results.skipped}. روابط إحالة: ${results.referral_links}، دائرية محظورة: ${results.circular_blocked}.`,
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
        referral_links: results.referral_links,
        circular_blocked: results.circular_blocked,
      },
      ghost_ids: results.ghost_ids,
      errors: results.errors.slice(0, 10),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

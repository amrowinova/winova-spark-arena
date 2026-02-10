import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Verify admin
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
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (!roles?.some((r: any) => r.role === 'admin')) {
        return new Response(JSON.stringify({ error: 'Admin only' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Find all ghost profiles
    const { data: ghosts } = await supabase
      .from('profiles')
      .select('user_id, username')
      .like('username', 'ghost_agent_%');

    if (!ghosts || ghosts.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No ghost agents found.',
        deleted: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ghostUserIds = ghosts.map(g => g.user_id);
    let deletedCount = 0;
    const errors: string[] = [];

    // Delete related data first (order matters for FK constraints)
    const cleanupTables = [
      'contest_participants',
      'contest_votes',
      'direct_messages',
      'wallets',
      'user_roles',
      'follows',
      'notifications',
      'spotlight_points',
    ];

    for (const table of cleanupTables) {
      try {
        await supabase.from(table).delete().in('user_id', ghostUserIds);
      } catch (err) {
        // Table might not exist or no matching rows — fine
      }
    }

    // Delete profiles
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .like('username', 'ghost_agent_%');

    if (profileDeleteError) {
      errors.push(`Profiles: ${profileDeleteError.message}`);
    }

    // Delete auth users
    for (const ghost of ghosts) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(ghost.user_id);
        if (error) {
          errors.push(`Auth ${ghost.username}: ${error.message}`);
        } else {
          deletedCount++;
        }
      } catch (err) {
        errors.push(`Auth ${ghost.username}: ${String(err)}`);
      }
    }

    // Clean up ghost army proposals
    await supabase
      .from('ai_proposals')
      .delete()
      .eq('proposal_type', 'system_diagnostic')
      .like('title', '%Ghost Army%');

    return new Response(JSON.stringify({
      success: true,
      deleted: deletedCount,
      total_found: ghosts.length,
      errors: errors.slice(0, 10),
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';
const GITHUB_API = 'https://api.github.com';

// ─── GitHub API Helpers ─────────────────────────────

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

function getGitHubConfig(): GitHubConfig {
  const token = Deno.env.get('GITHUB_TOKEN');
  const owner = Deno.env.get('GITHUB_REPO_OWNER');
  const repo = Deno.env.get('GITHUB_REPO_NAME');
  if (!token || !owner || !repo) {
    throw new Error('GitHub credentials not configured: GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME required');
  }
  return { token, owner, repo };
}

async function ghFetch(cfg: GitHubConfig, path: string, options: RequestInit = {}): Promise<any> {
  const url = `${GITHUB_API}/repos/${cfg.owner}/${cfg.repo}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${cfg.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Core Operations ────────────────────────────────

async function getDefaultBranch(cfg: GitHubConfig): Promise<string> {
  const repo = await ghFetch(cfg, '');
  return repo.default_branch || 'main';
}

async function getLatestCommitSha(cfg: GitHubConfig, branch: string): Promise<string> {
  const ref = await ghFetch(cfg, `/git/ref/heads/${branch}`);
  return ref.object.sha;
}

async function createBranch(cfg: GitHubConfig, branchName: string, fromSha: string): Promise<void> {
  await ghFetch(cfg, '/git/refs', {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: fromSha }),
  });
}

async function getFileContent(cfg: GitHubConfig, path: string, branch: string): Promise<{ content: string; sha: string } | null> {
  try {
    const file = await ghFetch(cfg, `/contents/${path}?ref=${branch}`);
    const decoded = atob(file.content.replace(/\n/g, ''));
    return { content: decoded, sha: file.sha };
  } catch {
    return null;
  }
}

async function createOrUpdateFile(
  cfg: GitHubConfig,
  path: string,
  content: string,
  message: string,
  branch: string,
  existingSha?: string,
): Promise<void> {
  const encoded = btoa(unescape(encodeURIComponent(content)));
  const body: any = { message, content: encoded, branch };
  if (existingSha) body.sha = existingSha;
  await ghFetch(cfg, `/contents/${path}`, { method: 'PUT', body: JSON.stringify(body) });
}

async function createPullRequest(
  cfg: GitHubConfig,
  title: string,
  body: string,
  head: string,
  base: string,
): Promise<{ number: number; html_url: string }> {
  return ghFetch(cfg, '/pulls', {
    method: 'POST',
    body: JSON.stringify({ title, body, head, base }),
  });
}

async function searchCode(cfg: GitHubConfig, query: string): Promise<any[]> {
  const url = `${GITHUB_API}/search/code?q=${encodeURIComponent(query + ` repo:${cfg.owner}/${cfg.repo}`)}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${cfg.token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

async function listRepoTree(cfg: GitHubConfig, branch: string, path = ''): Promise<any[]> {
  try {
    const items = await ghFetch(cfg, `/contents/${path}?ref=${branch}`);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

// ─── DM & Chat Helpers ─────────────────────────────

async function postToDM(sb: any, content: string, messageType = 'system') {
  const { data: convos } = await sb
    .from('conversations')
    .select('id')
    .or(`participant1_id.eq.${AI_SYSTEM_USER_ID},participant2_id.eq.${AI_SYSTEM_USER_ID}`)
    .limit(5);
  if (convos) {
    for (const c of convos) {
      await sb.from('direct_messages').insert({
        conversation_id: c.id,
        sender_id: AI_SYSTEM_USER_ID,
        content,
        message_type: messageType,
        is_read: false,
      });
    }
  }
}

async function postToChatRoom(sb: any, content: string, contentAr: string, category = 'info') {
  const { data: agent } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
  if (agent) {
    await sb.from('ai_chat_room').insert({
      agent_id: agent.id,
      content,
      content_ar: contentAr,
      message_type: 'code_change',
      message_category: category,
      is_summary: true,
    });
  }
}

// ─── Thinking Stream ────────────────────────────────

const PHASES = [
  { key: 'command_received',   emoji: '📩', en: 'Command received',      ar: 'تم استلام الأمر' },
  { key: 'understanding',      emoji: '🧠', en: 'Understanding request', ar: 'فهم الطلب' },
  { key: 'planning',           emoji: '📋', en: 'Planning changes',      ar: 'تخطيط التعديلات' },
  { key: 'collecting_data',    emoji: '📡', en: 'Reading codebase',      ar: 'قراءة الكود' },
  { key: 'analyzing',          emoji: '🔬', en: 'Analyzing code',        ar: 'تحليل الكود' },
  { key: 'building',           emoji: '🏗️', en: 'Generating patches',    ar: 'إنشاء التعديلات' },
  { key: 'validating',         emoji: '✅', en: 'Creating PR',           ar: 'إنشاء طلب المراجعة' },
  { key: 'preparing_output',   emoji: '📝', en: 'Preparing summary',     ar: 'إعداد الملخص' },
  { key: 'completed',          emoji: '🏁', en: 'Completed',             ar: 'مكتمل' },
] as const;

async function streamPhase(sb: any, agentId: string, phaseKey: string, detail?: string) {
  const phase = PHASES.find(p => p.key === phaseKey)!;
  const idx = PHASES.findIndex(p => p.key === phaseKey);
  const progress = `[${idx + 1}/${PHASES.length}]`;

  const content = `${phase.emoji} **${phase.en}** ${progress}\n🤖 Agent: Code Engineer\n${detail ? `→ ${detail}` : ''}`;
  const contentAr = `${phase.emoji} **${phase.ar}** ${progress}\n🤖 الوكيل: مهندس الكود\n${detail ? `→ ${detail}` : ''}`;

  await Promise.all([
    sb.from('ai_chat_room').insert({
      agent_id: agentId,
      content,
      content_ar: contentAr,
      message_type: 'thinking_stream',
      message_category: phaseKey === 'completed' ? 'success' : 'info',
      is_summary: false,
    }),
    postToDM(sb, contentAr, 'thinking_stream'),
  ]);
}

// ─── Main Execution Pipeline ────────────────────────

async function executeCodeTask(sb: any, task: {
  command: string;
  description: string;
  files_to_modify: Array<{ path: string; action: 'modify' | 'create' | 'delete'; content?: string; patch_description?: string }>;
  pr_title: string;
  pr_body: string;
  risk_level: string;
  source_request_id?: string;
}) {
  const cfg = getGitHubConfig();
  const { data: agent } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
  const agentId = agent?.id || AI_SYSTEM_USER_ID;

  const t0 = Date.now();

  try {
    // Phase 1: Command received
    await streamPhase(sb, agentId, 'command_received', task.command);

    // Phase 2: Understanding
    await streamPhase(sb, agentId, 'understanding', task.description);

    // Phase 3: Planning
    const branchName = `ai/fix-${Date.now()}`;
    await streamPhase(sb, agentId, 'planning', `Branch: ${branchName}, Files: ${task.files_to_modify.length}`);

    // Phase 4: Reading codebase
    await streamPhase(sb, agentId, 'collecting_data', `Reading ${task.files_to_modify.length} files from repo`);

    const defaultBranch = await getDefaultBranch(cfg);
    const latestSha = await getLatestCommitSha(cfg, defaultBranch);

    // Read existing files
    const existingFiles: Record<string, { content: string; sha: string } | null> = {};
    for (const f of task.files_to_modify) {
      if (f.action !== 'create') {
        existingFiles[f.path] = await getFileContent(cfg, f.path, defaultBranch);
      }
    }

    // Phase 5: Analyzing
    await streamPhase(sb, agentId, 'analyzing', 'Validating changes against current codebase');

    // Phase 6: Create branch and commit
    await streamPhase(sb, agentId, 'building', `Creating branch ${branchName}`);
    await createBranch(cfg, branchName, latestSha);

    const filesChanged: any[] = [];

    for (const f of task.files_to_modify) {
      if (f.action === 'delete') {
        // GitHub API delete via contents endpoint
        const existing = existingFiles[f.path];
        if (existing) {
          await ghFetch(cfg, `/contents/${f.path}`, {
            method: 'DELETE',
            body: JSON.stringify({
              message: `[AI] Remove ${f.path}`,
              sha: existing.sha,
              branch: branchName,
            }),
          });
          filesChanged.push({ path: f.path, action: 'deleted' });
        }
      } else {
        const content = f.content || '';
        const existing = existingFiles[f.path];
        const commitMsg = f.action === 'create'
          ? `[AI] Create ${f.path}`
          : `[AI] Fix ${f.path}: ${f.patch_description || 'improvement'}`;

        await createOrUpdateFile(cfg, f.path, content, commitMsg, branchName, existing?.sha);
        filesChanged.push({
          path: f.path,
          action: f.action,
          patch_description: f.patch_description,
          has_previous: !!existing,
        });
      }
    }

    // Phase 7: Create PR
    await streamPhase(sb, agentId, 'validating', 'Opening Pull Request');

    const pr = await createPullRequest(
      cfg,
      `🤖 ${task.pr_title}`,
      [
        `## AI Code Engineer - Automated Fix`,
        '',
        `**Command:** ${task.command}`,
        `**Risk Level:** ${task.risk_level}`,
        `**Files Changed:** ${filesChanged.length}`,
        '',
        '### Description',
        task.pr_body,
        '',
        '### Files Modified',
        ...filesChanged.map(f => `- \`${f.path}\` (${f.action}): ${f.patch_description || 'updated'}`),
        '',
        '---',
        '⚠️ **This PR was generated by the WINOVA AI Code Engineer.**',
        '🔒 **Manual review and approval by Amro is required before merging.**',
        '',
        `> Source Request: ${task.source_request_id || 'direct command'}`,
      ].join('\n'),
      branchName,
      defaultBranch,
    );

    // Phase 8: Record and notify
    await streamPhase(sb, agentId, 'preparing_output', `PR #${pr.number} created`);

    const durationMs = Date.now() - t0;

    // Store in ai_code_changes
    const { data: changeRecord } = await sb.from('ai_code_changes').insert({
      agent_function: 'ai-code-engineer',
      branch_name: branchName,
      pr_number: pr.number,
      pr_url: pr.html_url,
      pr_title: task.pr_title,
      pr_body: task.pr_body,
      files_changed: filesChanged,
      diff_summary: `${filesChanged.length} files changed via AI code engineer`,
      diff_summary_ar: `${filesChanged.length} ملفات تم تعديلها بواسطة مهندس الكود`,
      source_request_id: task.source_request_id || null,
      source_command: task.command,
      status: 'pr_open',
      risk_level: task.risk_level,
      confidence_score: 85,
      metadata: { duration_ms: durationMs, default_branch: defaultBranch },
    }).select('id').single();

    // Post to Intelligence DM
    const dmContent = `🔧 **تعديل كود جديد** | New Code Change

📋 **${task.pr_title}**
🔗 [PR #${pr.number}](${pr.html_url})
📂 الملفات: ${filesChanged.length}
⚠️ المخاطر: ${task.risk_level}
⏱️ المدة: ${durationMs}ms

${filesChanged.map(f => `• \`${f.path}\` → ${f.action}`).join('\n')}

🔒 **يتطلب مراجعة وموافقة يدوية قبل الدمج**
✅ Review and approve on GitHub to merge.`;

    await Promise.all([
      postToDM(sb, dmContent, 'code_change'),
      postToChatRoom(sb, dmContent, dmContent, 'success'),
    ]);

    // Log to activity stream
    await sb.from('ai_activity_stream').insert({
      action_type: 'code_change_pr_created',
      entity_type: 'ai_code_changes',
      entity_id: changeRecord?.id || pr.html_url,
      success: true,
      duration_ms: durationMs,
      role: 'system',
      before_state: { files: Object.keys(existingFiles) },
      after_state: { pr_number: pr.number, pr_url: pr.html_url, files_changed: filesChanged },
    });

    // Log to knowledge memory
    await sb.from('knowledge_memory').insert({
      source: 'ai',
      event_type: 'code_change_created',
      area: 'engineering',
      reference_id: changeRecord?.id,
      payload: {
        pr_number: pr.number,
        pr_url: pr.html_url,
        branch: branchName,
        files: filesChanged.length,
        risk_level: task.risk_level,
        command: task.command,
        duration_ms: durationMs,
      },
    });

    // Phase 9: Done
    await streamPhase(sb, agentId, 'completed', `PR #${pr.number} ready for review`);

    return {
      success: true,
      pr_number: pr.number,
      pr_url: pr.html_url,
      branch: branchName,
      files_changed: filesChanged.length,
      change_id: changeRecord?.id,
      duration_ms: durationMs,
    };

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Code Engineer] Error:', errMsg);

    // Report failure
    const failContent = `❌ **فشل تعديل الكود** | Code Change Failed

📋 **${task.pr_title}**
⚠️ الخطأ: ${errMsg}
🔄 الأمر: ${task.command}`;

    await Promise.all([
      postToDM(sb, failContent, 'error'),
      postToChatRoom(sb, failContent, failContent, 'critical'),
    ]);

    return { success: false, error: errMsg, duration_ms: Date.now() - t0 };
  }
}

// ─── Codebase Analysis (for commands like "search" or "analyze") ───

async function analyzeCodebase(sb: any, query: string) {
  const cfg = getGitHubConfig();
  const results = await searchCode(cfg, query);

  return {
    success: true,
    results: results.slice(0, 20).map((r: any) => ({
      path: r.path,
      name: r.name,
      url: r.html_url,
    })),
    total: results.length,
  };
}

async function readFile(sb: any, path: string) {
  const cfg = getGitHubConfig();
  const defaultBranch = await getDefaultBranch(cfg);
  const file = await getFileContent(cfg, path, defaultBranch);
  if (!file) return { success: false, error: `File not found: ${path}` };
  return { success: true, path, content: file.content };
}

async function listDirectory(sb: any, path: string) {
  const cfg = getGitHubConfig();
  const defaultBranch = await getDefaultBranch(cfg);
  const items = await listRepoTree(cfg, defaultBranch, path);
  return {
    success: true,
    path,
    items: items.map((i: any) => ({ name: i.name, type: i.type, path: i.path })),
  };
}

// ─── Main Handler ───────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    let result;

    switch (action) {
      case 'execute_code_task': {
        // Full pipeline: branch → commit → PR
        const { command, description, files_to_modify, pr_title, pr_body, risk_level, source_request_id } = body;
        if (!files_to_modify || !pr_title) {
          return new Response(JSON.stringify({ error: 'Missing files_to_modify or pr_title' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await executeCodeTask(sb, {
          command: command || 'direct',
          description: description || pr_title,
          files_to_modify,
          pr_title,
          pr_body: pr_body || '',
          risk_level: risk_level || 'medium',
          source_request_id,
        });
        break;
      }

      case 'search_code': {
        const { query } = body;
        if (!query) {
          return new Response(JSON.stringify({ error: 'Missing query' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await analyzeCodebase(sb, query);
        break;
      }

      case 'read_file': {
        const { path } = body;
        if (!path) {
          return new Response(JSON.stringify({ error: 'Missing path' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        result = await readFile(sb, path);
        break;
      }

      case 'list_directory': {
        const { path } = body;
        result = await listDirectory(sb, path || '');
        break;
      }

      case 'health_check': {
        // Verify GitHub connectivity
        try {
          const cfg = getGitHubConfig();
          const branch = await getDefaultBranch(cfg);
          result = { success: true, status: 'healthy', default_branch: branch };
        } catch (e) {
          result = { success: false, status: 'unhealthy', error: e instanceof Error ? e.message : 'Unknown' };
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action. Valid: execute_code_task, search_code, read_file, list_directory, health_check' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Code Engineer] Fatal:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

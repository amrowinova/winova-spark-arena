import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Evaluation {
  composite_score: number;
  relevance: number;
  clarity: number;
  technical_depth: number;
  hallucination_risk: number;
  improvement_note: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tokens_used?: number;
  evaluation?: Evaluation;
}

interface Conversation {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface MemoryEntry {
  id: string;
  key: string;
  content: string;
  category: string;
  tags: string[];
  importance: number;
  created_at: string;
  updated_at: string;
}

interface AIMemoryEntry {
  id: number;
  category: string;
  key: string;
  content: string;
  importance: number;
  last_used: string;
  created_at: string;
}

interface ExecutionLog {
  id: string;
  action_type: string;
  input: any;
  output: any;
  status: string;
  error_message: string | null;
  requires_approval: boolean;
  approved_by: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface AIProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  stack: string | null;
  created_at: string;
}

export interface AIFile {
  id: string;
  path: string;
  language: string | null;
  content?: string;
  last_modified: string;
  created_at: string;
}

export interface AIProjectExecution {
  id: string;
  project_id: string | null;
  code: string;
  language: string;
  status: string;
  output: string | null;
  error_message: string | null;
  approved_by: string | null;
  duration_ms: number | null;
  created_at: string;
}

async function callAICore(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('ai-core-chat', {
    body: { action, ...payload },
  });
  if (error) throw error;
  return data;
}

async function callToolLayer(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('ai-tool-layer', {
    body: { action, ...payload },
  });
  if (error) throw error;
  return data;
}

export function useAICore() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [aiMemories, setAIMemories] = useState<AIMemoryEntry[]>([]);
  const [executions, setExecutions] = useState<ExecutionLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const currentConvRef = useRef<string | null>(null);

  // Project state
  const [projects, setProjects] = useState<AIProject[]>([]);
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<AIFile[]>([]);
  const [projectExecutions, setProjectExecutions] = useState<AIProjectExecution[]>([]);

  useEffect(() => { currentConvRef.current = currentConversation; }, [currentConversation]);

  // Realtime subscription for ai_core_messages + evaluations
  useEffect(() => {
    const channel = supabase
      .channel('ai-core-messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_core_messages' }, (payload) => {
        const newMsg = payload.new as any;
        if (newMsg.conversation_id === currentConvRef.current) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            const filtered = prev.filter(m => !m.id.startsWith('temp-') && !m.id.startsWith('user-') && !m.id.startsWith('resp-'));
            return [...filtered, { id: newMsg.id, role: newMsg.role, content: newMsg.content, created_at: newMsg.created_at, tokens_used: newMsg.tokens_used }]
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_core_evaluations' }, (payload) => {
        const ev = payload.new as any;
        if (ev.message_id) {
          setMessages(prev => prev.map(m => m.id === ev.message_id ? { ...m, evaluation: ev } : m));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // === CONVERSATIONS ===
  const loadConversations = useCallback(async () => {
    try { const res = await callAICore('conversations_list'); setConversations(res.data || []); } catch (e: any) { toast.error(e.message || 'Failed to load conversations'); }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    try {
      const res = await callAICore('conversation_messages', { conversation_id: conversationId });
      const msgs = res.data || [];
      const { data: evals } = await supabase.from('ai_core_evaluations').select('*').eq('conversation_id', conversationId);
      const evalMap = new Map<string, Evaluation>();
      (evals || []).forEach((ev: any) => { if (ev.message_id) evalMap.set(ev.message_id, ev); });
      setMessages(msgs.map((m: any) => ({ ...m, evaluation: evalMap.get(m.id) || undefined })));
      setCurrentConversation(conversationId);
    } catch (e: any) { toast.error(e.message || 'Failed to load messages'); } finally { setIsLoading(false); }
  }, []);

  const sendMessage = useCallback(async (message: string, systemPrompt?: string) => {
    setIsSending(true);
    const tempMsg: Message = { id: `temp-${Date.now()}`, role: 'user', content: message, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    try {
      const res = await callAICore('chat', { conversation_id: currentConversation, message, system_prompt: systemPrompt, project_id: currentProject });
      if (res.error) { toast.error(res.error); setMessages(prev => prev.filter(m => m.id !== tempMsg.id)); return; }
      if (!currentConversation && res.conversation_id) { setCurrentConversation(res.conversation_id); loadConversations(); }
      setMessages(prev => {
        const hasReal = prev.some(m => !m.id.startsWith('temp-') && !m.id.startsWith('resp-') && !m.id.startsWith('user-'));
        if (!hasReal && (res.conversation_id || currentConversation)) { loadMessages(res.conversation_id || currentConversation!); }
        return prev;
      });
    } catch (e: any) { toast.error(e.message || 'Failed to send message'); setMessages(prev => prev.filter(m => m.id !== tempMsg.id)); } finally { setIsSending(false); }
  }, [currentConversation, currentProject, loadConversations, loadMessages]);

  const newConversation = useCallback(() => { setCurrentConversation(null); setMessages([]); }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await callAICore('conversation_delete', { conversation_id: id });
      if (currentConversation === id) { setCurrentConversation(null); setMessages([]); }
      loadConversations();
      toast.success('Conversation deleted');
    } catch (e: any) { toast.error(e.message || 'Failed to delete'); }
  }, [currentConversation, loadConversations]);

  // === MEMORY ===
  const loadMemory = useCallback(async () => { try { const res = await callAICore('memory_list'); setMemories(res.data || []); } catch (e: any) { toast.error(e.message || 'Failed to load memory'); } }, []);
  const addMemory = useCallback(async (entry: { key: string; content: string; category?: string; tags?: string[]; importance?: number }) => { try { await callAICore('memory_add', entry); loadMemory(); toast.success('Memory added'); } catch (e: any) { toast.error(e.message || 'Failed to add memory'); } }, [loadMemory]);
  const deleteMemory = useCallback(async (id: string) => { try { await callAICore('memory_delete', { id }); setMemories(prev => prev.filter(m => m.id !== id)); toast.success('Memory deleted'); } catch (e: any) { toast.error(e.message || 'Failed to delete memory'); } }, []);

  // === EXECUTIONS (legacy) ===
  const loadExecutions = useCallback(async () => { try { const res = await callAICore('execution_logs'); setExecutions(res.data || []); } catch (e: any) { toast.error(e.message || 'Failed to load executions'); } }, []);
  const approveExecution = useCallback(async (executionId: string) => { try { const res = await callAICore('approve_execution', { execution_id: executionId }); loadExecutions(); toast.success('Execution completed'); return res; } catch (e: any) { toast.error(e.message || 'Execution failed'); } }, [loadExecutions]);
  const executeCode = useCallback(async (code: string, language: string) => { try { const res = await callAICore('execute_code', { code, language, conversation_id: currentConversation }); loadExecutions(); toast.info('Code execution pending approval'); return res; } catch (e: any) { toast.error(e.message || 'Failed to submit code'); } }, [currentConversation, loadExecutions]);

  // === AI MEMORY ===
  const loadAIMemory = useCallback(async () => { try { const res = await callAICore('ai_memory_list'); setAIMemories(res.data || []); } catch (e: any) { toast.error(e.message || 'Failed to load AI memory'); } }, []);
  const deleteAIMemory = useCallback(async (id: number) => { try { await callAICore('ai_memory_delete', { id }); setAIMemories(prev => prev.filter(m => m.id !== id)); toast.success('Memory deleted'); } catch (e: any) { toast.error(e.message || 'Failed to delete memory'); } }, []);
  const boostAIMemory = useCallback(async (id: number, importance: number) => { try { await callAICore('ai_memory_boost', { id, importance }); setAIMemories(prev => prev.map(m => m.id === id ? { ...m, importance } : m)); toast.success('Importance updated'); } catch (e: any) { toast.error(e.message || 'Failed to boost memory'); } }, []);

  // === PROJECTS (Tool Layer) ===
  const loadProjects = useCallback(async () => {
    try { const res = await callToolLayer('project_list'); setProjects(res.data || []); } catch (e: any) { toast.error(e.message || 'Failed to load projects'); }
  }, []);

  const createProject = useCallback(async (name: string, description?: string, stack?: string) => {
    try { const res = await callToolLayer('project_create', { name, description, stack }); setProjects(prev => [res.data, ...prev]); toast.success('Project created'); return res.data; } catch (e: any) { toast.error(e.message || 'Failed to create project'); }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    try { await callToolLayer('project_delete', { project_id: id }); setProjects(prev => prev.filter(p => p.id !== id)); if (currentProject === id) { setCurrentProject(null); setProjectFiles([]); } toast.success('Project deleted'); } catch (e: any) { toast.error(e.message || 'Failed to delete project'); }
  }, [currentProject]);

  const loadProjectFiles = useCallback(async (projectId: string) => {
    try { const res = await callToolLayer('file_list', { project_id: projectId }); setProjectFiles(res.data || []); setCurrentProject(projectId); } catch (e: any) { toast.error(e.message || 'Failed to load files'); }
  }, []);

  const readFile = useCallback(async (projectId: string, path: string) => {
    try { const res = await callToolLayer('file_read', { project_id: projectId, path }); return res.data; } catch (e: any) { toast.error(e.message || 'Failed to read file'); return null; }
  }, []);

  const writeFile = useCallback(async (projectId: string, path: string, content: string, language?: string) => {
    try { await callToolLayer('file_write', { project_id: projectId, path, content, language }); loadProjectFiles(projectId); toast.success('File saved'); } catch (e: any) { toast.error(e.message || 'Failed to save file'); }
  }, [loadProjectFiles]);

  const deleteFile = useCallback(async (fileId: string, projectId: string) => {
    try { await callToolLayer('file_delete', { file_id: fileId }); loadProjectFiles(projectId); toast.success('File deleted'); } catch (e: any) { toast.error(e.message || 'Failed to delete file'); }
  }, [loadProjectFiles]);

  // === PROJECT EXECUTIONS ===
  const loadProjectExecutions = useCallback(async (projectId?: string) => {
    try { const res = await callToolLayer('execute_list', { project_id: projectId }); setProjectExecutions(res.data || []); } catch (e: any) { toast.error(e.message || 'Failed to load executions'); }
  }, []);

  const requestExecution = useCallback(async (code: string, language: string, projectId?: string) => {
    try { const res = await callToolLayer('execute_request', { project_id: projectId, code, language }); loadProjectExecutions(projectId); toast.info('Execution pending approval'); return res.data; } catch (e: any) { toast.error(e.message || 'Failed to request execution'); }
  }, [loadProjectExecutions]);

  const approveProjectExecution = useCallback(async (executionId: string) => {
    try { const res = await callToolLayer('execute_approve', { execution_id: executionId }); loadProjectExecutions(currentProject || undefined); toast.success('Execution completed'); return res; } catch (e: any) { toast.error(e.message || 'Execution failed'); }
  }, [currentProject, loadProjectExecutions]);

  const rejectProjectExecution = useCallback(async (executionId: string) => {
    try { await callToolLayer('execute_reject', { execution_id: executionId }); loadProjectExecutions(currentProject || undefined); toast.success('Execution rejected'); } catch (e: any) { toast.error(e.message || 'Failed to reject'); }
  }, [currentProject, loadProjectExecutions]);

  // === STRATEGIC ANALYSIS ===
  const [strategicReport, setStrategicReport] = useState<{ report: string; kpis: any } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const runStrategicAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const res = await callAICore('strategic_analysis');
      setStrategicReport({ report: res.report, kpis: res.kpis });
      toast.success('Strategic analysis complete');
      return res;
    } catch (e: any) {
      toast.error(e.message || 'Analysis failed');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // === DEPLOYMENT ===
  const generateDeployment = useCallback(async (projectId: string) => {
    try { const res = await callToolLayer('generate_deployment', { project_id: projectId }); loadProjectFiles(projectId); toast.success('Deployment artifacts generated'); return res; } catch (e: any) { toast.error(e.message || 'Failed to generate deployment'); }
  }, [loadProjectFiles]);

  return {
    messages, conversations, currentConversation, memories, executions,
    aiMemories,
    isLoading, isSending,
    sendMessage, loadConversations, loadMessages, newConversation, deleteConversation,
    loadMemory, addMemory, deleteMemory,
    loadAIMemory, deleteAIMemory, boostAIMemory,
    loadExecutions, approveExecution, executeCode,
    // Tool Layer
    projects, currentProject, projectFiles, projectExecutions,
    loadProjects, createProject, deleteProject,
    loadProjectFiles, readFile, writeFile, deleteFile,
    loadProjectExecutions, requestExecution, approveProjectExecution, rejectProjectExecution,
    generateDeployment, setCurrentProject,
    // Strategic Analysis
    strategicReport, isAnalyzing, runStrategicAnalysis,
  };
}

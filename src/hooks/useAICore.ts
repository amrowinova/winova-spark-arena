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

async function callAICore(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('ai-core-chat', {
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
  const [executions, setExecutions] = useState<ExecutionLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const currentConvRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    currentConvRef.current = currentConversation;
  }, [currentConversation]);

  // Realtime subscription for ai_core_messages
  useEffect(() => {
    const channel = supabase
      .channel('ai-core-messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_core_messages' },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.conversation_id === currentConvRef.current) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              const filtered = prev.filter(m => !m.id.startsWith('temp-') && !m.id.startsWith('user-') && !m.id.startsWith('resp-'));
              return [...filtered, {
                id: newMsg.id,
                role: newMsg.role,
                content: newMsg.content,
                created_at: newMsg.created_at,
                tokens_used: newMsg.tokens_used,
              }].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_core_evaluations' },
        (payload) => {
          const ev = payload.new as any;
          if (ev.message_id) {
            setMessages(prev => prev.map(m =>
              m.id === ev.message_id ? { ...m, evaluation: ev } : m
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await callAICore('conversations_list');
      setConversations(res.data || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load conversations');
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    try {
      const res = await callAICore('conversation_messages', { conversation_id: conversationId });
      const msgs = res.data || [];
      
      // Fetch evaluations for this conversation's messages
      const { data: evals } = await supabase
        .from('ai_core_evaluations')
        .select('*')
        .eq('conversation_id', conversationId);
      
      const evalMap = new Map<string, Evaluation>();
      (evals || []).forEach((ev: any) => {
        if (ev.message_id) evalMap.set(ev.message_id, ev);
      });
      
      const enriched = msgs.map((m: any) => ({
        ...m,
        evaluation: evalMap.get(m.id) || undefined,
      }));
      
      setMessages(enriched);
      setCurrentConversation(conversationId);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (message: string, systemPrompt?: string) => {
    setIsSending(true);
    const tempMsg: Message = { id: `temp-${Date.now()}`, role: 'user', content: message, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await callAICore('chat', {
        conversation_id: currentConversation,
        message,
        system_prompt: systemPrompt,
      });

      if (res.error) {
        toast.error(res.error);
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        return;
      }

      if (!currentConversation && res.conversation_id) {
        setCurrentConversation(res.conversation_id);
        loadConversations();
      }

      // Realtime will handle adding the real messages, but as fallback:
      // Remove temp and add real messages if realtime hasn't caught up
      setMessages(prev => {
        const hasReal = prev.some(m => !m.id.startsWith('temp-') && !m.id.startsWith('resp-') && !m.id.startsWith('user-'));
        if (!hasReal) {
          // Fallback: load messages from server
          if (res.conversation_id || currentConversation) {
            loadMessages(res.conversation_id || currentConversation!);
          }
        }
        return prev;
      });
    } catch (e: any) {
      toast.error(e.message || 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } finally {
      setIsSending(false);
    }
  }, [currentConversation, loadConversations, loadMessages]);

  const newConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await callAICore('conversation_delete', { conversation_id: id });
      if (currentConversation === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
      loadConversations();
      toast.success('Conversation deleted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    }
  }, [currentConversation, loadConversations]);

  const loadMemory = useCallback(async () => {
    try {
      const res = await callAICore('memory_list');
      setMemories(res.data || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load memory');
    }
  }, []);

  const addMemory = useCallback(async (entry: { key: string; content: string; category?: string; tags?: string[]; importance?: number }) => {
    try {
      await callAICore('memory_add', entry);
      loadMemory();
      toast.success('Memory added');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add memory');
    }
  }, [loadMemory]);

  const deleteMemory = useCallback(async (id: string) => {
    try {
      await callAICore('memory_delete', { id });
      setMemories(prev => prev.filter(m => m.id !== id));
      toast.success('Memory deleted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete memory');
    }
  }, []);

  const loadExecutions = useCallback(async () => {
    try {
      const res = await callAICore('execution_logs');
      setExecutions(res.data || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load executions');
    }
  }, []);

  const approveExecution = useCallback(async (executionId: string) => {
    try {
      const res = await callAICore('approve_execution', { execution_id: executionId });
      loadExecutions();
      toast.success('Execution completed');
      return res;
    } catch (e: any) {
      toast.error(e.message || 'Execution failed');
    }
  }, [loadExecutions]);

  const executeCode = useCallback(async (code: string, language: string) => {
    try {
      const res = await callAICore('execute_code', { code, language, conversation_id: currentConversation });
      loadExecutions();
      toast.info('Code execution pending approval');
      return res;
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit code');
    }
  }, [currentConversation, loadExecutions]);

  return {
    messages, conversations, currentConversation, memories, executions,
    isLoading, isSending,
    sendMessage, loadConversations, loadMessages, newConversation, deleteConversation,
    loadMemory, addMemory, deleteMemory,
    loadExecutions, approveExecution, executeCode,
  };
}

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tokens_used?: number;
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
      setMessages(res.data || []);
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

      const assistantMsg: Message = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: res.message,
        created_at: new Date().toISOString(),
        tokens_used: res.tokens_used,
      };
      setMessages(prev => [...prev.filter(m => m.id !== tempMsg.id), { ...tempMsg, id: `user-${Date.now()}` }, assistantMsg]);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } finally {
      setIsSending(false);
    }
  }, [currentConversation, loadConversations]);

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

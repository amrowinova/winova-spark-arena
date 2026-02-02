import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SearchResult {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  participant_name: string;
}

export function useMessageSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, conversationId?: string) => {
    if (!user?.id || !query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('search_messages', {
        p_user_id: user.id,
        p_query: query.trim(),
        p_conversation_id: conversationId || null,
        p_limit: 20
      });

      if (rpcError) throw rpcError;

      setResults((data || []) as SearchResult[]);
    } catch (err) {
      console.error('Error searching messages:', err);
      setError('Failed to search messages');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults
  };
}

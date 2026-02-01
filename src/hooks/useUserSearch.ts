import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SearchedUser {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  country: string;
  city: string | null;
  rank: string;
}

export function useUserSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchUsers = useCallback(async (query: string) => {
    if (!user || query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Search by name or username
      const searchTerm = query.startsWith('@') ? query.slice(1) : query;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name, username, avatar_url, country, city, rank')
        .or(`name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
        .neq('user_id', user.id)
        .limit(20);

      if (error) throw error;

      const formattedResults: SearchedUser[] = (data || []).map(p => ({
        id: p.id,
        userId: p.user_id,
        name: p.name,
        username: p.username,
        avatarUrl: p.avatar_url,
        country: p.country,
        city: p.city,
        rank: p.rank,
      }));

      setResults(formattedResults);
    } catch (err) {
      console.error('Error searching users:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [user]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    isSearching,
    searchUsers,
    clearResults,
  };
}

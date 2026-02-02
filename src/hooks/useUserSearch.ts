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
}

export function useUserSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchUsers = useCallback(async (query: string) => {
    // Start search from first character - instant (no length requirement)
    if (!user || query.length < 1) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Search by name or username - remove @ prefix if present
      const searchTerm = query.startsWith('@') ? query.slice(1) : query;
      
      // Use the secure profiles_search view that exposes only minimal data
      // This protects sensitive user information while allowing search functionality
      const { data, error } = await supabase
        .from('profiles_search')
        .select('id, user_id, name, username, avatar_url, country')
        .or(`name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
        .neq('user_id', user.id)
        .limit(30);

      if (error) {
        console.error('Search query error:', error);
        throw error;
      }

      const formattedResults: SearchedUser[] = (data || []).map(p => ({
        id: p.id,
        userId: p.user_id,
        name: p.name || 'User',
        username: p.username || '',
        avatarUrl: p.avatar_url,
        country: p.country,
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

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
    // Start search from first character - instant (no length requirement)
    if (!user || query.length < 1) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Search by name or username - remove @ prefix if present
      const searchTerm = query.startsWith('@') ? query.slice(1) : query;
      
      // Search profiles with ILIKE for Arabic + English support
      // No minimum length filters - search from first character
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name, username, avatar_url, country, city, rank')
        .or(`name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
        .neq('user_id', user.id)
        .limit(30); // Increased limit for better results

      if (error) {
        console.error('Search query error:', error);
        throw error;
      }

      // REMOVED: restrictive filters that were hiding users
      // Filter only for profiles that have at least some username/name
      const validUsers = (data || []).filter(p => 
        (p.username && p.username.length >= 1) || 
        (p.name && p.name.trim().length > 0)
      );

      const formattedResults: SearchedUser[] = validUsers.map(p => ({
        id: p.id,
        userId: p.user_id,
        name: p.name || 'User',
        username: p.username || '',
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

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getSaudiDateStr } from '@/lib/contestTiming';

interface ContestEngagement {
  hasJoinedToday: boolean;
  hasVotedToday: boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useContestEngagement(): ContestEngagement {
  const { user: authUser } = useAuth();
  const [hasJoinedToday, setHasJoinedToday] = useState(false);
  const [hasVotedToday, setHasVotedToday] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEngagement = useCallback(async () => {
    if (!authUser?.id) {
      setHasJoinedToday(false);
      setHasVotedToday(false);
      setIsLoading(false);
      return;
    }

    try {
      // Use Saudi date for "today"
      const today = getSaudiDateStr();

      // Fetch today's contest
      const { data: contest } = await supabase
        .from('contests')
        .select('id')
        .eq('contest_date', today)
        .maybeSingle();

      if (!contest) {
        setHasJoinedToday(false);
        setHasVotedToday(false);
        setIsLoading(false);
        return;
      }

      // Check if user joined today's contest
      const { data: entry } = await supabase
        .from('contest_entries')
        .select('id')
        .eq('contest_id', contest.id)
        .eq('user_id', authUser.id)
        .maybeSingle();

      setHasJoinedToday(!!entry);

      // Check if user voted today
      const { data: vote } = await supabase
        .from('votes')
        .select('id')
        .eq('contest_id', contest.id)
        .eq('voter_id', authUser.id)
        .limit(1)
        .maybeSingle();

      setHasVotedToday(!!vote);
    } catch (error) {
      console.error('Error fetching contest engagement:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    fetchEngagement();
  }, [fetchEngagement]);

  // Subscribe to realtime changes for instant updates
  useEffect(() => {
    if (!authUser?.id) return;

    const channel = supabase
      .channel('contest-engagement-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contest_entries',
          filter: `user_id=eq.${authUser.id}`,
        },
        () => {
          setHasJoinedToday(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `voter_id=eq.${authUser.id}`,
        },
        () => {
          setHasVotedToday(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser?.id]);

  return {
    hasJoinedToday,
    hasVotedToday,
    isLoading,
    refetch: fetchEngagement,
  };
}

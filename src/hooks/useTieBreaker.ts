import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBanner } from '@/contexts/BannerContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface TiedParticipant {
  id: string;
  name: string;
  username: string;
  votes: number;
  rank: number;
  voteTimestamp?: Date;
}

interface TieBreakerRound {
  id: string;
  contestId: string;
  participantIds: string[];
  startTime: Date;
  endTime: Date;
  duration: number; // in seconds
  status: 'active' | 'completed' | 'cancelled';
  results?: {
    participantId: string;
    additionalVotes: number;
    totalVotes: number;
  }[];
}

interface UseTieBreakerProps {
  contestId: string;
  tiedParticipants: TiedParticipant[];
  isRTL: boolean;
  onTieBreakComplete?: (winnerId: string) => void;
}

export function useTieBreaker({ 
  contestId, 
  tiedParticipants, 
  isRTL, 
  onTieBreakComplete 
}: UseTieBreakerProps) {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useBanner();
  const { language } = useLanguage();
  
  const [activeRound, setActiveRound] = useState<TieBreakerRound | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isVoting, setIsVoting] = useState(false);
  const [roundResults, setRoundResults] = useState<any[]>([]);

  // Check if tie breaker is needed
  const needsTieBreaker = useCallback(() => {
    // Only apply tie breaker for top 3 ranks
    const topRanks = tiedParticipants.filter(p => p.rank <= 3);
    if (topRanks.length < 2) return false;

    // Group by rank
    const rankGroups = topRanks.reduce((groups, participant) => {
      const rank = participant.rank;
      if (!groups[rank]) groups[rank] = [];
      groups[rank].push(participant);
      return groups;
    }, {} as Record<number, TiedParticipant[]>);

    // Check if any rank has multiple participants
    return Object.values(rankGroups).some(group => group.length > 1);
  }, [tiedParticipants]);

  // Start tie breaker round
  const startTieBreaker = useCallback(async () => {
    if (!user || tiedParticipants.length < 2) return;

    try {
      setIsVoting(true);
      
      // Create tie breaker round
      const roundData = {
        contest_id: contestId,
        participant_ids: tiedParticipants.map(p => p.id),
        duration_seconds: 60, // 60 seconds
        status: 'active'
      };

      const { data, error } = await (supabase as any).rpc('create_tie_breaker_round', roundData);
      
      if (error) throw error;

      const round: TieBreakerRound = {
        id: data.round_id,
        contestId,
        participantIds: tiedParticipants.map(p => p.id),
        startTime: new Date(data.start_time),
        endTime: new Date(data.end_time),
        duration: 60,
        status: 'active'
      };

      setActiveRound(round);
      setTimeRemaining(60);

      showSuccess(
        isRTL 
          ? '🔥 جولة فاصلة بدأت! لديك 60 ثانية للتصويت!'
          : '🔥 Tie-breaker round started! You have 60 seconds to vote!'
      );

    } catch (error) {
      console.error('Error starting tie breaker:', error);
      showError(
        isRTL 
          ? 'فشل بدء الجولة الفاصلة'
          : 'Failed to start tie-breaker round'
      );
    } finally {
      setIsVoting(false);
    }
  }, [user, tiedParticipants, contestId, isRTL, showSuccess, showError]);

  // Vote in tie breaker
  const voteInTieBreaker = useCallback(async (participantId: string, voteCount: number) => {
    if (!user || !activeRound || isVoting) return false;

    try {
      setIsVoting(true);

      const { data, error } = await (supabase as any).rpc('vote_in_tie_breaker', {
        p_round_id: activeRound.id,
        p_voter_id: user.id,
        p_participant_id: participantId,
        p_vote_count: voteCount
      });

      if (error) throw error;

      if (data.success) {
        showSuccess(
          isRTL 
            ? `✅ تم التصويت في الجولة الفاصلة!`
            : `✅ Vote cast in tie-breaker round!`
        );
        return true;
      }

    } catch (error) {
      console.error('Error voting in tie breaker:', error);
      showError(
        isRTL 
          ? 'فشل التصويت في الجولة الفاصلة'
          : 'Failed to vote in tie-breaker round'
      );
    } finally {
      setIsVoting(false);
    }

    return false;
  }, [user, activeRound, isVoting, isRTL, showSuccess, showError]);

  // Complete tie breaker
  const completeTieBreaker = useCallback(async () => {
    if (!activeRound) return;

    try {
      const { data, error } = await (supabase as any).rpc('complete_tie_breaker_round', {
        p_round_id: activeRound.id
      });

      if (error) throw error;

      if (data.success && data.results) {
        setRoundResults(data.results);
        
        // Determine winner
        const winner = data.results.reduce((prev: any, current: any) => 
          current.total_votes > prev.total_votes ? current : prev
        );

        // If still tied, use earliest vote timestamp
        if (data.results.filter((r: any) => r.total_votes === winner.total_votes).length > 1) {
          const tiedWinners = data.results.filter((r: any) => r.total_votes === winner.total_votes);
          const earliestWinner = tiedWinners.reduce((prev: any, current: any) => 
            new Date(current.vote_timestamp) < new Date(prev.vote_timestamp) ? current : prev
          );
          
          if (onTieBreakComplete) {
            onTieBreakComplete(earliestWinner.participant_id);
          }
        } else {
          if (onTieBreakComplete) {
            onTieBreakComplete(winner.participant_id);
          }
        }

        setActiveRound(prev => prev ? { ...prev, status: 'completed' } : null);
      }

    } catch (error) {
      console.error('Error completing tie breaker:', error);
      showError(
        isRTL 
          ? 'فشل إكمال الجولة الفاصلة'
          : 'Failed to complete tie-breaker round'
      );
    }
  }, [activeRound, onTieBreakComplete, isRTL, showError]);

  // Timer countdown
  useEffect(() => {
    if (!activeRound || activeRound.status !== 'active') return;

    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((activeRound.endTime.getTime() - now.getTime()) / 1000));
      
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        completeTieBreaker();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRound, completeTieBreaker]);

  // Auto-complete when time is up
  useEffect(() => {
    if (timeRemaining === 0 && activeRound?.status === 'active') {
      completeTieBreaker();
    }
  }, [timeRemaining, activeRound, completeTieBreaker]);

  return {
    needsTieBreaker,
    activeRound,
    timeRemaining,
    isVoting,
    roundResults,
    startTieBreaker,
    voteInTieBreaker,
    completeTieBreaker
  };
}

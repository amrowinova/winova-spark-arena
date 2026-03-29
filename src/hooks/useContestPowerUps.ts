import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBanner } from '@/contexts/BannerContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface PowerUp {
  id: string;
  type: 'double_vote' | 'momentum' | 'shield';
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  available: boolean;
  used?: boolean;
  usedAt?: Date;
}

interface MomentumEvent {
  participantId: string;
  votes: number;
  timestamp: Date;
  userIds: string[];
}

interface ContestPowerUpsProps {
  contestId: string;
  participantId?: string;
  isRTL: boolean;
}

export function useContestPowerUps({ contestId, participantId, isRTL }: ContestPowerUpsProps) {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useBanner();
  const { language } = useLanguage();
  
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [momentumEvents, setMomentumEvents] = useState<MomentumEvent[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Track recent votes for momentum detection
  const recentVotesRef = useRef<Map<string, { count: number; lastVote: Date; userIds: Set<string> }>>(new Map());
  
  // Initialize power-ups based on user activity
  useEffect(() => {
    if (!user) return;
    
    const initializePowerUps = async () => {
      setLoading(true);
      
      try {
        // Check user's daily streak
        const { data: streakData } = await (supabase as any).rpc('get_user_streak', { 
          p_user_id: user.id 
        });
        
        // Check daily missions completion
        const { data: missionsData } = await (supabase as any).rpc('get_completed_missions_today', {
          p_user_id: user.id
        });
        
        const hasDoubleVote = (streakData?.streak_days >= 3) || (missionsData?.completed_count >= 3);
        
        const newPowerUps: PowerUp[] = [
          {
            id: 'double_vote',
            type: 'double_vote',
            name: 'Double Vote',
            nameAr: 'التصويت المزدوج',
            description: 'Vote counts as 2 votes for one time only',
            descriptionAr: 'يحسب التصويت كصوتين لمرة واحدة فقط',
            icon: '⚡',
            available: hasDoubleVote,
            used: false
          },
          {
            id: 'momentum',
            type: 'momentum',
            name: 'Momentum Boost',
            nameAr: 'دفعة الزخم',
            description: 'Triggers when 5 users vote for same contestant in 5 seconds',
            descriptionAr: 'ينشط عندما يصوت 5 مستخدمين لنفس المتسابق في 5 ثوانٍ',
            icon: '🔥',
            available: true, // Always available (team-based)
            used: false
          }
        ];
        
        // Check if already used in this contest
        for (const powerUp of newPowerUps) {
          const { data: usageData } = await (supabase as any).rpc('check_powerup_usage', {
            p_user_id: user.id,
            p_contest_id: contestId,
            p_powerup_type: powerUp.type
          });
          
          if (usageData?.used) {
            powerUp.used = true;
            powerUp.usedAt = new Date(usageData.used_at);
          }
        }
        
        setPowerUps(newPowerUps);
      } catch (error) {
        console.error('Error initializing power-ups:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializePowerUps();
  }, [user, contestId]);

  // Detect momentum events
  const detectMomentum = useCallback((voterId: string, votedParticipantId: string) => {
    const now = new Date();
    const participantKey = votedParticipantId;
    
    // Get or create participant vote tracking
    let participantVotes = recentVotesRef.current.get(participantKey);
    if (!participantVotes) {
      participantVotes = { count: 0, lastVote: now, userIds: new Set() };
      recentVotesRef.current.set(participantKey, participantVotes);
    }
    
    // Add this vote
    participantVotes.userIds.add(voterId);
    participantVotes.count = participantVotes.userIds.size;
    participantVotes.lastVote = now;
    
    // Check for momentum (5 different users in 5 seconds)
    const fiveSecondsAgo = new Date(now.getTime() - 5000);
    if (participantVotes.count >= 5) {
      // Create momentum event
      const momentumEvent: MomentumEvent = {
        participantId: votedParticipantId,
        votes: 50, // Bonus votes
        timestamp: now,
        userIds: Array.from(participantVotes.userIds)
      };
      
      setMomentumEvents(prev => [...prev, momentumEvent]);
      
      // Apply momentum bonus
      applyMomentum(momentumEvent);
      
      // Reset tracking for this participant
      recentVotesRef.current.set(participantKey, { count: 0, lastVote: now, userIds: new Set() });
      
      return true;
    }
    
    return false;
  }, []);

  // Apply momentum bonus to contestant
  const applyMomentum = useCallback(async (momentumEvent: MomentumEvent) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await (supabase as any).rpc('apply_momentum_bonus', {
        p_contest_id: contestId,
        p_participant_id: momentumEvent.participantId,
        p_bonus_votes: momentumEvent.votes,
        p_trigger_user_ids: momentumEvent.userIds
      });
      
      if (error) throw error;
      
      if (data?.success) {
        showSuccess(
          isRTL 
            ? `🔥 لحظة الحسم! 50 صوتاً إضافياً تمت إضافتها!`
            : `🔥 Momentum! 50 bonus votes added!`
        );
        
        // Update power-up usage
        setPowerUps(prev => prev.map(pu => 
          pu.type === 'momentum' 
            ? { ...pu, used: true, usedAt: new Date() }
            : pu
        ));
      }
    } catch (error) {
      console.error('Error applying momentum:', error);
      showError(
        isRTL 
          ? 'فشل تطبيق دفعة الزخم'
          : 'Failed to apply momentum boost'
      );
    } finally {
      setLoading(false);
    }
  }, [user, contestId, isRTL, showSuccess, showError]);

  // Use double vote power-up
  const useDoubleVote = useCallback(async () => {
    if (!user || !participantId) return;
    
    const doubleVotePowerUp = powerUps.find(pu => pu.type === 'double_vote');
    if (!doubleVotePowerUp || doubleVotePowerUp.used || !doubleVotePowerUp.available) {
      showError(
        isRTL 
          ? 'Power-up غير متوفر'
          : 'Power-up not available'
      );
      return false;
    }
    
    try {
      setLoading(true);
      
      const { data, error } = await (supabase as any).rpc('use_double_vote', {
        p_user_id: user.id,
        p_contest_id: contestId,
        p_participant_id: participantId
      });
      
      if (error) throw error;
      
      if (data?.success) {
        showSuccess(
          isRTL 
            ? '⚡ تم استخدام التصويت المزدوج!'
            : '⚡ Double vote activated!'
        );
        
        // Update power-up usage
        setPowerUps(prev => prev.map(pu => 
          pu.type === 'double_vote' 
            ? { ...pu, used: true, usedAt: new Date() }
            : pu
        ));
        
        return true;
      }
    } catch (error) {
      console.error('Error using double vote:', error);
      showError(
        isRTL 
          ? 'فشل استخدام التصويت المزدوج'
          : 'Failed to use double vote'
      );
    } finally {
      setLoading(false);
    }
    
    return false;
  }, [user, contestId, participantId, powerUps, isRTL, showSuccess, showError]);

  // Get available power-ups
  const getAvailablePowerUps = useCallback(() => {
    return powerUps.filter(pu => pu.available && !pu.used);
  }, [powerUps]);

  // Check if user has any power-ups available
  const hasAvailablePowerUps = useCallback(() => {
    return getAvailablePowerUps().length > 0;
  }, [getAvailablePowerUps]);

  // Reset momentum tracking periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const fiveSecondsAgo = new Date(now.getTime() - 5000);
      
      // Clear old momentum data
      for (const [key, data] of recentVotesRef.current.entries()) {
        if (data.lastVote < fiveSecondsAgo) {
          recentVotesRef.current.delete(key);
        }
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
  }, []);

  return {
    powerUps,
    momentumEvents,
    loading,
    detectMomentum,
    useDoubleVote,
    getAvailablePowerUps,
    hasAvailablePowerUps,
    applyMomentum: applyMomentum
  };
}

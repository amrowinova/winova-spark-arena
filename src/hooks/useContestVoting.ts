import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VotingData {
  totalVotes: number;
  lastUpdate: string;
  contestants: Array<{
    contestantId: string;
    name: string;
    avatar?: string;
    country: string;
    votes: number;
    trend: 'up' | 'down' | 'stable';
    lastVotes: number;
  }>;
}

export function useContestVoting() {
  const { user: authUser } = useAuth();
  const [votingData, setVotingData] = useState<VotingData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!authUser) return;

    // Subscribe to real-time voting updates
    const channel = supabase
      .channel('contest-voting')
      .on('broadcast', { event: 'vote_update' }, (payload) => {
        setVotingData(payload.payload);
      })
      .on('broadcast', { event: 'vote_cast' }, (payload) => {
        // Update single contestant votes
        setVotingData(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            totalVotes: prev.totalVotes + 1,
            contestants: prev.contestants.map(contestant => 
              contestant.contestantId === payload.payload.contestantId
                ? {
                    ...contestant,
                    votes: contestant.votes + 1,
                    lastVotes: (contestant.lastVotes || 0) + 1,
                    trend: 'up'
                  }
                : {
                    ...contestant,
                    lastVotes: 0,
                    trend: contestant.votes > 0 ? 'stable' : 'down'
                  }
            ),
            lastUpdate: new Date().toISOString()
          };
        });
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Load initial voting data
    loadVotingData();

    return () => {
      channel.unsubscribe();
    };
  }, [authUser]);

  const loadVotingData = async () => {
    try {
      // In a real app, this would fetch from the database
      // For now, simulate with mock data
      const mockData: VotingData = {
        totalVotes: 15420,
        lastUpdate: new Date().toISOString(),
        contestants: [
          {
            contestantId: '1',
            name: 'Ahmed',
            country: 'SA',
            votes: 3420,
            trend: 'up',
            lastVotes: 15
          },
          {
            contestantId: '2',
            name: 'Sarah',
            country: 'AE',
            votes: 2890,
            trend: 'up',
            lastVotes: 8
          },
          {
            contestantId: '3',
            name: 'Mohammed',
            country: 'EG',
            votes: 2150,
            trend: 'down',
            lastVotes: 0
          },
          {
            contestantId: '4',
            name: 'Fatima',
            country: 'JO',
            votes: 1980,
            trend: 'stable',
            lastVotes: 0
          },
          {
            contestantId: '5',
            name: 'Omar',
            country: 'QA',
            votes: 1650,
            trend: 'up',
            lastVotes: 3
          }
        ]
      };
      
      setVotingData(mockData);
    } catch (error) {
      console.error('Error loading voting data:', error);
    }
  };

  return {
    votingData,
    isConnected,
  };
}

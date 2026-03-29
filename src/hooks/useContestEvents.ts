import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ContestEvent {
  id: string;
  type: 'vote' | 'join' | 'achievement' | 'milestone' | 'chat';
  username: string;
  avatar?: string;
  country: string;
  message: string;
  timestamp: Date;
  metadata?: {
    votes?: number;
    achievement?: string;
    milestone?: string;
  };
}

export function useContestEvents() {
  const { user: authUser } = useAuth();
  const [events, setEvents] = useState<ContestEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!authUser) return;

    // Subscribe to real-time contest events
    const channel = supabase
      .channel('contest-events')
      .on('broadcast', { event: 'contest_event' }, (payload) => {
        const newEvent: ContestEvent = {
          id: payload.payload.id || Date.now().toString(),
          type: payload.payload.type,
          username: payload.payload.username,
          avatar: payload.payload.avatar,
          country: payload.payload.country,
          message: payload.payload.message,
          timestamp: new Date(payload.payload.timestamp),
          metadata: payload.payload.metadata,
        };
        
        setEvents(prev => [...prev, newEvent].slice(-49)); // Keep last 50 events
      })
      .on('broadcast', { event: 'vote_cast' }, (payload) => {
        // Convert vote to event
        const voteEvent: ContestEvent = {
          id: `vote-${Date.now()}`,
          type: 'vote',
          username: payload.payload.username,
          avatar: payload.payload.avatar,
          country: payload.payload.country,
          message: payload.payload.message || `${payload.payload.username} voted!`,
          timestamp: new Date(),
          metadata: {
            votes: 1,
          },
        };
        
        setEvents(prev => [...prev, voteEvent].slice(-49));
      })
      .on('broadcast', { event: 'user_joined' }, (payload) => {
        // Convert join to event
        const joinEvent: ContestEvent = {
          id: `join-${Date.now()}`,
          type: 'join',
          username: payload.payload.username,
          avatar: payload.payload.avatar,
          country: payload.payload.country,
          message: `${payload.payload.username} joined the contest!`,
          timestamp: new Date(),
        };
        
        setEvents(prev => [...prev, joinEvent].slice(-49));
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Load initial events
    loadInitialEvents();

    return () => {
      channel.unsubscribe();
    };
  }, [authUser]);

  const loadInitialEvents = async () => {
    try {
      // Simulate initial events
      const initialEvents: ContestEvent[] = [
        {
          id: '1',
          type: 'join',
          username: 'Ahmed',
          country: 'SA',
          message: 'Ahmed joined the contest!',
          timestamp: new Date(Date.now() - 300000),
        },
        {
          id: '2',
          type: 'vote',
          username: 'Sarah',
          country: 'AE',
          message: 'Sarah voted for the leader!',
          timestamp: new Date(Date.now() - 240000),
          metadata: { votes: 1 },
        },
        {
          id: '3',
          type: 'achievement',
          username: 'Mohammed',
          country: 'EG',
          message: 'Mohammed earned the "Super Voter" badge!',
          timestamp: new Date(Date.now() - 180000),
          metadata: { achievement: 'Super Voter' },
        },
        {
          id: '4',
          type: 'milestone',
          username: 'System',
          country: '',
          message: 'Contest reached 10,000 total votes!',
          timestamp: new Date(Date.now() - 120000),
          metadata: { milestone: '10K Votes' },
        },
        {
          id: '5',
          type: 'chat',
          username: 'Fatima',
          country: 'JO',
          message: 'This contest is so exciting! 🎉',
          timestamp: new Date(Date.now() - 60000),
        },
      ];
      
      setEvents(initialEvents);
    } catch (error) {
      console.error('Error loading initial events:', error);
    }
  };

  return {
    events,
    isConnected,
  };
}

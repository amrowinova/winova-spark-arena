import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';

interface ContestMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  country: string;
  message: string;
  timestamp: Date;
  isSystem?: boolean;
}

export function useContestChat() {
  const { user: authUser } = useAuth();
  const { user } = useUser();
  const [messages, setMessages] = useState<ContestMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const channelRef = useRef<any>(null);

  // Connect to contest chat channel
  useEffect(() => {
    if (!authUser) return;

    const channel = supabase
      .channel('contest-chat')
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        setParticipantCount(Object.keys(newState).length);
      })
      .on('broadcast', { event: 'message' }, (payload) => {
        const newMessage: ContestMessage = {
          id: payload.payload.id || Date.now().toString(),
          userId: payload.payload.userId,
          username: payload.payload.username,
          avatar: payload.payload.avatar,
          country: payload.payload.country,
          message: payload.payload.message,
          timestamp: new Date(payload.payload.timestamp),
          isSystem: payload.payload.isSystem,
        };
        
        setMessages(prev => [...prev.slice(-49), newMessage]); // Keep last 50 messages
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          // Join presence
          channel.track({
            user_id: authUser.id,
            username: user.username,
            avatar: user.avatar,
            country: user.country,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    // Load recent messages
    loadRecentMessages();

    return () => {
      channel.unsubscribe();
    };
  }, [authUser, user]);

  const loadRecentMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('contest_chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data) {
        const formattedMessages: ContestMessage[] = data.map(msg => ({
          id: msg.id,
          userId: msg.user_id,
          username: msg.username,
          avatar: msg.avatar,
          country: msg.country,
          message: msg.message,
          timestamp: new Date(msg.created_at),
          isSystem: msg.is_system,
        })).reverse();

        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading recent messages:', error);
    }
  };

  const sendMessage = useCallback(async (message: string) => {
    if (!authUser || !user || !isConnected) return;

    const messageData = {
      id: Date.now().toString(),
      userId: authUser.id,
      username: user.username,
      avatar: user.avatar,
      country: user.country,
      message,
      timestamp: new Date().toISOString(),
      isSystem: false,
    };

    try {
      // Send to broadcast
      channelRef.current?.send({
        type: 'broadcast',
        event: 'message',
        payload: messageData,
      });

      // Save to database
      await supabase
        .from('contest_chat_messages')
        .insert({
          user_id: authUser.id,
          username: user.username,
          avatar: user.avatar,
          country: user.country,
          message,
          is_system: false,
        });

    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [authUser, user, isConnected]);

  return {
    messages,
    sendMessage,
    isConnected,
    participantCount,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DMConversation {
  id: string;
  participantId: string;
  participantName: string;
  participantUsername: string;
  participantAvatar: string | null;
  participantCountry: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
}

export interface DMMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  contentAr: string | null;
  messageType: string;
  isRead: boolean;
  createdAt: string;
  isMine: boolean;
  transferAmount: number | null;
  transferRecipientId: string | null;
}

export function useDirectMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [messages, setMessages] = useState<Record<string, DMMessage[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Get profile data for each conversation partner
      const conversationsWithProfiles: DMConversation[] = [];
      
      for (const conv of data || []) {
        const partnerId = conv.participant1_id === user.id 
          ? conv.participant2_id 
          : conv.participant1_id;

        const { data: profile } = await supabase
          .from('profiles')
          .select('name, username, avatar_url, country')
          .eq('user_id', partnerId)
          .single();

        // Get last message
        const { data: lastMsg } = await supabase
          .from('direct_messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Count unread
        const { count } = await supabase
          .from('direct_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        conversationsWithProfiles.push({
          id: conv.id,
          participantId: partnerId,
          participantName: profile?.name || 'Unknown',
          participantUsername: profile?.username || 'unknown',
          participantAvatar: profile?.avatar_url,
          participantCountry: profile?.country || '',
          lastMessage: lastMsg?.content || null,
          lastMessageAt: lastMsg?.created_at || conv.created_at,
          unreadCount: count || 0,
          createdAt: conv.created_at,
        });
      }

      setConversations(conversationsWithProfiles);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender names
      const senderIds = [...new Set(data?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);

      const formattedMessages: DMMessage[] = (data || []).map(m => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        senderName: profileMap.get(m.sender_id) || 'Unknown',
        content: m.content,
        contentAr: m.content_ar,
        messageType: m.message_type,
        isRead: m.is_read,
        createdAt: m.created_at,
        isMine: m.sender_id === user.id,
        transferAmount: m.transfer_amount,
        transferRecipientId: m.transfer_recipient_id,
      }));

      setMessages(prev => ({ ...prev, [conversationId]: formattedMessages }));

      // Mark as read
      await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id);

    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [user]);

  // Get or create conversation with user
  const getOrCreateConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Check if conversation exists (either direction)
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`)
        .single();

      if (existing) return existing.id;

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          participant1_id: user.id,
          participant2_id: otherUserId,
        })
        .select('id')
        .single();

      if (error) throw error;

      await fetchConversations();
      return newConv?.id || null;
    } catch (err) {
      console.error('Error getting/creating conversation:', err);
      return null;
    }
  }, [user, fetchConversations]);

  // Send message
  const sendMessage = useCallback(async (
    conversationId: string, 
    content: string,
    transferAmount?: number,
    transferRecipientId?: string
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          message_type: transferAmount ? 'transfer' : 'text',
          transfer_amount: transferAmount,
          transfer_recipient_id: transferRecipientId,
        });

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      await fetchMessages(conversationId);
      await fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  }, [user, fetchMessages, fetchConversations]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    fetchConversations();

    const channel = supabase
      .channel('dm-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Refresh if we're in this conversation
          if (messages[newMsg.conversation_id]) {
            fetchMessages(newMsg.conversation_id);
          }
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations, fetchMessages, messages]);

  return {
    conversations,
    messages,
    isLoading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    getOrCreateConversation,
  };
}

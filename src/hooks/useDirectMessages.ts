import { useState, useEffect, useCallback, useRef } from 'react';
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
  // Optimistic UI fields
  isPending?: boolean;
  tempId?: string;
}

export function useDirectMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [messages, setMessages] = useState<Record<string, DMMessage[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const activeConversationRef = useRef<string | null>(null);
  const conversationsRef = useRef<DMConversation[]>([]);
  
  // Keep conversationsRef in sync
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Fetch all conversations with optimized queries
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Get all partner IDs for batch profile fetch
      const partnerIds = (data || []).map(conv => 
        conv.participant1_id === user.id ? conv.participant2_id : conv.participant1_id
      );

      // Batch fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, username, avatar_url, country')
        .in('user_id', partnerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Build conversations with profiles
      const conversationsWithProfiles: DMConversation[] = [];
      
      for (const conv of data || []) {
        const partnerId = conv.participant1_id === user.id 
          ? conv.participant2_id 
          : conv.participant1_id;

        const profile = profileMap.get(partnerId);

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

  // Send message with OPTIMISTIC UI - instant local display
  const sendMessage = useCallback(async (
    conversationId: string, 
    content: string,
    transferAmount?: number,
    transferRecipientId?: string
  ) => {
    if (!user) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const now = new Date().toISOString();
    
    // OPTIMISTIC: Add message to local state IMMEDIATELY
    const optimisticMessage: DMMessage = {
      id: tempId,
      conversationId,
      senderId: user.id,
      senderName: user.user_metadata?.name || 'You',
      content,
      contentAr: null,
      messageType: transferAmount ? 'transfer' : 'text',
      isRead: false,
      createdAt: now,
      isMine: true,
      transferAmount: transferAmount || null,
      transferRecipientId: transferRecipientId || null,
      isPending: true,
      tempId,
    };

    // Update messages state instantly
    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimisticMessage],
    }));

    // Update conversation list instantly
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, lastMessage: content, lastMessageAt: now }
        : conv
    ).sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    }));

    try {
      // Insert to DB (background)
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          message_type: transferAmount ? 'transfer' : 'text',
          transfer_amount: transferAmount,
          transfer_recipient_id: transferRecipientId,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Replace temp message with real one
      setMessages(prev => {
        const convMessages = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: convMessages.map(m => 
            m.tempId === tempId 
              ? { ...m, id: data.id, isPending: false, tempId: undefined }
              : m
          ),
        };
      });

      // Update conversation timestamp (background)
      await supabase
        .from('conversations')
        .update({ last_message_at: now })
        .eq('id', conversationId);

    } catch (err) {
      console.error('Error sending message:', err);
      // Mark message as failed but keep it visible
      setMessages(prev => {
        const convMessages = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: convMessages.map(m => 
            m.tempId === tempId 
              ? { ...m, isPending: false }
              : m
          ),
        };
      });
    }
  }, [user]);

  // Set active conversation for read tracking
  const setActiveConversation = useCallback((conversationId: string | null) => {
    activeConversationRef.current = conversationId;
    
    // Mark as read when opening conversation
    if (conversationId && user) {
      supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false)
        .then(() => {
          // Update local state
          setConversations(prev => 
            prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
          );
        });
    }
  }, [user]);

  // Subscribe to realtime updates - ULTRA INSTANT with optimistic updates
  useEffect(() => {
    if (!user) return;

    fetchConversations();

    // Profile cache for instant lookups
    const profileCache = new Map<string, { name: string; username: string; avatar: string | null }>();
    
    const getProfileInfo = async (userId: string) => {
      if (profileCache.has(userId)) return profileCache.get(userId)!;
      
      const { data } = await supabase
        .from('profiles')
        .select('name, username, avatar_url')
        .eq('user_id', userId)
        .single();
      
      const info = { 
        name: data?.name || 'Unknown', 
        username: data?.username || 'user',
        avatar: data?.avatar_url || null 
      };
      profileCache.set(userId, info);
      return info;
    };

    // Pre-cache current conversation participants from ref
    conversationsRef.current.forEach(conv => {
      if (!profileCache.has(conv.participantId)) {
        profileCache.set(conv.participantId, {
          name: conv.participantName,
          username: conv.participantUsername,
          avatar: conv.participantAvatar
        });
      }
    });

    const channel = supabase
      .channel('dm-ultra-instant')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        async (payload) => {
          const newMsg = payload.new as any;
          
          // Skip my own messages (already added optimistically)
          if (newMsg.sender_id === user.id) return;
          
          // INSTANT UI UPDATE FIRST - before any async operations
          const now = newMsg.created_at;
          const conversationId = newMsg.conversation_id;
          const isActiveConv = activeConversationRef.current === conversationId;
          
          // Update conversations list IMMEDIATELY (optimistic)
          setConversations(prev => {
            const existingConv = prev.find(c => c.id === conversationId);
            
            if (existingConv) {
              // Update existing conversation instantly
              const updated = prev.map(conv => 
                conv.id === conversationId 
                  ? { 
                      ...conv, 
                      lastMessage: newMsg.content, 
                      lastMessageAt: now,
                      unreadCount: isActiveConv ? 0 : conv.unreadCount + 1,
                    }
                  : conv
              );
              
              // Sort by newest first
              return updated.sort((a, b) => {
                const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                return bTime - aTime;
              });
            }
            
            return prev; // Will handle new conversation below
          });

          // Now do async verification in background
          const { data: conv } = await supabase
            .from('conversations')
            .select('participant1_id, participant2_id')
            .eq('id', conversationId)
            .single();
          
          if (!conv) return;
          if (conv.participant1_id !== user.id && conv.participant2_id !== user.id) return;
          
          // Get sender info (use cache if available)
          const senderInfo = await getProfileInfo(newMsg.sender_id);
          
          // Add message to local state
          const formattedMessage: DMMessage = {
            id: newMsg.id,
            conversationId: newMsg.conversation_id,
            senderId: newMsg.sender_id,
            senderName: senderInfo.name,
            content: newMsg.content,
            contentAr: newMsg.content_ar,
            messageType: newMsg.message_type,
            isRead: newMsg.is_read,
            createdAt: newMsg.created_at,
            isMine: false,
            transferAmount: newMsg.transfer_amount,
            transferRecipientId: newMsg.transfer_recipient_id,
          };

          setMessages(prev => {
            const convMessages = prev[conversationId] || [];
            // Avoid duplicates
            if (convMessages.some(m => m.id === newMsg.id)) return prev;
            return {
              ...prev,
              [conversationId]: [...convMessages, formattedMessage],
            };
          });
          
          // Handle new conversation that doesn't exist in state
          setConversations(prev => {
            const exists = prev.some(c => c.id === conversationId);
            if (!exists) {
              // Add new conversation to list
              const partnerId = conv.participant1_id === user.id 
                ? conv.participant2_id 
                : conv.participant1_id;
              
              const newConv: DMConversation = {
                id: conversationId,
                participantId: partnerId,
                participantName: senderInfo.name,
                participantUsername: senderInfo.username,
                participantAvatar: senderInfo.avatar,
                participantCountry: '',
                lastMessage: newMsg.content,
                lastMessageAt: now,
                unreadCount: isActiveConv ? 0 : 1,
                createdAt: now,
              };
              
              return [newConv, ...prev];
            }
            return prev;
          });

          // If viewing this conversation, mark as read immediately
          if (isActiveConv) {
            supabase
              .from('direct_messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
              .then(() => {
                setConversations(prev => 
                  prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
                );
              });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const updatedMsg = payload.new as any;
          
          // DIRECT STATE UPDATE for read status
          setMessages(prev => {
            const convMessages = prev[updatedMsg.conversation_id];
            if (!convMessages) return prev;
            
            return {
              ...prev,
              [updatedMsg.conversation_id]: convMessages.map(m => 
                m.id === updatedMsg.id 
                  ? { ...m, isRead: updatedMsg.is_read }
                  : m
              ),
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        },
        async (payload) => {
          const newConv = payload.new as any;
          
          // Check if I'm part of this conversation
          if (newConv.participant1_id !== user.id && newConv.participant2_id !== user.id) return;
          
          // Add to state immediately
          const partnerId = newConv.participant1_id === user.id 
            ? newConv.participant2_id 
            : newConv.participant1_id;
          
          const partnerInfo = await getProfileInfo(partnerId);
          
          setConversations(prev => {
            if (prev.some(c => c.id === newConv.id)) return prev;
            
            const conv: DMConversation = {
              id: newConv.id,
              participantId: partnerId,
              participantName: partnerInfo.name,
              participantUsername: partnerInfo.username,
              participantAvatar: partnerInfo.avatar,
              participantCountry: '',
              lastMessage: null,
              lastMessageAt: newConv.created_at,
              unreadCount: 0,
              createdAt: newConv.created_at,
            };
            
            return [conv, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    messages,
    isLoading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    getOrCreateConversation,
    setActiveConversation,
  };
}

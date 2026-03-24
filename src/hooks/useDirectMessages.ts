import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';
const AI_SYSTEM_USER_NAME = 'WINOVA Intelligence';
const AI_SYSTEM_USER_USERNAME = 'ai.intelligence';

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
  imageUrl: string | null;
  replyToId: string | null;
  replyToContent: string | null;
  replyToSender: string | null;
  deletedAt: string | null;
  reactions: Array<{ emoji: string; count: number; userReacted: boolean }>;
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

  // Fetch all conversations in a SINGLE RPC call — eliminates N+1
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_dm_conversations');

      if (error) throw error;

      const conversationsWithProfiles: DMConversation[] = (data || []).map((row: any) => ({
        id: row.conversation_id,
        participantId: row.partner_id,
        participantName: row.partner_id === AI_SYSTEM_USER_ID ? AI_SYSTEM_USER_NAME : (row.partner_name || 'Unknown'),
        participantUsername: row.partner_id === AI_SYSTEM_USER_ID ? AI_SYSTEM_USER_USERNAME : (row.partner_username || 'user'),
        participantAvatar: row.partner_avatar,
        participantCountry: row.partner_country || '',
        lastMessage: row.last_message || null,
        lastMessageAt: row.last_message_at || row.created_at,
        unreadCount: Number(row.unread_count) || 0,
        createdAt: row.created_at,
      }));

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

      // Fetch reactions for these messages
      const messageIds = (data || []).map(m => m.id);
      let reactionsMap: Record<string, Array<{ emoji: string; user_id: string }>> = {};
      if (messageIds.length > 0) {
        const { data: reactionsData } = await (supabase as any)
          .from('dm_message_reactions')
          .select('message_id, emoji, user_id')
          .in('message_id', messageIds);
        for (const r of (reactionsData || []) as any[]) {
          if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = [];
          reactionsMap[r.message_id].push({ emoji: r.emoji, user_id: r.user_id });
        }
      }

      const formattedMessages: DMMessage[] = (data || []).map(m => {
        const rawReactions = reactionsMap[m.id] || [];
        const reactionSummary = rawReactions.reduce<Array<{ emoji: string; count: number; userReacted: boolean }>>((acc, r) => {
          const existing = acc.find(x => x.emoji === r.emoji);
          if (existing) {
            existing.count++;
            if (r.user_id === user.id) existing.userReacted = true;
          } else {
            acc.push({ emoji: r.emoji, count: 1, userReacted: r.user_id === user.id });
          }
          return acc;
        }, []);

        return {
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
          imageUrl: (m as any).image_url || null,
          replyToId: (m as any).reply_to_id || null,
          replyToContent: (m as any).reply_to_content || null,
          replyToSender: (m as any).reply_to_sender || null,
          deletedAt: (m as any).deleted_at || null,
          reactions: reactionSummary,
        };
      });

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
    transferRecipientId?: string,
    imageUrl?: string,
    replyToId?: string,
    replyToContent?: string,
    replyToSender?: string,
  ) => {
    if (!user) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const now = new Date().toISOString();

    let messageType = 'text';
    if (transferAmount) messageType = 'transfer';
    else if (imageUrl) messageType = 'image';

    // OPTIMISTIC: Add message to local state IMMEDIATELY
    const optimisticMessage: DMMessage = {
      id: tempId,
      conversationId,
      senderId: user.id,
      senderName: user.user_metadata?.name || 'You',
      content,
      contentAr: null,
      messageType,
      isRead: false,
      createdAt: now,
      isMine: true,
      transferAmount: transferAmount || null,
      transferRecipientId: transferRecipientId || null,
      imageUrl: imageUrl || null,
      replyToId: replyToId || null,
      replyToContent: replyToContent || null,
      replyToSender: replyToSender || null,
      deletedAt: null,
      reactions: [],
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
          message_type: messageType,
          transfer_amount: transferAmount,
          transfer_recipient_id: transferRecipientId,
          image_url: imageUrl || null,
          reply_to_id: replyToId || null,
          reply_to_content: replyToContent || null,
          reply_to_sender: replyToSender || null,
        } as any)
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

  // Soft-delete a message
  const deleteMessage = useCallback(async (conversationId: string, messageId: string) => {
    if (!user) return;
    const now = new Date().toISOString();

    // Optimistic update
    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(m =>
        m.id === messageId ? { ...m, deletedAt: now } : m
      ),
    }));

    await supabase
      .from('direct_messages')
      .update({ deleted_at: now } as any)
      .eq('id', messageId)
      .eq('sender_id', user.id);
  }, [user]);

  // Toggle reaction (add if not present, remove if already reacted)
  const toggleReaction = useCallback(async (conversationId: string, messageId: string, emoji: string) => {
    if (!user) return;

    const msgs = messages[conversationId] || [];
    const msg = msgs.find(m => m.id === messageId);
    if (!msg) return;

    const alreadyReacted = msg.reactions.some(r => r.emoji === emoji && r.userReacted);

    // Optimistic update
    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(m => {
        if (m.id !== messageId) return m;
        if (alreadyReacted) {
          return {
            ...m,
            reactions: m.reactions
              .map(r => r.emoji === emoji ? { ...r, count: r.count - 1, userReacted: false } : r)
              .filter(r => r.count > 0),
          };
        } else {
          const existing = m.reactions.find(r => r.emoji === emoji);
          if (existing) {
            return { ...m, reactions: m.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, userReacted: true } : r) };
          }
          return { ...m, reactions: [...m.reactions, { emoji, count: 1, userReacted: true }] };
        }
      }),
    }));

    if (alreadyReacted) {
      await (supabase as any)
        .from('dm_message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
    } else {
      await (supabase
        .from('dm_message_reactions') as any)
        .insert({ message_id: messageId, user_id: user.id, emoji });
    }
  }, [user, messages]);

  // Set active conversation for read tracking
  const setActiveConversation = useCallback((conversationId: string | null) => {
    activeConversationRef.current = conversationId;
    
    // Mark as read when opening conversation
    if (conversationId && user) {
      (supabase
        .from('direct_messages') as any)
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false)
        .then(() => {
          setConversations(prev =>
            prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
          );
        })
        .catch((err: any) => {
          console.error('Failed to mark messages as read:', err);
        });
    }
  }, [user]);

  // Listen for notification-triggered message events - SYNC with notifications
  // Use a ref to track the last processed event timestamp to avoid duplicate processing
  const lastProcessedEventRef = useRef<string | null>(null);
  
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent<{
      id: string;
      conversationId: string;
      senderId: string;
      senderName: string;
      senderUsername: string;
      content: string;
      createdAt: string;
      messageType: string;
    }>) => {
      const msg = event.detail;
      
      // Prevent duplicate processing
      const eventKey = `${msg.id}-${msg.createdAt}`;
      if (lastProcessedEventRef.current === eventKey) return;
      lastProcessedEventRef.current = eventKey;
      
      const isActiveConv = activeConversationRef.current === msg.conversationId;
      
      // Update conversations list INSTANTLY - same moment as notification
      setConversations(prev => {
        const existingConv = prev.find(c => c.id === msg.conversationId);
        
        if (existingConv) {
          const updated = prev.map(conv => 
            conv.id === msg.conversationId 
              ? { 
                  ...conv, 
                  lastMessage: msg.content, 
                  lastMessageAt: msg.createdAt,
                  unreadCount: isActiveConv ? 0 : conv.unreadCount + 1,
                }
              : conv
          );
          
          // Sort by latest message
          return updated.sort((a, b) => {
            const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return bTime - aTime;
          });
        }
        
        // New conversation - add it
        const newConv: DMConversation = {
          id: msg.conversationId,
          participantId: msg.senderId,
          participantName: msg.senderName,
          participantUsername: msg.senderUsername,
          participantAvatar: null,
          participantCountry: '',
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: isActiveConv ? 0 : 1,
          createdAt: msg.createdAt,
        };
        
        return [newConv, ...prev];
      });
      
      // Also add to messages if we have this conversation loaded
      const formattedMessage: DMMessage = {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.content,
        contentAr: null,
        messageType: msg.messageType,
        isRead: false,
        createdAt: msg.createdAt,
        isMine: false,
        transferAmount: null,
        transferRecipientId: null,
        imageUrl: null,
        replyToId: null,
        replyToContent: null,
        replyToSender: null,
        deletedAt: null,
        reactions: [],
      };
      
      setMessages(prev => {
        const convMessages = prev[msg.conversationId] || [];
        // Check if message already exists
        if (convMessages.some(m => m.id === msg.id)) return prev;
        return {
          ...prev,
          [msg.conversationId]: [...convMessages, formattedMessage],
        };
      });
      
      // Mark as read if viewing this conversation
      if (isActiveConv) {
        (supabase
          .from('direct_messages') as any)
          .update({ is_read: true })
          .eq('id', msg.id)
          .then(() => {})
          .catch((err: any) => {
            console.error('Failed to mark message as read:', err);
          });
      }
    };
    
    window.addEventListener('dm-message-received', handleNewMessage as EventListener);
    return () => {
      window.removeEventListener('dm-message-received', handleNewMessage as EventListener);
    };
  }, []);

  // Ref to track if initial fetch is complete - prevents overwriting realtime updates
  const initialFetchDoneRef = useRef(false);
  
  // Subscribe to realtime updates - backup for own messages and read status
  useEffect(() => {
    if (!user) return;

    // Mark initial fetch as not done
    initialFetchDoneRef.current = false;
    
    fetchConversations().then(() => {
      initialFetchDoneRef.current = true;
    });

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

    // Scoped realtime — only listen to user's conversations
    const setupChannel = async () => {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

      const convIds = convs?.map(c => c.id) || [];

      const channel = supabase
        .channel('dm-realtime-backup')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            ...(convIds.length > 0 ? { filter: `conversation_id=in.(${convIds.join(',')})` } : {}),
          },
          async (payload) => {
            const newMsg = payload.new as any;
            // Skip messages from others - handled by event listener from notifications
            if (newMsg.sender_id !== user.id) return;
            // Our own message - already added optimistically, just skip
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'direct_messages',
            ...(convIds.length > 0 ? { filter: `conversation_id=in.(${convIds.join(',')})` } : {}),
          },
          (payload) => {
            const updatedMsg = payload.new as any;
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
            table: 'dm_message_reactions',
          },
          (payload) => {
            const r = payload.new as { message_id: string; emoji: string; user_id: string };
            setMessages(prev => {
              // Find which conversation contains this message
              for (const [convId, msgs] of Object.entries(prev)) {
                const msgIdx = msgs.findIndex(m => m.id === r.message_id);
                if (msgIdx === -1) continue;
                const msg = msgs[msgIdx];
                // Skip own reactions (already optimistically updated)
                if (r.user_id === user.id) return prev;
                const existing = msg.reactions.find(rx => rx.emoji === r.emoji);
                const newReactions = existing
                  ? msg.reactions.map(rx => rx.emoji === r.emoji ? { ...rx, count: rx.count + 1 } : rx)
                  : [...msg.reactions, { emoji: r.emoji, count: 1, userReacted: false }];
                return {
                  ...prev,
                  [convId]: msgs.map((m, i) => i === msgIdx ? { ...m, reactions: newReactions } : m),
                };
              }
              return prev;
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'dm_message_reactions',
          },
          (payload) => {
            const r = payload.old as { message_id: string; emoji: string; user_id: string };
            if (r.user_id === user.id) return; // Already optimistically updated
            setMessages(prev => {
              for (const [convId, msgs] of Object.entries(prev)) {
                const msgIdx = msgs.findIndex(m => m.id === r.message_id);
                if (msgIdx === -1) continue;
                const msg = msgs[msgIdx];
                const newReactions = msg.reactions
                  .map(rx => rx.emoji === r.emoji ? { ...rx, count: rx.count - 1 } : rx)
                  .filter(rx => rx.count > 0);
                return {
                  ...prev,
                  [convId]: msgs.map((m, i) => i === msgIdx ? { ...m, reactions: newReactions } : m),
                };
              }
              return prev;
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
            if (newConv.participant1_id !== user.id && newConv.participant2_id !== user.id) return;
            const partnerId = newConv.participant1_id === user.id ? newConv.participant2_id : newConv.participant1_id;
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

      return channel;
    };

    let channelRef: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    setupChannel().then(ch => {
      if (isMounted) channelRef = ch;
      else supabase.removeChannel(ch);
    }).catch(err => {
      console.error('Failed to setup DM channel:', err);
    });

    return () => {
      isMounted = false;
      if (channelRef) supabase.removeChannel(channelRef);
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    messages,
    isLoading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    deleteMessage,
    toggleReaction,
    getOrCreateConversation,
    setActiveConversation,
  };
}

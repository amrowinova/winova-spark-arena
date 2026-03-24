import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeamConversation {
  id: string;
  leaderId: string;
  leaderName: string;
  leaderUsername: string;
  leaderAvatarUrl: string | null;
  memberCount: number;
  userRole: 'leader' | 'member' | 'viewer';
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageType: string | null;
  unreadCount: number;
}

export interface TeamMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  messageType: 'text' | 'system' | 'announcement';
  createdAt: string;
  isMine: boolean;
  replyToId: string | null;
  replyToContent: string | null;
  replyToSender: string | null;
  reactions: Array<{ emoji: string; count: number; userReacted: boolean }>;
}

export function useTeamChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<TeamConversation[]>([]);
  const [messages, setMessages] = useState<Record<string, TeamMessage[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConvRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  // Fetch conversations via RPC
  const fetchConversations = useCallback(async () => {
    if (!user?.id) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_team_conversations', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error fetching team conversations:', error);
        return;
      }

      const mapped: TeamConversation[] = (data || []).map((c: any) => ({
        id: c.conversation_id,
        leaderId: c.leader_id,
        leaderName: c.leader_name || 'Unknown',
        leaderUsername: c.leader_username || 'unknown',
        leaderAvatarUrl: c.leader_avatar_url,
        memberCount: Number(c.member_count) || 0,
        userRole: c.user_role as 'leader' | 'member' | 'viewer',
        lastMessage: c.last_message,
        lastMessageAt: c.last_message_at,
        lastMessageType: c.last_message_type,
        unreadCount: Number(c.unread_count) || 0,
      }));

      setConversations(mapped);
    } catch (err) {
      console.error('Error fetching team conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('team_messages')
      .select('id, conversation_id, sender_id, content, message_type, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      console.error('Error fetching team messages:', error);
      return;
    }

    // Fetch sender profiles
    const senderIds = [...new Set((data || []).map(m => m.sender_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, username, avatar_url')
      .in('user_id', senderIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // Fetch reactions
    const msgIds = (data || []).map(m => m.id);
    let reactionsMap: Record<string, Array<{ emoji: string; user_id: string }>> = {};
    if (msgIds.length > 0) {
      const { data: rxData } = await (supabase
        .from('team_message_reactions') as any)
        .select('message_id, emoji, user_id')
        .in('message_id', msgIds);
      for (const r of (rxData || []) as any[]) {
        if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = [];
        reactionsMap[r.message_id].push({ emoji: r.emoji, user_id: r.user_id });
      }
    }

    const mapped: TeamMessage[] = (data || []).map(m => {
      const profile = profileMap.get(m.sender_id);
      const rawRx = reactionsMap[m.id] || [];
      const reactionSummary = rawRx.reduce<Array<{ emoji: string; count: number; userReacted: boolean }>>((acc, r) => {
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
        senderName: profile?.name || 'Unknown',
        senderAvatar: profile?.avatar_url || null,
        content: m.content,
        messageType: m.message_type as 'text' | 'system' | 'announcement',
        createdAt: m.created_at,
        isMine: m.sender_id === user.id,
        replyToId: (m as any).reply_to_id || null,
        replyToContent: (m as any).reply_to_content || null,
        replyToSender: (m as any).reply_to_sender || null,
        reactions: reactionSummary,
      };
    });

    setMessages(prev => ({ ...prev, [conversationId]: mapped }));
  }, [user?.id]);

  // Toggle reaction
  const toggleReaction = useCallback(async (conversationId: string, messageId: string, emoji: string) => {
    if (!user?.id) return;
    const msgs = messages[conversationId] || [];
    const msg = msgs.find(m => m.id === messageId);
    if (!msg) return;
    const alreadyReacted = msg.reactions.some(r => r.emoji === emoji && r.userReacted);

    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(m => {
        if (m.id !== messageId) return m;
        if (alreadyReacted) {
          return { ...m, reactions: m.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, userReacted: false } : r).filter(r => r.count > 0) };
        }
        const existing = m.reactions.find(r => r.emoji === emoji);
        if (existing) return { ...m, reactions: m.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, userReacted: true } : r) };
        return { ...m, reactions: [...m.reactions, { emoji, count: 1, userReacted: true }] };
      }),
    }));

    if (alreadyReacted) {
      await supabase.from('team_message_reactions').delete()
        .eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji);
    } else {
      await supabase.from('team_message_reactions').insert({ message_id: messageId, user_id: user.id, emoji } as any);
    }
  }, [user?.id, messages]);

  // Send a message
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    messageType: 'text' | 'announcement' = 'text',
    replyToId?: string,
    replyToContent?: string,
    replyToSender?: string,
  ) => {
    if (!user?.id || !content.trim()) return;

    // Optimistic insert
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: TeamMessage = {
      id: tempId,
      conversationId,
      senderId: user.id,
      senderName: 'You',
      senderAvatar: null,
      content: content.trim(),
      messageType,
      createdAt: new Date().toISOString(),
      isMine: true,
      replyToId: replyToId || null,
      replyToContent: replyToContent || null,
      replyToSender: replyToSender || null,
      reactions: [],
    };

    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimisticMsg],
    }));

    const { error } = await supabase
      .from('team_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        message_type: messageType,
        reply_to_id: replyToId || null,
        reply_to_content: replyToContent || null,
        reply_to_sender: replyToSender || null,
      } as any);

    if (error) {
      console.error('Error sending team message:', error);
      // Remove optimistic message on failure
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(m => m.id !== tempId),
      }));
    }
  }, [user?.id]);

  // Realtime subscription - scoped to user's conversations
  useEffect(() => {
    if (!user?.id || conversations.length === 0) return;

    const convIds = conversations.map(c => c.id);
    const filter = `conversation_id=in.(${convIds.join(',')})`;

    const channel = supabase
      .channel('team-chat-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_message_reactions',
        },
        (payload) => {
          const r = payload.new as { message_id: string; emoji: string; user_id: string };
          if (r.user_id === user.id) return; // Already optimistically updated
          setMessages(prev => {
            for (const [convId, msgs] of Object.entries(prev)) {
              const msgIdx = msgs.findIndex(m => m.id === r.message_id);
              if (msgIdx === -1) continue;
              const msg = msgs[msgIdx];
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
          table: 'team_message_reactions',
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
          table: 'team_messages',
          filter,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          
          // Skip if it's my own message (already optimistically added)
          if (newMsg.sender_id === user.id) {
            // Replace temp message with real one
            setMessages(prev => {
              const convMsgs = prev[newMsg.conversation_id] || [];
              const hasTempMsg = convMsgs.some(m => m.id.startsWith('temp-') && m.content === newMsg.content);
              if (hasTempMsg) {
                return {
                  ...prev,
                  [newMsg.conversation_id]: convMsgs.map(m =>
                    m.id.startsWith('temp-') && m.content === newMsg.content
                      ? { ...m, id: newMsg.id }
                      : m
                  ),
                };
              }
              return prev;
            });
            return;
          }

          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('user_id', newMsg.sender_id)
            .single();

          const teamMessage: TeamMessage = {
            id: newMsg.id,
            conversationId: newMsg.conversation_id,
            senderId: newMsg.sender_id,
            senderName: profile?.name || 'Unknown',
            senderAvatar: profile?.avatar_url || null,
            content: newMsg.content,
            messageType: newMsg.message_type,
            createdAt: newMsg.created_at,
            isMine: false,
            replyToId: newMsg.reply_to_id || null,
            replyToContent: newMsg.reply_to_content || null,
            replyToSender: newMsg.reply_to_sender || null,
            reactions: [],
          };

          setMessages(prev => ({
            ...prev,
            [newMsg.conversation_id]: [...(prev[newMsg.conversation_id] || []), teamMessage],
          }));

          // Update conversation list
          setConversations(prev =>
            prev.map(c =>
              c.id === newMsg.conversation_id
                ? { ...c, lastMessage: newMsg.content, lastMessageAt: newMsg.created_at, lastMessageType: newMsg.message_type }
                : c
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, conversations.length]);

  // Fetch members for a conversation
  const fetchMembers = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from('team_conversation_members')
      .select('user_id, role, joined_at')
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('Error fetching team members:', error);
      return [];
    }

    const userIds = (data || []).map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, username, avatar_url, rank, weekly_active')
      .in('user_id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    return (data || []).map(m => {
      const profile = profileMap.get(m.user_id);
      return {
        id: m.user_id,
        name: profile?.name || 'Unknown',
        username: profile?.username || 'unknown',
        avatarUrl: profile?.avatar_url || null,
        rank: profile?.rank || 'subscriber',
        role: m.role,
        isActive: profile?.weekly_active || false,
        joinedAt: m.joined_at,
      };
    });
  }, []);

  return {
    conversations,
    messages,
    isLoading,
    activeConversationId,
    setActiveConversationId,
    fetchConversations,
    fetchMessages,
    sendMessage,
    fetchMembers,
    toggleReaction,
  };
}

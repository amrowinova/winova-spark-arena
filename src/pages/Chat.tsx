import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Pin, Search, X, Image, Paperclip, Headphones, UserPlus, Loader2, PenLine } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useP2P, P2PChat, P2PMessage } from '@/contexts/P2PContext';
import { useSupport } from '@/contexts/SupportContext';
import { useDirectMessages, DMConversation, DMMessage } from '@/hooks/useDirectMessages';
import { useUserSearch, SearchedUser } from '@/hooks/useUserSearch';
import { useTeamChat, TeamConversation, TeamMessage } from '@/hooks/useTeamChat';
import { useChatListPresence, useGlobalPresence } from '@/hooks/useChatListPresence';
import { useCanAccessAIControlRoom } from '@/hooks/useAIControlRoom';
import { TransferNovaDialog } from '@/components/wallet/TransferNovaDialog';
import { ReceiptDialog } from '@/components/common/ReceiptCard';
import { Receipt } from '@/contexts/TransactionContext';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { TeamChatHeader } from '@/components/chat/TeamChatHeader';
import { MessageBubble, ChatMessage } from '@/components/chat/MessageBubble';
import { DMMessageBubble, DMMessageData } from '@/components/chat/DMMessageBubble';
import { DMChatView } from '@/components/chat/DMChatView';
import { MessageInfoSheet } from '@/components/chat/MessageInfoSheet';
import { SystemMessageBubble, SystemMessageData } from '@/components/chat/SystemMessageBubble';
import { ForwardDialog } from '@/components/chat/ForwardDialog';
import { ReplyBar } from '@/components/chat/ReplyBar';
import { TeamInfoSheet, TeamChatMember } from '@/components/chat/TeamInfoSheet';
import { ChatSearchResults, ConversationResult, UserResult } from '@/components/chat/ChatSearchResults';
import { SupportChatView } from '@/components/chat/SupportChatView';
import { UserSearchSheet } from '@/components/chat/UserSearchSheet';
import { AIRoomView } from '@/components/chat/AIRoomView';
import { TeamChatView } from '@/components/chat/TeamChatView';
import { RankBadge } from '@/components/common/RankBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCountryFlag } from '@/lib/countryFlags';
import { 
  P2PChatHeader, 
  P2POrderCard, 
  P2PPaymentCard, 
  P2PSystemMessage 
} from '@/components/p2p';
import { P2PStatusActions } from '@/components/p2p/P2PStatusActions';
import { useBanner } from '@/contexts/BannerContext';

import type { UserRank } from '@/contexts/UserContext';

interface Conversation {
  id: string;
  type: 'dm' | 'team' | 'p2p' | 'system' | 'ai_system';
  name: string;
  nameAr?: string;
  username?: string;
  avatar: string;
  rank?: UserRank;
  isOnline?: boolean;
  isTyping?: boolean;
  lastSeen?: string;
  lastMessage: string;
  time: string;
  unread: number;
  isSystem?: boolean;
  isMuted?: boolean;
  messages: ChatMessage[];
  pinnedMessages: ChatMessage[];
  // Team-specific
  systemMessages?: SystemMessageData[];
  teamMembers?: TeamChatMember[];
  manager?: {
    id: string;
    name: string;
    nameAr: string;
    avatar: string;
    rank: UserRank;
    active?: boolean;
  };
  // P2P-specific
  p2pChatId?: string;
  // DM-specific (real database DM)
  dmConversationId?: string;
  dmParticipantId?: string;
}

// NO MOCK CONVERSATIONS - all data comes from database
// Team conversations are fetched from team_members table
// DM conversations are fetched via useDirectMessages hook
// P2P chats are fetched via useP2P context

const initialConversations: Conversation[] = [];


function ChatContent() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { chats: p2pChats, activeChat: activeP2PChat, activeOrder, setActiveChat: setActiveP2PChat, setActiveOrder, sendMessage: sendP2PMessage, deleteOrder } = useP2P();
  const { messages: supportMessages, totalUnread: supportUnread, currentTicket } = useSupport();
  
  // Real DM hook
  const { 
    conversations: dmConversations, 
    messages: dmMessages, 
    isLoading: dmLoading,
    fetchMessages: fetchDMMessages,
    sendMessage: sendDMMessage,
    getOrCreateConversation,
    setActiveConversation: setActiveDMConversationId,
  } = useDirectMessages();

  // Team Chat hook
  const {
    conversations: teamConversationsData,
    messages: teamMessages,
    fetchMessages: fetchTeamMessages,
    sendMessage: sendTeamMessage,
    fetchMembers: fetchTeamMembers,
  } = useTeamChat();
  
  // User search hook for inline search
  const { results: userSearchResults, isSearching: isUserSearching, searchUsers, clearResults: clearUserSearch } = useUserSearch();

  // Global presence tracking (who is online)
  const { isUserOnline } = useGlobalPresence();

  // Get all DM conversation IDs for typing tracking
  const dmConversationIds = useMemo(() => 
    dmConversations.map(c => c.id), 
    [dmConversations]
  );

  // Track typing status for all conversations
  const { getStatus: getTypingStatus } = useChatListPresence(dmConversationIds);

  const [selectedTab, setSelectedTab] = useState('dm');
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [activeDMConversation, setActiveDMConversation] = useState<DMConversation | null>(null);
  const [conversations, setConversations] = useState(initialConversations);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [replyToDM, setReplyToDM] = useState<DMMessageData | null>(null);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [forwardDMMessage, setForwardDMMessage] = useState<DMMessageData | null>(null);
  const [messageInfoMessage, setMessageInfoMessage] = useState<DMMessageData | null>(null);
  const [teamInfoOpen, setTeamInfoOpen] = useState(false);
  const [showP2PDetails, setShowP2PDetails] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showAIControlRoom, setShowAIControlRoom] = useState(false);
  const [activeTeamConversation, setActiveTeamConversation] = useState<TeamConversation | null>(null);
  const [activeTeamMembers, setActiveTeamMembers] = useState<TeamChatMember[]>([]);
  
  // Check if user can access AI Control Room
  const { data: canAccessAI } = useCanAccessAIControlRoom();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Track pending user ID to open DM with (from PublicProfile)
  const pendingOpenDmWithRef = useRef<string | null>(null);
  
  // Check if navigated from Help page to open support, or from PublicProfile to open DM
  useEffect(() => {
    if (location.state?.openSupport) {
      setShowSupportChat(true);
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, document.title);
    }
    
    // Handle openDmWith from PublicProfile navigation
    if (location.state?.openDmWith) {
      const targetUserId = location.state.openDmWith;
      pendingOpenDmWithRef.current = targetUserId;
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Track pending conversation ID to open after data loads
  const pendingConversationIdRef = useRef<string | null>(null);
  
  // Check for pending DM conversation from notification click (stored in sessionStorage)
  useEffect(() => {
    const pendingConvId = sessionStorage.getItem('pendingDMConversation');
    if (pendingConvId) {
      sessionStorage.removeItem('pendingDMConversation');
      pendingConversationIdRef.current = pendingConvId;
    }
  }, []);

  // Listen for notification clicks to open specific DM conversation
  useEffect(() => {
    const handleOpenDMConversation = (event: CustomEvent<{ conversationId: string }>) => {
      const { conversationId } = event.detail;
      openConversationById(conversationId);
    };

    window.addEventListener('open-dm-conversation', handleOpenDMConversation as EventListener);
    return () => {
      window.removeEventListener('open-dm-conversation', handleOpenDMConversation as EventListener);
    };
  }, []);

  // Helper to open a conversation by its ID
  const openConversationById = useCallback((conversationId: string) => {
    const dmConv = dmConversations.find(c => c.id === conversationId);
    if (dmConv) {
      // Switch to DM tab
      setSelectedTab('dm');
      // Open the conversation
      setActiveDMConversation(dmConv);
      setActiveDMConversationId(dmConv.id);
      fetchDMMessages(dmConv.id);
      setActiveChat(null);
      setActiveP2PChat(null);
      setShowSupportChat(false);
      // Clear pending
      pendingConversationIdRef.current = null;
    }
  }, [dmConversations, setActiveDMConversationId, fetchDMMessages, setActiveP2PChat]);

  // When dmConversations loads, check if we have a pending conversation to open
  useEffect(() => {
    if (dmConversations.length > 0 && pendingConversationIdRef.current) {
      openConversationById(pendingConversationIdRef.current);
    }
  }, [dmConversations, openConversationById]);

  // Handle opening DM with a specific user (from PublicProfile)
  useEffect(() => {
    const openDmWithUser = async () => {
      const targetUserId = pendingOpenDmWithRef.current;
      if (!targetUserId || dmLoading) return;
      
      // Check if conversation already exists with this user
      const existingConv = dmConversations.find(c => c.participantId === targetUserId);
      
      if (existingConv) {
        // Open existing conversation
        setSelectedTab('dm');
        setActiveDMConversation(existingConv);
        setActiveDMConversationId(existingConv.id);
        fetchDMMessages(existingConv.id);
        setActiveChat(null);
        setActiveP2PChat(null);
        setShowSupportChat(false);
      } else {
        // Create new conversation
        const newConvId = await getOrCreateConversation(targetUserId);
        if (newConvId) {
          // Wait a bit for the conversation to appear in the list
          pendingConversationIdRef.current = newConvId;
        }
      }
      
      // Clear the pending user ID
      pendingOpenDmWithRef.current = null;
    };
    
    if (pendingOpenDmWithRef.current && !dmLoading) {
      openDmWithUser();
    }
  }, [dmConversations, dmLoading, getOrCreateConversation, fetchDMMessages, setActiveDMConversationId, setActiveP2PChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, activeP2PChat?.messages]);

  // Trigger user search when searchQuery changes - MUST be before any early returns
  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      const timer = setTimeout(() => searchUsers(searchQuery), 200);
      return () => clearTimeout(timer);
    } else {
      clearUserSearch();
    }
  }, [searchQuery, searchUsers, clearUserSearch]);
  // Convert P2P chats to conversation format for the list (P2P = order-bound chats only)
  const p2pConversations: Conversation[] = p2pChats.map(chat => {
    const otherParty = chat.buyer.id === user.id ? chat.seller : chat.buyer;
    const latestOrder = chat.orders[chat.orders.length - 1];
    const lastMessage = chat.messages[chat.messages.length - 1];
    
    return {
      id: `p2p-${chat.id}`,
      type: 'p2p' as const,
      name: language === 'ar' ? otherParty.nameAr : otherParty.name,
      username: otherParty.username,
      avatar: '🤝',
      lastMessage: lastMessage?.isSystem 
        ? (language === 'ar' ? lastMessage.systemMessage?.contentAr || '' : lastMessage.systemMessage?.content || '')
        : lastMessage?.content || (language === 'ar' ? 'طلب P2P جديد' : 'New P2P order'),
      time: new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      unread: chat.unreadCount,
      messages: [],
      pinnedMessages: [],
      p2pChatId: chat.id,
    };
  });

  // Convert real DM conversations from database - with typing and online status
  const realDMConversations: Conversation[] = dmConversations.map(conv => {
    const typingStatus = getTypingStatus(conv.id);
    const participantOnline = isUserOnline(conv.participantId);
    
    return {
      id: `dm-${conv.id}`,
      type: 'dm' as const,
      name: conv.participantName,
      username: conv.participantUsername,
      avatar: conv.participantAvatar ? '👤' : '👤',
      isOnline: participantOnline,
      isTyping: typingStatus.isTyping,
      lastMessage: conv.lastMessage || (language === 'ar' ? 'ابدأ المحادثة' : 'Start chatting'),
      time: conv.lastMessageAt 
        ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '',
      unread: conv.unreadCount,
      messages: [],
      pinnedMessages: [],
      // Store the actual conversation ID for fetching
      dmConversationId: conv.id,
      dmParticipantId: conv.participantId,
    } as Conversation & { dmConversationId: string; dmParticipantId: string; isTyping?: boolean };
  });

  // Create support conversation for the list
  const lastSupportMessage = supportMessages[supportMessages.length - 1];
  const supportConversation: Conversation = {
    id: 'support',
    type: 'dm',
    name: language === 'ar' ? 'دعم Winova' : 'Winova Support',
    nameAr: 'دعم Winova',
    username: 'winova_support',
    avatar: '🎧',
    lastMessage: lastSupportMessage 
      ? (lastSupportMessage.type === 'system' 
          ? (language === 'ar' ? 'تم فتح طلب دعم' : 'Support ticket opened')
          : lastSupportMessage.content)
      : (language === 'ar' ? 'تواصل مع فريق الدعم' : 'Contact support team'),
    time: lastSupportMessage?.time || '',
    unread: supportUnread,
    messages: [],
    pinnedMessages: [],
  };

  // Create AI Control Room conversation (only for authorized users)
  const aiControlRoomConversation: Conversation | null = canAccessAI ? {
    id: 'ai-control-room',
    type: 'ai_system',
    name: language === 'ar' ? '🧠 غرفة تحكم AI' : '🧠 AI Control Room',
    nameAr: '🧠 غرفة تحكم AI',
    username: 'ai_system',
    avatar: '🧠',
    lastMessage: language === 'ar' ? 'نقاش تلقائي بين الوكلاء' : 'Automated agent discussions',
    time: '',
    unread: 0,
    messages: [],
    pinnedMessages: [],
  } : null;

  // Convert real team conversations from database
  const realTeamConversations: Conversation[] = teamConversationsData.map(tc => ({
    id: `team-${tc.id}`,
    type: 'team' as const,
    name: tc.userRole === 'leader'
      ? (language === 'ar' ? 'فريقي' : 'My Team')
      : (language === 'ar' ? `فريق ${tc.leaderName}` : `${tc.leaderName}'s Team`),
    nameAr: tc.userRole === 'leader' ? 'فريقي' : `فريق ${tc.leaderName}`,
    avatar: '👥',
    lastMessage: tc.lastMessage || (language === 'ar' ? 'ابدأ المحادثة' : 'Start chatting'),
    time: tc.lastMessageAt
      ? new Date(tc.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '',
    unread: tc.unreadCount,
    messages: [],
    pinnedMessages: [],
    teamMembers: [],
    dmConversationId: tc.id, // reuse field to store team conv ID
  }));

  // Sort DMs by lastMessageAt to ensure newest conversation is at top
  const sortedDMConversations = [...realDMConversations].sort((a, b) => {
    const aTime = (a as any).dmConversationId 
      ? dmConversations.find(d => d.id === (a as any).dmConversationId)?.lastMessageAt || ''
      : '';
    const bTime = (b as any).dmConversationId 
      ? dmConversations.find(d => d.id === (b as any).dmConversationId)?.lastMessageAt || ''
      : '';
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
  
  // Build all conversations with AI Control Room at top if available
  const allConversations = [
    ...(aiControlRoomConversation ? [aiControlRoomConversation] : []),
    supportConversation, 
    ...sortedDMConversations, 
    ...realTeamConversations, 
    ...p2pConversations
  ];
  
  const filteredConversations = allConversations.filter(conv => {
    if (conv.type === 'system') return false;
    if (conv.id === 'ai-control-room') return selectedTab === 'dm'; // Show AI room in DM tab
    if (conv.id === 'support') return selectedTab === 'dm';
    if (selectedTab === 'dm') return conv.type === 'dm' || conv.type === 'ai_system';
    if (selectedTab === 'team') return conv.type === 'team';
    if (selectedTab === 'p2p') return conv.type === 'p2p';
    return false;
  });

  // Calculate unread conversation counts per tab
  const getUnreadCountForTab = (tabType: 'dm' | 'team' | 'p2p') => {
    return allConversations.filter(conv => {
      if (conv.type === 'system') return false;
      if (conv.id === 'support') return tabType === 'dm' && conv.unread > 0;
      return conv.type === tabType && conv.unread > 0;
    }).length;
  };

  const unreadCounts = {
    dm: getUnreadCountForTab('dm'),
    team: getUnreadCountForTab('team'),
    p2p: getUnreadCountForTab('p2p'),
  };

  // Format badge count (max 99+)
  const formatBadgeCount = (count: number) => count > 99 ? '99+' : count.toString();

  const handleSend = () => {
    if (!message.trim()) return;
    
    // P2P Chat
    if (activeP2PChat) {
      sendP2PMessage(activeP2PChat.id, message);
      setMessage('');
      return;
    }
    
    if (!activeChat) return;
    
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: user.name,
      senderId: user.id,
      content: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
      read: false,
      replyTo: replyTo ? { id: replyTo.id, sender: replyTo.sender, content: replyTo.content } : undefined,
    };

    setConversations(prev => 
      prev.map(conv => 
        conv.id === activeChat.id 
          ? { ...conv, messages: [...conv.messages, newMessage], lastMessage: message }
          : conv
      )
    );
    
    setActiveChat(prev => 
      prev ? { ...prev, messages: [...prev.messages, newMessage] } : prev
    );
    
    setMessage('');
    setReplyTo(null);
  };

  const handleTransferComplete = (receipt: Receipt) => {
    if (!activeChat) return;
    
    const transactionMessage: ChatMessage = {
      id: `tx-${Date.now()}`,
      sender: user.name,
      senderId: user.id,
      content: '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
      transaction: {
        type: 'transfer',
        amount: receipt.amount,
        description: language === 'ar' 
          ? `تحويل إلى ${activeChat.name}`
          : `Transfer to ${activeChat.name}`,
        receipt: receipt,
      },
    };

    setConversations(prev => 
      prev.map(conv => 
        conv.id === activeChat.id 
          ? { ...conv, messages: [...conv.messages, transactionMessage] }
          : conv
      )
    );
    
    setActiveChat(prev => 
      prev ? { ...prev, messages: [...prev.messages, transactionMessage] } : prev
    );
  };

  const handleReply = (msg: ChatMessage) => {
    setReplyTo(msg);
  };

  const handleForward = (msg: ChatMessage) => {
    setForwardMessage(msg);
  };

  const { success: showSuccess, error: showError, info: showInfo } = useBanner();

  const handleForwardSubmit = (contactIds: string[]) => {
    if (!forwardMessage || !activeChat) return;
    
    // Create forwarded copies for each contact (mock implementation)
    showSuccess(
      language === 'ar' 
        ? `تم إعادة التوجيه إلى ${contactIds.length} جهة اتصال`
        : `Forwarded to ${contactIds.length} contacts`
    );
  };

  const scrollToMessage = (messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash effect
      element.classList.add('bg-primary/20');
      setTimeout(() => element.classList.remove('bg-primary/20'), 1500);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    showInfo(language === 'ar' ? 'تم النسخ' : 'Copied');
  };

  const handleDelete = (messageId: string) => {
    if (!activeChat) return;
    
    setConversations(prev => 
      prev.map(conv => 
        conv.id === activeChat.id 
          ? { ...conv, messages: conv.messages.filter(m => m.id !== messageId) }
          : conv
      )
    );
    
    setActiveChat(prev => 
      prev ? { ...prev, messages: prev.messages.filter(m => m.id !== messageId) } : prev
    );
  };

  const handlePin = (msg: ChatMessage) => {
    if (!activeChat) return;
    
    const currentPinned = activeChat.pinnedMessages || [];
    if (currentPinned.length >= 3 && !msg.pinned) {
      showError(language === 'ar' ? 'الحد الأقصى 3 رسائل' : 'Maximum 3 pinned messages');
      return;
    }

    const updatedPinned = msg.pinned 
      ? currentPinned.filter(m => m.id !== msg.id)
      : [...currentPinned, { ...msg, pinned: true }];

    setConversations(prev => 
      prev.map(conv => 
        conv.id === activeChat.id 
          ? { 
              ...conv, 
              pinnedMessages: updatedPinned,
              messages: conv.messages.map(m => 
                m.id === msg.id ? { ...m, pinned: !m.pinned } : m
              )
            }
          : conv
      )
    );
    
    setActiveChat(prev => 
      prev ? { 
        ...prev, 
        pinnedMessages: updatedPinned,
        messages: prev.messages.map(m => 
          m.id === msg.id ? { ...m, pinned: !m.pinned } : m
        )
      } : prev
    );
  };

  const handleReact = (messageId: string, emoji: string) => {
    if (!activeChat) return;

    const updateReactions = (messages: ChatMessage[]) => 
      messages.map(m => {
        if (m.id !== messageId) return m;
        
        const currentReactions = m.reactions || [];
        const existingIndex = currentReactions.findIndex(r => r.emoji === emoji);
        
        let newReactions;
        if (existingIndex >= 0) {
          const existing = currentReactions[existingIndex];
          if (existing.userReacted) {
            newReactions = currentReactions.map((r, i) => 
              i === existingIndex ? { ...r, count: r.count - 1, userReacted: false } : r
            ).filter(r => r.count > 0);
          } else {
            newReactions = currentReactions.map((r, i) => 
              i === existingIndex ? { ...r, count: r.count + 1, userReacted: true } : r
            );
          }
        } else {
          newReactions = [...currentReactions, { emoji, count: 1, userReacted: true }];
        }
        
        return { ...m, reactions: newReactions };
      });

    setConversations(prev => 
      prev.map(conv => 
        conv.id === activeChat.id 
          ? { ...conv, messages: updateReactions(conv.messages) }
          : conv
      )
    );
    
    setActiveChat(prev => 
      prev ? { ...prev, messages: updateReactions(prev.messages) } : prev
    );
  };

  const handleToggleMute = () => {
    if (!activeChat) return;
    
    setConversations(prev =>
      prev.map(conv =>
        conv.id === activeChat.id
          ? { ...conv, isMuted: !conv.isMuted }
          : conv
      )
    );
    
    setActiveChat(prev =>
      prev ? { ...prev, isMuted: !prev.isMuted } : prev
    );

    showInfo(
      activeChat.isMuted 
        ? (language === 'ar' ? 'تم إلغاء الكتم' : 'Unmuted')
        : (language === 'ar' ? 'تم الكتم' : 'Muted')
    );
  };

  const handleRemindInactive = () => {
    if (!activeChat?.teamMembers) return;
    const inactiveCount = activeChat.teamMembers.filter(m => !m.active).length;
    showSuccess(
      language === 'ar'
        ? `تم إرسال تذكير إلى ${inactiveCount} عضو غير نشط`
        : `Sent reminder to ${inactiveCount} inactive members`
    );
  };

  const handleOpenConversation = (conv: Conversation) => {
    // Handle AI Control Room specially
    if (conv.id === 'ai-control-room') {
      setShowAIControlRoom(true);
      setActiveChat(null);
      setActiveP2PChat(null);
      setActiveDMConversation(null);
      setShowSupportChat(false);
      return;
    }
    
    // Handle support conversation specially
    if (conv.id === 'support') {
      setShowSupportChat(true);
      setActiveChat(null);
      setActiveP2PChat(null);
      setActiveDMConversation(null);
      setShowAIControlRoom(false);
      return;
    }
    
    // Handle P2P conversations (order-bound chats)
    if (conv.type === 'p2p' && conv.p2pChatId) {
      setActiveP2PChat(conv.p2pChatId);
      setActiveChat(null);
      setActiveDMConversation(null);
      setShowAIControlRoom(false);
      return;
    }
    
    // Handle real DM conversations from database
    if (conv.type === 'dm' && conv.dmConversationId) {
      const dmConv = dmConversations.find(c => c.id === conv.dmConversationId);
      if (dmConv) {
        setActiveDMConversation(dmConv);
        setActiveDMConversationId(dmConv.id); // Mark conversation as active for read tracking
        fetchDMMessages(dmConv.id);
        setActiveChat(null);
        setActiveP2PChat(null);
        setShowAIControlRoom(false);
        return;
      }
    }
    
    // Handle real team conversations from database
    if (conv.type === 'team' && conv.id.startsWith('team-')) {
      const teamConvId = conv.id.replace('team-', '');
      const teamConv = teamConversationsData.find(tc => tc.id === teamConvId);
      if (teamConv) {
        fetchTeamMessages(teamConvId);
        // Fetch members async
        fetchTeamMembers(teamConvId).then(members => {
          setActiveTeamMembers(members.map(m => ({
            id: m.id,
            name: m.name,
            nameAr: m.name,
            username: m.username,
            rank: m.rank as any,
            active: m.isActive,
            avatar: '👤',
            directCount: 0,
            activityRanking: m.isActive ? 0 : 999,
          })));
        });
        setActiveTeamConversation(teamConv);
        setActiveChat(null);
        setActiveP2PChat(null);
        setActiveDMConversation(null);
        setShowAIControlRoom(false);
        setShowSupportChat(false);
        return;
      }
    }

    // Handle mock team/other chats
    setActiveChat(conv);
    setActiveP2PChat(null);
    setActiveDMConversation(null);
    setShowAIControlRoom(false);
  };

  const handleBackFromChat = () => {
    setActiveChat(null);
    setActiveP2PChat(null);
    setActiveDMConversation(null);
    setActiveDMConversationId(null);
    setActiveTeamConversation(null);
    setActiveTeamMembers([]);
    setShowP2PDetails(false);
    setShowSupportChat(false);
    setShowAIControlRoom(false);
    setReplyToDM(null);
  };

  // Handle user selection from search (create/open DM)
  const handleUserSelectedFromSearch = async (user: any, conversationId: string) => {
    const dmConv = dmConversations.find(c => c.id === conversationId);
    if (dmConv) {
      setActiveDMConversation(dmConv);
      fetchDMMessages(conversationId);
    } else {
      // Refetch and then open
      await new Promise(resolve => setTimeout(resolve, 500));
      const updatedConv = dmConversations.find(c => c.id === conversationId);
      if (updatedConv) {
        setActiveDMConversation(updatedConv);
        fetchDMMessages(conversationId);
      }
    }
  };

  // Merge human messages and system messages for team chat
  const getTeamChatContent = () => {
    if (activeChat?.type !== 'team' || !activeChat.systemMessages) {
      return { humanMessages: activeChat?.messages || [], allContent: [] };
    }
    
    // Create a combined timeline with both message types
    const humanMessages = activeChat.messages.map(m => ({ ...m, isSystem: false }));
    const sysMessages = activeChat.systemMessages.map(s => ({ ...s, isSystem: true }));
    
    // For simplicity, interleave them (in real app, sort by timestamp)
    const allContent: Array<{ type: 'human' | 'system'; data: any }> = [];
    
    // Add system messages first (as they appear at specific times)
    sysMessages.forEach((s, i) => {
      if (i < 2) allContent.push({ type: 'system', data: s });
    });
    
    // Add human messages
    humanMessages.forEach(m => allContent.push({ type: 'human', data: m }));
    
    // Add remaining system messages
    sysMessages.slice(2).forEach(s => allContent.push({ type: 'system', data: s }));
    
    return { humanMessages: activeChat.messages, allContent };
  };

  // AI Control Room View
  if (showAIControlRoom) {
    return (
      <AppLayout title={language === 'ar' ? 'الفريق الهندسي' : 'Engineering Team'} showNav={false} showHeader={false}>
        <AIRoomView onBack={() => setShowAIControlRoom(false)} />
      </AppLayout>
    );
  }

  // Support Chat View
  if (showSupportChat) {
    return (
      <AppLayout title={language === 'ar' ? 'دعم Winova' : 'Winova Support'} showNav={false} showHeader={false}>
        <SupportChatView onBack={handleBackFromChat} />
      </AppLayout>
    );
  }

  // Active Team Chat View
  if (activeTeamConversation) {
    const convMessages = teamMessages[activeTeamConversation.id] || [];
    return (
      <AppLayout title={language === 'ar' ? 'الفريق' : 'Team'} showNav={false} showHeader={false}>
        <TeamChatView
          conversation={activeTeamConversation}
          messages={convMessages}
          members={activeTeamMembers}
          onBack={handleBackFromChat}
          onSendMessage={sendTeamMessage}
        />
      </AppLayout>
    );
  }

  // Active DM Conversation View (real database DM) - Use new DMChatView component
  if (activeDMConversation) {
    const conversationMessages = dmMessages[activeDMConversation.id] || [];
    
    const handleForwardMessage = (content: string, recipientIds: string[]) => {
      // Forward the message to selected recipients
      recipientIds.forEach(async (recipientId) => {
        const convId = await getOrCreateConversation(recipientId);
        if (convId) {
          // Mark as forwarded in the message
          sendDMMessage(convId, content);
        }
      });
    };
    
    return (
      <AppLayout title={activeDMConversation.participantName} showNav={false} showHeader={false}>
        <DMChatView
          conversation={activeDMConversation}
          messages={conversationMessages}
          onBack={handleBackFromChat}
          onSendMessage={sendDMMessage}
          onForwardMessage={handleForwardMessage}
        />
      </AppLayout>
    );
  }

  // P2P Chat Active View
  if (activeP2PChat) {
    return (
      <AppLayout title="P2P Chat" showNav={false}>
        <div className="flex flex-col h-[calc(100vh-60px)]">
          {/* P2P Chat Header */}
          <P2PChatHeader
            chat={activeP2PChat}
            currentOrder={activeOrder}
            currentUserId={user.id}
            onBack={handleBackFromChat}
            onViewOrderDetails={() => setShowP2PDetails(!showP2PDetails)}
          />

          {/* Order Card & Payment Details (Collapsible) */}
          {showP2PDetails && activeOrder && (
            <div className="px-4 py-3 bg-muted/30 border-b border-border space-y-3">
              <P2POrderCard order={activeOrder} currentUserId={user.id} isActive onDeleteOrder={deleteOrder} />
              {activeOrder.status !== 'completed' && activeOrder.status !== 'cancelled' && (
                <P2PPaymentCard paymentDetails={activeOrder.paymentDetails} />
              )}
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {activeP2PChat.messages.map((msg) => (
                <div key={msg.id}>
                  {msg.isSystem && msg.systemMessage ? (
                    <P2PSystemMessage message={msg.systemMessage} />
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} mb-2`}
                    >
                      <div className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                        msg.isMine 
                          ? 'bg-primary text-primary-foreground rounded-br-sm' 
                          : 'bg-muted rounded-bl-sm'
                      }`}>
                        {!msg.isMine && (
                          <p className="text-xs font-medium mb-1 opacity-70">{msg.senderName}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <span className="text-[10px] opacity-60 block text-end mt-1">{msg.time}</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Action Buttons (based on role and order status) */}
          {activeOrder && (
            <P2PStatusActions 
              order={activeOrder} 
              currentUserId={user.id}
              isSupport={activeP2PChat.supportPresent && user.id === 'support'}
            />
          )}

          {/* Input */}
          <div className="p-4 border-t border-border bg-card safe-bottom">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={language === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <Button size="icon" onClick={handleSend} disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Receipt Dialog */}
          <ReceiptDialog
            receipt={selectedReceipt}
            open={receiptDialogOpen}
            onClose={() => setReceiptDialogOpen(false)}
          />
        </div>
      </AppLayout>
    );
  }

  // Active Chat View (DM / Team)
  if (activeChat) {
    const isTeamChat = activeChat.type === 'team';
    const teamContent = getTeamChatContent();
    const activeMembers = activeChat.teamMembers?.filter(m => m.active).length || 0;
    const totalMembers = activeChat.teamMembers?.length || 0;

    return (
      <AppLayout title={activeChat.name} showNav={false} showHeader={false}>
        <div className="flex flex-col h-screen">
          {/* Chat Header - Different for Team vs DM */}
          {isTeamChat ? (
            <TeamChatHeader
              teamName={activeChat.name}
              teamNameAr={activeChat.nameAr || activeChat.name}
              memberCount={totalMembers}
              activeCount={activeMembers}
              isMuted={activeChat.isMuted || false}
              onBack={handleBackFromChat}
              onOpenInfo={() => setTeamInfoOpen(true)}
              onToggleMute={handleToggleMute}
              onRemindInactive={handleRemindInactive}
            />
          ) : (
            <ChatHeader
              name={activeChat.name}
              username={activeChat.username}
              avatar={activeChat.avatar}
              rank={activeChat.rank}
              isOnline={activeChat.isOnline}
              lastSeen={activeChat.lastSeen}
              onBack={handleBackFromChat}
              onTransfer={() => setTransferDialogOpen(true)}
            />
          )}

          {/* Pinned Messages Bar - clickable */}
          {activeChat.pinnedMessages && activeChat.pinnedMessages.length > 0 && (
            <div className="px-4 py-2 bg-muted/50 border-b border-border">
              <div className="flex items-center gap-2 text-xs">
                <Pin className="h-3 w-3 text-primary" />
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'رسائل مثبتة' : 'Pinned'} ({activeChat.pinnedMessages.length}/3):
                </span>
              </div>
              <div className="flex gap-2 mt-1 overflow-x-auto">
                {activeChat.pinnedMessages.map(msg => (
                  <div 
                    key={msg.id}
                    onClick={() => scrollToMessage(msg.id)}
                    className="px-2 py-1 bg-card rounded text-xs truncate max-w-[150px] flex items-center gap-1 cursor-pointer hover:bg-muted transition-colors"
                  >
                    <span className="truncate">{msg.content || (language === 'ar' ? 'معاملة' : 'Transaction')}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePin(msg);
                      }}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-1">
              {isTeamChat ? (
                // Team Chat: Mixed human + system messages
                teamContent.allContent.map((item, idx) => (
                  item.type === 'system' ? (
                    <SystemMessageBubble key={`sys-${item.data.id}`} message={item.data} />
                  ) : (
                    <div
                      key={item.data.id}
                      ref={(el) => {
                        if (el) messageRefs.current.set(item.data.id, el);
                      }}
                      className="transition-colors duration-500 rounded-lg"
                    >
                      <MessageBubble
                        message={item.data}
                        onReply={handleReply}
                        onForward={handleForward}
                        onCopy={handleCopy}
                        onDelete={handleDelete}
                        onPin={handlePin}
                        onReact={handleReact}
                        onScrollToMessage={scrollToMessage}
                        onTransactionClick={(receipt) => {
                          setSelectedReceipt(receipt);
                          setReceiptDialogOpen(true);
                        }}
                      />
                    </div>
                  )
                ))
              ) : (
                // DM Chat: Only human messages
                activeChat.messages.map((msg) => (
                  <div
                    key={msg.id}
                    ref={(el) => {
                      if (el) messageRefs.current.set(msg.id, el);
                    }}
                    className="transition-colors duration-500 rounded-lg"
                  >
                    <MessageBubble
                      message={msg}
                      onReply={handleReply}
                      onForward={handleForward}
                      onCopy={handleCopy}
                      onDelete={handleDelete}
                      onPin={handlePin}
                      onReact={handleReact}
                      onScrollToMessage={scrollToMessage}
                      onTransactionClick={(receipt) => {
                        setSelectedReceipt(receipt);
                        setReceiptDialogOpen(true);
                      }}
                    />
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Reply Bar */}
          {replyTo && (
            <ReplyBar
              replyTo={{ sender: replyTo.sender, content: replyTo.content }}
              onCancel={() => setReplyTo(null)}
            />
          )}

          {/* Input */}
          <div className="p-4 border-t border-border bg-card safe-bottom">
            <div className="flex items-center gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={language === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <Button size="icon" onClick={handleSend} disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Transfer Dialog (DM only) */}
          {!isTeamChat && (
            <TransferNovaDialog 
              open={transferDialogOpen}
              onClose={() => setTransferDialogOpen(false)}
              recipientId={activeChat.type === 'dm' ? '2' : undefined}
              recipientName={activeChat.name}
              recipientUsername={activeChat.username}
              onTransferComplete={handleTransferComplete}
            />
          )}

          {/* Forward Dialog */}
          <ForwardDialog
            open={!!forwardMessage}
            onClose={() => setForwardMessage(null)}
            onForward={handleForwardSubmit}
            messagePreview={forwardMessage?.content || ''}
          />

          {/* Receipt Dialog */}
          <ReceiptDialog
            receipt={selectedReceipt}
            open={receiptDialogOpen}
            onClose={() => setReceiptDialogOpen(false)}
          />

          {/* Team Info Sheet */}
          {isTeamChat && activeChat.manager && activeChat.teamMembers && (
            <TeamInfoSheet
              open={teamInfoOpen}
              onClose={() => setTeamInfoOpen(false)}
              teamName={activeChat.name}
              teamNameAr={activeChat.nameAr || activeChat.name}
              manager={activeChat.manager}
              members={activeChat.teamMembers}
              onRemindInactive={handleRemindInactive}
            />
          )}
        </div>
      </AppLayout>
    );
  }

  // Convert conversations to search format
  const conversationsForSearch: ConversationResult[] = allConversations
    .filter(conv => conv.type !== 'system')
    .map(conv => ({
      id: conv.id,
      type: conv.type as 'dm' | 'team' | 'p2p',
      name: conv.name,
      nameAr: conv.nameAr,
      avatar: conv.avatar,
      lastMessage: conv.lastMessage,
      time: conv.time,
      unread: conv.unread,
    }));

  const handleSelectConversationFromSearch = (conv: ConversationResult) => {
    const fullConv = allConversations.find(c => c.id === conv.id);
    if (fullConv) {
      handleOpenConversation(fullConv);
    }
    setSearchQuery('');
    clearUserSearch();
  };

  const handleSelectUserFromSearch = async (searchedUser: SearchedUser) => {
    // Start DM with the user directly
    const conversationId = await getOrCreateConversation(searchedUser.userId);
    if (conversationId) {
      const dmConv = dmConversations.find(c => c.id === conversationId);
      if (dmConv) {
        setActiveDMConversation(dmConv);
        fetchDMMessages(dmConv.id);
        setActiveChat(null);
        setActiveP2PChat(null);
      }
    }
    setSearchQuery('');
    clearUserSearch();
  };


  // Convert search results to UserResult format for ChatSearchResults
  const usersForSearch: UserResult[] = userSearchResults.map(u => ({
    id: u.userId,
    name: u.name,
    nameAr: u.name, // Arabic name is same field
    username: u.username,
    avatar: u.avatarUrl || undefined,
    isOnline: false,
    lastSeen: '',
    lastSeenAr: '',
  }));

  // Conversations List
  return (
    <AppLayout title={t('chat.title')}>
      <div className="px-4 py-4 space-y-4">
        {/* Search + New Chat Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'ابحث عن محادثة أو مستخدم...' : 'Search conversations or users...'}
              className="ps-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => { setSearchQuery(''); clearUserSearch(); }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {/* New Chat / Find User Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowUserSearch(true)}
            className="shrink-0"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Results - Show conversations + users inline */}
        {searchQuery.trim() ? (
          <div className="space-y-4">
            {isUserSearching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {/* User Results Section */}
            {userSearchResults.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground px-1">
                  {language === 'ar' ? 'المستخدمون' : 'Users'}
                </h3>
                {userSearchResults.map((searchedUser) => (
                  <button
                    key={searchedUser.id}
                    onClick={() => handleSelectUserFromSearch(searchedUser)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-start"
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={searchedUser.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {searchedUser.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{searchedUser.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">@{searchedUser.username}</p>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>{getCountryFlag(searchedUser.country)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Conversation Results Section */}
            {conversationsForSearch.filter(conv => {
              const searchLower = searchQuery.toLowerCase();
              return conv.name.toLowerCase().includes(searchLower) || conv.nameAr?.toLowerCase().includes(searchLower);
            }).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground px-1">
                  {language === 'ar' ? 'المحادثات' : 'Conversations'}
                </h3>
                {conversationsForSearch.filter(conv => {
                  const searchLower = searchQuery.toLowerCase();
                  return conv.name.toLowerCase().includes(searchLower) || conv.nameAr?.toLowerCase().includes(searchLower);
                }).map((conv) => (
                  <Card 
                    key={conv.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelectConversationFromSearch(conv)}
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {conv.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">
                          {language === 'ar' && conv.nameAr ? conv.nameAr : conv.name}
                        </span>
                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                      </div>
                      {conv.unread > 0 && (
                        <span className="min-w-[20px] h-[20px] px-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                          {conv.unread}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* No Results */}
            {!isUserSearching && userSearchResults.length === 0 && conversationsForSearch.filter(conv => {
              const searchLower = searchQuery.toLowerCase();
              return conv.name.toLowerCase().includes(searchLower) || conv.nameAr?.toLowerCase().includes(searchLower);
            }).length === 0 && searchQuery.length >= 1 && (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
              </div>
            )}
          </div>
        ) : (
          /* Tabs - Only show when not searching */
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dm" className="text-xs px-2 relative">
                <span>{language === 'ar' ? 'خاص' : 'Private'}</span>
                {unreadCounts.dm > 0 && (
                  <span className="ms-1.5 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full inline-flex items-center justify-center">
                    {formatBadgeCount(unreadCounts.dm)}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="team" className="text-xs px-2 relative">
                <span>{language === 'ar' ? 'الفريق' : 'Team'}</span>
                {unreadCounts.team > 0 && (
                  <span className="ms-1.5 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full inline-flex items-center justify-center">
                    {formatBadgeCount(unreadCounts.team)}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="p2p" className="text-xs px-2 relative">
                <span>P2P</span>
                {unreadCounts.p2p > 0 && (
                  <span className="ms-1.5 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full inline-flex items-center justify-center">
                    {formatBadgeCount(unreadCounts.p2p)}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-4 space-y-3">
              {filteredConversations.length === 0 ? (
                <Card className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'لا توجد محادثات' : 'No conversations'}
                  </p>
                </Card>
              ) : (
                filteredConversations.map((conv, index) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleOpenConversation(conv)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        {/* Avatar */}
                        <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                          conv.id === 'ai-control-room'
                            ? 'bg-primary/20 ring-2 ring-primary/30'
                            : conv.id === 'support' 
                              ? 'bg-primary/20' 
                              : conv.isSystem 
                                ? 'bg-primary/20' 
                                : conv.type === 'p2p' 
                                  ? 'bg-success/20' 
                                  : 'bg-muted'
                        }`}>
                          {conv.id === 'ai-control-room' ? (
                            <Brain className="w-6 h-6 text-primary" />
                          ) : conv.id === 'support' ? (
                            <Headphones className="w-6 h-6 text-primary" />
                          ) : (
                            conv.avatar
                          )}
                          {/* Online indicator - green dot */}
                          {conv.isOnline && !conv.isTyping && (
                            <span className="absolute bottom-0 end-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
                          )}
                          {/* Typing indicator on avatar */}
                          {conv.isTyping && (
                            <span className="absolute bottom-0 end-0 w-3.5 h-3.5 bg-primary rounded-full border-2 border-card flex items-center justify-center">
                              <PenLine className="w-2 h-2 text-primary-foreground" />
                            </span>
                          )}
                          {conv.unread > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                              {conv.unread}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{conv.name}</p>
                              {conv.type === 'p2p' && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-success/20 text-success rounded">
                                  P2P
                                </span>
                              )}
                            </div>
                            {/* Hide time when typing */}
                            {!conv.isTyping && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {conv.time}
                              </span>
                            )}
                          </div>
                          {/* Show typing or last message */}
                          {conv.isTyping ? (
                            <p className="text-sm text-primary truncate flex items-center gap-1.5 animate-pulse">
                              <PenLine className="w-3 h-3" />
                              {language === 'ar' ? 'يكتب الآن...' : 'Typing...'}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.lastMessage}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* User Search Sheet */}
      <UserSearchSheet
        open={showUserSearch}
        onOpenChange={setShowUserSearch}
        onSelectUser={handleUserSelectedFromSearch}
      />
    </AppLayout>
  );
}

export default function ChatPage() {
  return <ChatContent />;
}

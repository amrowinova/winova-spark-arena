import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useP2P, P2PChat, P2PMessage } from '@/contexts/P2PContext';
import { useSupport } from '@/contexts/SupportContext';
import { useDirectMessages, DMConversation, DMMessage } from '@/hooks/useDirectMessages';
import { useUserSearch, SearchedUser } from '@/hooks/useUserSearch';
import { useTeamChat, TeamConversation, TeamMessage } from '@/hooks/useTeamChat';
import { useChatListPresence, useGlobalPresence } from '@/hooks/useChatListPresence';
import { useChatCleanup } from '@/hooks/useChatCleanup';
import { Receipt } from '@/contexts/TransactionContext';

export interface ChatConversation {
  id: string;
  type: 'dm' | 'team' | 'p2p' | 'system';
  name: string;
  nameAr?: string;
  username?: string;
  avatar: string;
  rank?: any;
  isOnline?: boolean;
  isTyping?: boolean;
  lastSeen?: string;
  lastMessage: string;
  time: string;
  unread: number;
  isSystem?: boolean;
  isMuted?: boolean;
  messages: any[];
  pinnedMessages: any[];
  systemMessages?: any[];
  teamMembers?: any[];
  manager?: any;
  p2pChatId?: string;
  dmConversationId?: string;
  dmParticipantId?: string;
}

export interface UseChatOptions {
  initialTab?: string;
  autoOpenPending?: boolean;
}

export function useChat(options: UseChatOptions = {}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  
  // Cleanup hook
  const { addSubscription, addObjectUrl, addTimeout, addEventListener, cleanup: cleanupResources } = useChatCleanup();
  
  // Contexts and hooks
  const { chats: p2pChats, activeChat: activeP2PChat, activeOrder, setActiveChat: setActiveP2PChat, setActiveOrder, sendMessage: sendP2PMessage, deleteOrder } = useP2P();
  const { messages: supportMessages, totalUnread: supportUnread, currentTicket } = useSupport();
  const {
    conversations: dmConversations,
    messages: dmMessages,
    isLoading: dmLoading,
    fetchMessages: fetchDMMessages,
    sendMessage: sendDMMessage,
    deleteMessage: deleteDMMessage,
    toggleReaction: toggleDMReaction,
    getOrCreateConversation,
    setActiveConversation: setActiveDMConversationId,
  } = useDirectMessages();
  const {
    conversations: teamConversationsData,
    messages: teamMessages,
    fetchMessages: fetchTeamMessages,
    sendMessage: sendTeamMessage,
    toggleReaction: toggleTeamReaction,
    fetchMembers: fetchTeamMembers,
  } = useTeamChat();
  const { results: userSearchResults, isSearching: isUserSearching, searchUsers, clearResults: clearUserSearch } = useUserSearch();
  const { isUserOnline } = useGlobalPresence();
  const { getStatus: getTypingStatus } = useChatListPresence(dmConversations.map(c => c.id));

  // State management
  const [selectedTab, setSelectedTab] = useState(options.initialTab || 'dm');
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null);
  const [activeDMConversation, setActiveDMConversation] = useState<DMConversation | null>(null);
  const [activeTeamConversation, setActiveTeamConversation] = useState<TeamConversation | null>(null);
  const [activeTeamMembers, setActiveTeamMembers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [replyToDM, setReplyToDM] = useState<any>(null);
  const [forwardMessage, setForwardMessage] = useState<any>(null);
  const [forwardDMMessage, setForwardDMMessage] = useState<any>(null);
  const [messageInfoMessage, setMessageInfoMessage] = useState<any>(null);
  const [teamInfoOpen, setTeamInfoOpen] = useState(false);
  const [showP2PDetails, setShowP2PDetails] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchedUsers, setSearchedUsers] = useState<SearchedUser[]>([]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingOpenDmWithRef = useRef<string | null>(null);
  const pendingConversationIdRef = useRef<string | null>(null);

  // Computed values
  const isRTL = useMemo(() => language === 'ar' || language === 'fa' || language === 'ur', [language]);
  const supportTickets = useMemo(() => supportMessages || [], [supportMessages]);

  // Effects
  useEffect(() => {
    // Handle navigation state
    if (location.state?.openSupport) {
      setShowSupportChat(true);
      window.history.replaceState({}, document.title);
    }
    
    if (location.state?.openDmWith) {
      pendingOpenDmWithRef.current = location.state.openDmWith;
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    // Handle pending DM conversation from sessionStorage
    const pendingConvId = sessionStorage.getItem('pendingDMConversation');
    if (pendingConvId) {
      sessionStorage.removeItem('pendingDMConversation');
      pendingConversationIdRef.current = pendingConvId;
    }
  }, []);

  useEffect(() => {
    // Listen for notification clicks
    const handleOpenDMConversation = (event: CustomEvent<{ conversationId: string }>) => {
      const { conversationId } = event.detail;
      setSelectedTab('dm');
      handleConversationSelect(conversationId);
    };

    window.addEventListener('openDMConversation', handleOpenDMConversation as EventListener);
    return () => window.removeEventListener('openDMConversation', handleOpenDMConversation as EventListener);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages, teamMessages, activeChat?.messages]);

  // Memoized functions
  const handleConversationSelect = useCallback((conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setActiveChat(conversation);
      
      // Handle different conversation types
      if (conversation.type === 'dm') {
        const dmConv = dmConversations.find(c => c.id === conversation.dmConversationId);
        if (dmConv) {
          setActiveDMConversation(dmConv);
          setActiveDMConversationId(dmConv.id);
        }
      } else if (conversation.type === 'team') {
        const teamConv = teamConversationsData.find(c => c.id === conversation.id);
        if (teamConv) {
          setActiveTeamConversation(teamConv);
          fetchTeamMembers(teamConv.id).then(members => setActiveTeamMembers(members));
        }
      } else if (conversation.type === 'p2p') {
        const p2pConv = p2pChats.find(c => c.id === conversation.p2pChatId);
        if (p2pConv) {
          setActiveP2PChat(p2pConv);
        }
      }
    }
  }, [conversations, dmConversations, teamConversationsData, p2pChats, setActiveDMConversationId, fetchTeamMembers, setActiveP2PChat]);

  const handleUserSelect = useCallback((selectedUser: SearchedUser) => {
    setShowUserSearch(false);
    clearUserSearch();
    
    // Create or open DM conversation
    getOrCreateConversation(selectedUser.id).then(conversation => {
      if (conversation) {
        setSelectedTab('dm');
        handleConversationSelect(conversation.id);
      }
    });
  }, [getOrCreateConversation, handleConversationSelect, clearUserSearch]);

  const handleSendMessage = useCallback((messageText: string, files?: File[]) => {
    if (!activeChat) return;

    if (activeChat.type === 'dm' && activeDMConversation) {
      sendDMMessage(messageText, files);
    } else if (activeChat.type === 'team' && activeTeamConversation) {
      sendTeamMessage(messageText, files);
    } else if (activeChat.type === 'p2p') {
      sendP2PMessage(messageText);
    }
  }, [activeChat, activeDMConversation, activeTeamConversation, sendDMMessage, sendTeamMessage, sendP2PMessage]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      // Search across all conversation types
      const results = [
        ...dmConversations.filter(c => 
          c.participantName?.toLowerCase().includes(query.toLowerCase()) ||
          c.participantUsername?.toLowerCase().includes(query.toLowerCase())
        ),
        ...teamConversationsData.filter(c => 
          c.name?.toLowerCase().includes(query.toLowerCase()) ||
          c.username?.toLowerCase().includes(query.toLowerCase())
        ),
        ...p2pChats.filter(c => 
          c.other_user?.name?.toLowerCase().includes(query.toLowerCase()) ||
          c.other_user?.username?.toLowerCase().includes(query.toLowerCase())
        )
      ];
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [dmConversations, teamConversationsData, p2pChats]);

  const handleUserSearch = useCallback(async (query: string) => {
    if (query.trim()) {
      await searchUsers(query);
      setSearchedUsers(userSearchResults);
    } else {
      clearUserSearch();
      setSearchedUsers([]);
    }
  }, [searchUsers, userSearchResults, clearUserSearch]);

  // Cleanup functions
  const cleanup = useCallback(() => {
    // Clear all state
    setActiveChat(null);
    setActiveDMConversation(null);
    setActiveTeamConversation(null);
    setActiveTeamMembers([]);
    setMessage('');
    setReplyTo(null);
    setReplyToDM(null);
    setForwardMessage(null);
    setForwardDMMessage(null);
    setMessageInfoMessage(null);
    setSelectedReceipt(null);
    setTransferDialogOpen(false);
    setReceiptDialogOpen(false);
    setTeamInfoOpen(false);
    setShowP2PDetails(false);
    setShowSupportChat(false);
    setShowUserSearch(false);
    setShowSearch(false);
    setSearchResults([]);
    setSearchedUsers([]);
    
    // Call resource cleanup
    cleanupResources();
  }, [cleanupResources]);

  // Return interface
  return {
    // State
    selectedTab,
    activeChat,
    activeDMConversation,
    activeTeamConversation,
    activeTeamMembers,
    conversations,
    message,
    searchQuery,
    transferDialogOpen,
    selectedReceipt,
    receiptDialogOpen,
    replyTo,
    replyToDM,
    forwardMessage,
    forwardDMMessage,
    messageInfoMessage,
    teamInfoOpen,
    showP2PDetails,
    showSupportChat,
    showUserSearch,
    showSearch,
    searchResults,
    searchedUsers,
    
    // Data from hooks
    dmConversations,
    teamConversations: teamConversationsData,
    p2pChats,
    supportTickets,
    dmMessages,
    teamMessages,
    dmLoading,
    isUserSearching,
    
    // Computed values
    isRTL,
    language,
    user,
    
    // Refs
    messagesEndRef,
    messageRefs,
    
    // Actions
    setSelectedTab,
    setActiveChat,
    setActiveDMConversation,
    setActiveTeamConversation,
    setActiveTeamMembers,
    setMessage,
    setSearchQuery,
    setTransferDialogOpen,
    setSelectedReceipt,
    setReceiptDialogOpen,
    setReplyTo,
    setReplyToDM,
    setForwardMessage,
    setForwardDMMessage,
    setMessageInfoMessage,
    setTeamInfoOpen,
    setShowP2PDetails,
    setShowSupportChat,
    setShowUserSearch,
    setShowSearch,
    setSearchResults,
    setSearchedUsers,
    
    // Business logic functions
    handleConversationSelect,
    handleUserSelect,
    handleSendMessage,
    handleSearch,
    handleUserSearch,
    cleanup,
    
    // Hook functions
    sendDMMessage,
    sendTeamMessage,
    sendP2PMessage,
    deleteDMMessage,
    toggleDMReaction,
    toggleTeamReaction,
    deleteOrder,
    getTypingStatus,
    isUserOnline,
    
    // Navigation
    navigate,
    t
  };
}

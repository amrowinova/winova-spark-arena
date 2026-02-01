import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Pin, Search, X, Image, Paperclip, Headphones } from 'lucide-react';
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
import { TransferNovaDialog } from '@/components/wallet/TransferNovaDialog';
import { ReceiptDialog } from '@/components/common/ReceiptCard';
import { Receipt } from '@/contexts/TransactionContext';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { TeamChatHeader } from '@/components/chat/TeamChatHeader';
import { MessageBubble, ChatMessage } from '@/components/chat/MessageBubble';
import { SystemMessageBubble, SystemMessageData } from '@/components/chat/SystemMessageBubble';
import { ForwardDialog } from '@/components/chat/ForwardDialog';
import { ReplyBar } from '@/components/chat/ReplyBar';
import { TeamInfoSheet, TeamChatMember } from '@/components/chat/TeamInfoSheet';
import { ChatSearchResults, ConversationResult, UserResult } from '@/components/chat/ChatSearchResults';
import { SupportChatView } from '@/components/chat/SupportChatView';
import { 
  P2PChatHeader, 
  P2POrderCard, 
  P2PPaymentCard, 
  P2PActionButtons,
  P2PSystemMessage 
} from '@/components/p2p';
import { useBanner } from '@/contexts/BannerContext';
import { FTUXGuard } from '@/components/ftux';
import type { UserRank } from '@/contexts/UserContext';

interface Conversation {
  id: string;
  type: 'dm' | 'team' | 'p2p' | 'system';
  name: string;
  nameAr?: string;
  username?: string;
  avatar: string;
  rank?: UserRank;
  isOnline?: boolean;
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
}

// Mock conversations with enhanced messages
const initialConversations: Conversation[] = [
  {
    id: '1',
    type: 'dm',
    name: 'سارة أحمد',
    username: 'sara_ahmed',
    avatar: '👩',
    rank: 'marketer',
    isOnline: true,
    lastMessage: 'شكراً على التصويت!',
    time: '2m',
    unread: 2,
    messages: [
      { 
        id: 'm1', 
        sender: 'سارة أحمد', 
        senderId: '2', 
        content: 'مرحباً! كيف حالك؟', 
        time: '10:30 AM', 
        isMine: false,
        reactions: [{ emoji: '👋', count: 1, userReacted: true }]
      },
      { 
        id: 'm2', 
        sender: 'أنت', 
        senderId: '1', 
        content: 'الحمد لله بخير، وأنتِ؟', 
        time: '10:32 AM', 
        isMine: true,
        read: true
      },
      { 
        id: 'm3', 
        sender: 'سارة أحمد', 
        senderId: '2', 
        content: 'شكراً على التصويت!', 
        time: '10:35 AM', 
        isMine: false,
        transaction: {
          type: 'vote',
          amount: 12,
          description: 'صوّت لك سارة – المرحلة الأولى',
        }
      },
    ],
    pinnedMessages: [],
  },
  {
    id: '2',
    type: 'team',
    name: 'Team Alpha',
    nameAr: 'فريق ألفا',
    avatar: '👥',
    lastMessage: 'مبروك للجميع على الإنجاز!',
    time: '15m',
    unread: 5,
    isMuted: false,
    messages: [
      { id: 't1', sender: 'محمد خالد', senderId: '3', content: 'السلام عليكم', time: '09:00 AM', isMine: false },
      { id: 't3', sender: 'أنت', senderId: '1', content: 'أهلاً بكم جميعاً!', time: '09:30 AM', isMine: true, read: true },
      { id: 't4', sender: 'محمد خالد', senderId: '3', content: 'مبروك للجميع على الإنجاز!', time: '10:00 AM', isMine: false, pinned: true },
    ],
    pinnedMessages: [
      { id: 't4', sender: 'محمد خالد', senderId: '3', content: 'مبروك للجميع على الإنجاز!', time: '10:00 AM', isMine: false, pinned: true },
    ],
    // System messages (automated events)
    systemMessages: [
      { id: 'sys1', type: 'member_joined', memberName: 'Layla Hassan', memberNameAr: 'ليلى حسن', time: '08:00 AM' },
      { id: 'sys2', type: 'contest_entered', memberName: 'Omar Ali', memberNameAr: 'عمر علي', time: '09:15 AM', contestName: 'Daily Contest', contestNameAr: 'مسابقة اليوم' },
      { id: 'sys3', type: 'member_won', memberName: 'Sarah Ahmed', memberNameAr: 'سارة أحمد', time: '11:00 AM', prizeAmount: 50 },
      { id: 'sys4', type: 'member_promoted', memberName: 'Khaled Mahmoud', memberNameAr: 'خالد محمود', time: '02:00 PM', newRank: 'marketer' },
      { id: 'sys5', type: 'vote_request', memberName: 'Nour El-Din', memberNameAr: 'نور الدين', time: '03:30 PM' },
    ],
    // Team members
    teamMembers: [
      { id: 'tm1', name: 'Omar Ali', nameAr: 'عمر علي', username: 'omar_ali', rank: 'marketer', active: true, avatar: '👨', directCount: 5, activityRanking: 1 },
      { id: 'tm2', name: 'Sarah Ahmed', nameAr: 'سارة أحمد', username: 'sara_ahmed', rank: 'marketer', active: true, avatar: '👩', directCount: 3, activityRanking: 2 },
      { id: 'tm3', name: 'Khaled Mahmoud', nameAr: 'خالد محمود', username: 'khaled_m', rank: 'marketer', active: true, avatar: '👨', directCount: 2, activityRanking: 3 },
      { id: 'tm4', name: 'Layla Hassan', nameAr: 'ليلى حسن', username: 'layla_h', rank: 'subscriber', active: true, avatar: '👩', directCount: 0, activityRanking: 4 },
      { id: 'tm5', name: 'Nour El-Din', nameAr: 'نور الدين', username: 'nour_d', rank: 'subscriber', active: false, avatar: '👨', directCount: 0, activityRanking: 5 },
      { id: 'tm6', name: 'Fatima Zahra', nameAr: 'فاطمة الزهراء', username: 'fatima_z', rank: 'subscriber', active: false, avatar: '👩', directCount: 1, activityRanking: 6 },
    ],
    manager: {
      id: 'mgr1',
      name: 'Ahmed Hassan',
      nameAr: 'أحمد حسن',
      avatar: '👑',
      rank: 'leader',
      active: true,
    },
  },
  {
    id: '4',
    type: 'system',
    name: 'إشعارات النظام',
    avatar: '🔔',
    lastMessage: 'حصلت على 10 Aura من مكافآت التصويت',
    time: '2h',
    unread: 3,
    isSystem: true,
    messages: [
      { 
        id: 's2', 
        sender: 'System', 
        senderId: 'system', 
        content: 'باقي 8 أصوات لتدخل Top 50', 
        time: '3h ago', 
        isMine: false 
      },
      { 
        id: 's3', 
        sender: 'System', 
        senderId: 'system', 
        content: '',
        time: '2h ago', 
        isMine: false,
        transaction: {
          type: 'aura',
          amount: 10,
          description: 'مكافآت التصويت',
        }
      },
    ],
    pinnedMessages: [],
  },
];

// Mock users for search
const mockPlatformUsers: UserResult[] = [
  { id: 'u1', name: 'Mohammed Ali', nameAr: 'محمد علي', username: 'mohammed_ali', isOnline: true },
  { id: 'u2', name: 'Fatima Hassan', nameAr: 'فاطمة حسن', username: 'fatima_h', isOnline: false, lastSeen: '10 min ago', lastSeenAr: 'منذ 10 دقائق' },
  { id: 'u3', name: 'Omar Khaled', nameAr: 'عمر خالد', username: 'omar_k', isOnline: true },
  { id: 'u4', name: 'Layla Ahmed', nameAr: 'ليلى أحمد', username: 'layla_a', isOnline: false, lastSeen: '2 hours ago', lastSeenAr: 'منذ ساعتين' },
  { id: 'u5', name: 'Yusuf Ibrahim', nameAr: 'يوسف ابراهيم', username: 'yusuf_i', isOnline: true },
];

function ChatContent() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { chats: p2pChats, activeChat: activeP2PChat, activeOrder, setActiveChat: setActiveP2PChat, setActiveOrder, sendMessage: sendP2PMessage } = useP2P();
  const { messages: supportMessages, totalUnread: supportUnread, currentTicket } = useSupport();
  
  const [selectedTab, setSelectedTab] = useState('dm');
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState(initialConversations);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [teamInfoOpen, setTeamInfoOpen] = useState(false);
  const [showP2PDetails, setShowP2PDetails] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Check if navigated from Help page to open support
  useEffect(() => {
    if (location.state?.openSupport) {
      setShowSupportChat(true);
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, activeP2PChat?.messages]);

  // Convert P2P chats to conversation format for the list
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

  const allConversations = [supportConversation, ...conversations, ...p2pConversations];

  const filteredConversations = allConversations.filter(conv => {
    // System notifications excluded from chat - they go to bell icon only
    if (conv.type === 'system') return false;
    if (conv.id === 'support') return selectedTab === 'dm'; // Support shows in DM tab
    return conv.type === selectedTab;
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
    // Handle support conversation specially
    if (conv.id === 'support') {
      setShowSupportChat(true);
      setActiveChat(null);
      setActiveP2PChat(null);
      return;
    }
    
    if (conv.type === 'p2p' && conv.p2pChatId) {
      setActiveP2PChat(conv.p2pChatId);
      setActiveChat(null);
    } else {
      setActiveChat(conv);
      setActiveP2PChat(null);
    }
  };

  const handleBackFromChat = () => {
    setActiveChat(null);
    setActiveP2PChat(null);
    setShowP2PDetails(false);
    setShowSupportChat(false);
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

  // Support Chat View
  if (showSupportChat) {
    return (
      <AppLayout title={language === 'ar' ? 'دعم Winova' : 'Winova Support'} showNav={false} showHeader={false}>
        <SupportChatView onBack={handleBackFromChat} />
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
              <P2POrderCard order={activeOrder} isActive />
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
            <P2PActionButtons 
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
  };

  const handleSelectUserFromSearch = (user: UserResult) => {
    // Navigate to public profile - user can start DM or send Nova from there
    setSearchQuery('');
  };

  // Conversations List
  return (
    <AppLayout title={t('chat.title')}>
      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search')}
            className="ps-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Results */}
        {searchQuery.trim() ? (
          <ChatSearchResults
            searchQuery={searchQuery}
            conversations={conversationsForSearch}
            users={mockPlatformUsers}
            onSelectConversation={handleSelectConversationFromSearch}
            onSelectUser={handleSelectUserFromSearch}
          />
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
                          conv.id === 'support' 
                            ? 'bg-primary/20' 
                            : conv.isSystem 
                              ? 'bg-primary/20' 
                              : conv.type === 'p2p' 
                                ? 'bg-success/20' 
                                : 'bg-muted'
                        }`}>
                          {conv.id === 'support' ? (
                            <Headphones className="w-6 h-6 text-primary" />
                          ) : (
                            conv.avatar
                          )}
                          {conv.isOnline && (
                            <span className="absolute bottom-0 end-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
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
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {conv.time}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage}
                          </p>
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
    </AppLayout>
  );
}

export default function ChatPage() {
  const { language } = useLanguage();
  
  return (
    <FTUXGuard pageTitle={language === 'ar' ? 'المحادثات' : 'Chat'}>
      <ChatContent />
    </FTUXGuard>
  );
}

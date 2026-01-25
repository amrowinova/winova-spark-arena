import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Pin, Search, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { TransferNovaDialog } from '@/components/wallet/TransferNovaDialog';
import { ReceiptDialog } from '@/components/common/ReceiptCard';
import { Receipt } from '@/contexts/TransactionContext';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageBubble, ChatMessage } from '@/components/chat/MessageBubble';
import { ForwardDialog } from '@/components/chat/ForwardDialog';
import { ReplyBar } from '@/components/chat/ReplyBar';
import { toast } from '@/hooks/use-toast';
import type { UserRank } from '@/contexts/UserContext';

interface Conversation {
  id: string;
  type: 'dm' | 'team' | 'p2p' | 'system';
  name: string;
  username?: string;
  avatar: string;
  rank?: UserRank;
  isOnline?: boolean;
  lastSeen?: string;
  lastMessage: string;
  time: string;
  unread: number;
  isSystem?: boolean;
  messages: ChatMessage[];
  pinnedMessages: ChatMessage[];
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
    name: 'دردشة الفريق',
    avatar: '👥',
    lastMessage: 'مبروك للجميع على الإنجاز!',
    time: '15m',
    unread: 5,
    messages: [
      { id: 't1', sender: 'محمد خالد', senderId: '3', content: 'السلام عليكم', time: '09:00 AM', isMine: false },
      { id: 't3', sender: 'أنت', senderId: '1', content: 'أهلاً بكم جميعاً!', time: '09:30 AM', isMine: true, read: true },
      { id: 't4', sender: 'محمد خالد', senderId: '3', content: 'مبروك للجميع على الإنجاز!', time: '10:00 AM', isMine: false, pinned: true },
    ],
    pinnedMessages: [
      { id: 't4', sender: 'محمد خالد', senderId: '3', content: 'مبروك للجميع على الإنجاز!', time: '10:00 AM', isMine: false, pinned: true },
    ],
  },
  {
    id: '3',
    type: 'p2p',
    name: 'P2P: طلب #1234',
    avatar: '🤝',
    lastMessage: 'تم تأكيد الدفع',
    time: '1h',
    unread: 0,
    messages: [
      { 
        id: 'p2', 
        sender: 'عمر البدر', 
        senderId: '4', 
        content: 'مرحباً، سأقوم بالتحويل الآن', 
        time: '08:05 AM', 
        isMine: false 
      },
      { 
        id: 'p3', 
        sender: 'عمر البدر', 
        senderId: '4', 
        content: 'تم التحويل',
        time: '08:30 AM', 
        isMine: false,
        transaction: {
          type: 'transfer',
          amount: 100,
          description: 'تحويل P2P من عمر',
        }
      },
    ],
    pinnedMessages: [],
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

export default function ChatPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useUser();
  
  const [selectedTab, setSelectedTab] = useState('all');
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState(initialConversations);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages]);

  const filteredConversations = conversations.filter(conv => {
    if (selectedTab === 'all') return true;
    return conv.type === selectedTab;
  });

  const handleSend = () => {
    if (!message.trim() || !activeChat) return;
    
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

  const handleForwardSubmit = (contactIds: string[]) => {
    toast({
      title: language === 'ar' ? 'تم الإرسال' : 'Forwarded',
      description: language === 'ar' 
        ? `تم إعادة التوجيه إلى ${contactIds.length} جهة اتصال`
        : `Forwarded to ${contactIds.length} contacts`,
    });
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: language === 'ar' ? 'تم النسخ' : 'Copied',
    });
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
      toast({
        title: language === 'ar' ? 'الحد الأقصى 3 رسائل' : 'Maximum 3 pinned messages',
        variant: 'destructive',
      });
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

  // Active Chat View
  if (activeChat) {
    return (
      <AppLayout title={activeChat.name} showNav={false}>
        <div className="flex flex-col h-[calc(100vh-60px)]">
          {/* Chat Header */}
          <ChatHeader
            name={activeChat.name}
            username={activeChat.username}
            avatar={activeChat.avatar}
            rank={activeChat.rank}
            isOnline={activeChat.isOnline}
            lastSeen={activeChat.lastSeen}
            onBack={() => setActiveChat(null)}
            onTransfer={() => setTransferDialogOpen(true)}
          />

          {/* Pinned Messages Bar */}
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
                    className="px-2 py-1 bg-card rounded text-xs truncate max-w-[150px] flex items-center gap-1"
                  >
                    <span className="truncate">{msg.content}</span>
                    <button 
                      onClick={() => handlePin(msg)}
                      className="text-muted-foreground hover:text-destructive"
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
              {activeChat.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onReply={handleReply}
                  onForward={handleForward}
                  onCopy={handleCopy}
                  onDelete={handleDelete}
                  onPin={handlePin}
                  onReact={handleReact}
                  onTransactionClick={(receipt) => {
                    setSelectedReceipt(receipt);
                    setReceiptDialogOpen(true);
                  }}
                />
              ))}
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

          {/* Transfer Dialog */}
          <TransferNovaDialog 
            open={transferDialogOpen}
            onClose={() => setTransferDialogOpen(false)}
            recipientId={activeChat.type === 'dm' ? '2' : undefined}
            recipientName={activeChat.name}
            recipientUsername={activeChat.username}
            onTransferComplete={handleTransferComplete}
          />

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
        </div>
      </AppLayout>
    );
  }

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
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="text-[10px] px-1">
              {language === 'ar' ? 'الكل' : 'All'}
            </TabsTrigger>
            <TabsTrigger value="dm" className="text-[10px] px-1">
              {language === 'ar' ? 'خاص' : 'DM'}
            </TabsTrigger>
            <TabsTrigger value="team" className="text-[10px] px-1">
              {language === 'ar' ? 'الفريق' : 'Team'}
            </TabsTrigger>
            <TabsTrigger value="p2p" className="text-[10px] px-1">
              P2P
            </TabsTrigger>
            <TabsTrigger value="system" className="text-[10px] px-1">
              {language === 'ar' ? 'النظام' : 'System'}
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
                    onClick={() => setActiveChat(conv)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                        conv.isSystem ? 'bg-primary/20' : 'bg-muted'
                      }`}>
                        {conv.avatar}
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
                          <p className="font-medium truncate">{conv.name}</p>
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
      </div>
    </AppLayout>
  );
}

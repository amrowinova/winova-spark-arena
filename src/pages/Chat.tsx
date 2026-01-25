import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Pin, Search, ArrowLeft, DollarSign, X, CheckCircle } from 'lucide-react';
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

interface Message {
  id: string;
  sender: string;
  senderId: string;
  content: string;
  time: string;
  isMine: boolean;
  isSystem?: boolean;
  systemType?: 'vote' | 'transfer' | 'info' | 'contest';
  pinned?: boolean;
  receipt?: Receipt;
}

interface Conversation {
  id: string;
  type: 'dm' | 'team' | 'p2p' | 'system';
  name: string;
  username?: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isSystem?: boolean;
  messages: Message[];
  pinnedMessages: Message[];
}

// Mock conversations with messages
const initialConversations: Conversation[] = [
  {
    id: '1',
    type: 'dm',
    name: 'سارة أحمد',
    username: 'sara_ahmed',
    avatar: '👩',
    lastMessage: 'شكراً على التصويت!',
    time: '2m',
    unread: 2,
    messages: [
      { id: 'm1', sender: 'سارة أحمد', senderId: '2', content: 'مرحباً! كيف حالك؟', time: '10:30 AM', isMine: false },
      { id: 'm2', sender: 'أنت', senderId: '1', content: 'الحمد لله بخير، وأنتِ؟', time: '10:32 AM', isMine: true },
      { id: 'm3', sender: 'System', senderId: 'system', content: 'لقد صوّت لك سارة 12 صوت – المرحلة الأولى', time: '10:33 AM', isMine: false, isSystem: true, systemType: 'vote' },
      { id: 'm4', sender: 'سارة أحمد', senderId: '2', content: 'شكراً على التصويت!', time: '10:35 AM', isMine: false },
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
      { id: 't2', sender: 'System', senderId: 'system', content: 'انضم عضو جديد: ليلى محمد', time: '09:15 AM', isMine: false, isSystem: true, systemType: 'info' },
      { id: 't3', sender: 'أنت', senderId: '1', content: 'أهلاً بكم جميعاً!', time: '09:30 AM', isMine: true },
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
      { id: 'p1', sender: 'System', senderId: 'system', content: 'تم إنشاء طلب P2P جديد: 100 Nova', time: '08:00 AM', isMine: false, isSystem: true, systemType: 'info' },
      { id: 'p2', sender: 'عمر البدر', senderId: '4', content: 'مرحباً، سأقوم بالتحويل الآن', time: '08:05 AM', isMine: false },
      { id: 'p3', sender: 'System', senderId: 'system', content: 'تم تأكيد الدفع من قبل عمر', time: '08:30 AM', isMine: false, isSystem: true, systemType: 'transfer' },
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
      { id: 's1', sender: 'System', senderId: 'system', content: 'مرحباً بك في WINOVA!', time: 'Yesterday', isMine: false, isSystem: true, systemType: 'info' },
      { id: 's2', sender: 'System', senderId: 'system', content: 'باقي 8 أصوات لتدخل Top 50', time: '3h ago', isMine: false, isSystem: true, systemType: 'contest' },
      { id: 's3', sender: 'System', senderId: 'system', content: 'حصلت على 10 Aura من مكافآت التصويت', time: '2h ago', isMine: false, isSystem: true, systemType: 'vote' },
    ],
    pinnedMessages: [],
  },
];

const systemMessageColors = {
  vote: 'bg-aura/10 border-aura/30 text-aura',
  transfer: 'bg-nova/10 border-nova/30 text-nova',
  info: 'bg-primary/10 border-primary/30 text-primary',
  contest: 'bg-success/10 border-success/30 text-success',
};

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
    
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: user.name,
      senderId: user.id,
      content: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
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
  };

  const handleTransferComplete = (receipt: Receipt) => {
    if (!activeChat) return;
    
    // Add system message with receipt
    const systemMessage: Message = {
      id: `sys-${Date.now()}`,
      sender: 'System',
      senderId: 'system',
      content: language === 'ar' 
        ? `تم تحويل ${receipt.amount.toFixed(3)} Nova إلى ${activeChat.name}`
        : `Transferred ${receipt.amount.toFixed(3)} Nova to ${activeChat.name}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: false,
      isSystem: true,
      systemType: 'transfer',
      receipt: receipt,
    };

    setConversations(prev => 
      prev.map(conv => 
        conv.id === activeChat.id 
          ? { ...conv, messages: [...conv.messages, systemMessage] }
          : conv
      )
    );
    
    setActiveChat(prev => 
      prev ? { ...prev, messages: [...prev.messages, systemMessage] } : prev
    );
  };

  const handlePinMessage = (msg: Message) => {
    if (!activeChat) return;
    
    const currentPinned = activeChat.pinnedMessages || [];
    if (currentPinned.length >= 3 && !msg.pinned) {
      return; // Max 3 pinned messages
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

  // Active Chat View
  if (activeChat) {
    return (
      <AppLayout title={activeChat.name} showNav={false}>
        <div className="flex flex-col h-[calc(100vh-60px)]">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3 shrink-0">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setActiveChat(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
              {activeChat.avatar}
            </div>
            <div className="flex-1">
              <p className="font-medium">{activeChat.name}</p>
              {activeChat.username && (
                <p className="text-xs text-muted-foreground">@{activeChat.username}</p>
              )}
            </div>
            
            {/* Transfer Button (DM only) */}
            {activeChat.type === 'dm' && (
              <Button 
                size="sm" 
                onClick={() => setTransferDialogOpen(true)}
                className="bg-gradient-nova text-nova-foreground"
              >
                <DollarSign className="h-4 w-4 me-1" />
                {language === 'ar' ? 'تحويل' : 'Transfer'}
              </Button>
            )}
          </div>

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
                      onClick={() => handlePinMessage(msg)}
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
            <div className="space-y-4">
              {activeChat.messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${msg.isMine ? 'order-2' : ''}`}>
                    {/* System Message */}
                    {msg.isSystem ? (
                      <div 
                        className={`px-4 py-3 rounded-xl border cursor-pointer ${
                          systemMessageColors[msg.systemType || 'info']
                        }`}
                        onClick={() => {
                          if (msg.receipt) {
                            setSelectedReceipt(msg.receipt);
                            setReceiptDialogOpen(true);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 shrink-0" />
                          <p className="text-sm font-medium">{msg.content}</p>
                        </div>
                        {msg.receipt && (
                          <p className="text-xs mt-1 opacity-70">
                            {language === 'ar' ? 'اضغط لعرض الإيصال' : 'Tap to view receipt'}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Pinned indicator */}
                        {msg.pinned && (
                          <div className="flex items-center gap-1 text-xs text-primary mb-1">
                            <Pin className="h-3 w-3" />
                            {language === 'ar' ? 'مثبت' : 'Pinned'}
                          </div>
                        )}
                        
                        {/* Regular Message */}
                        <div 
                          className={`px-4 py-2 rounded-2xl ${
                            msg.isMine 
                              ? 'bg-primary text-primary-foreground rounded-br-sm' 
                              : 'bg-muted rounded-bl-sm'
                          }`}
                          onDoubleClick={() => !msg.isSystem && handlePinMessage(msg)}
                        >
                          {!msg.isMine && (
                            <p className="text-xs font-medium mb-1 opacity-70">{msg.sender}</p>
                          )}
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </>
                    )}
                    <p className={`text-[10px] text-muted-foreground mt-1 ${msg.isMine ? 'text-end' : ''}`}>
                      {msg.time}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

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
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              {language === 'ar' ? 'اضغط مرتين على رسالة لتثبيتها' : 'Double-tap message to pin'}
            </p>
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              {language === 'ar' ? 'الكل' : 'All'}
            </TabsTrigger>
            <TabsTrigger value="dm" className="text-xs">
              {language === 'ar' ? 'خاص' : 'DM'}
            </TabsTrigger>
            <TabsTrigger value="team" className="text-xs">
              {language === 'ar' ? 'الفريق' : 'Team'}
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs">
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

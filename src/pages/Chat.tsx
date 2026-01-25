import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MessageCircle, Users, ShoppingCart, Bell, Send, Pin, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// Mock conversations
const conversations = [
  {
    id: 1,
    type: 'dm',
    name: 'Sara A.',
    avatar: '👩',
    lastMessage: 'Great! See you in the next contest',
    time: '2m ago',
    unread: 2,
  },
  {
    id: 2,
    type: 'team',
    name: 'Team Chat',
    avatar: '👥',
    lastMessage: 'Congrats everyone on hitting the milestone!',
    time: '15m ago',
    unread: 5,
  },
  {
    id: 3,
    type: 'p2p',
    name: 'P2P: Order #1234',
    avatar: '🤝',
    lastMessage: 'Payment confirmed, releasing Nova now',
    time: '1h ago',
    unread: 0,
  },
  {
    id: 4,
    type: 'system',
    name: 'System Notifications',
    avatar: '🔔',
    lastMessage: 'You received 10 Aura from voting rewards',
    time: '2h ago',
    unread: 3,
    isSystem: true,
  },
];

// Mock messages for active chat
const mockMessages = [
  { id: 1, sender: 'Sara A.', content: 'Hey! How are you doing in the contest?', time: '10:30 AM', isMine: false },
  { id: 2, sender: 'You', content: 'Pretty good! Just reached top 50 🎉', time: '10:32 AM', isMine: true },
  { id: 3, sender: 'Sara A.', content: 'That\'s amazing! I\'ll send you some votes', time: '10:33 AM', isMine: false },
  { id: 4, sender: 'You', content: 'Thank you so much! Good luck to you too!', time: '10:35 AM', isMine: true },
  { id: 5, sender: 'Sara A.', content: 'Great! See you in the next contest', time: '10:36 AM', isMine: false, pinned: true },
];

export default function ChatPage() {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState('all');
  const [activeChat, setActiveChat] = useState<typeof conversations[0] | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conv => {
    if (selectedTab === 'all') return true;
    return conv.type === selectedTab;
  });

  const handleSend = () => {
    if (message.trim()) {
      // Handle send message
      setMessage('');
    }
  };

  if (activeChat) {
    return (
      <AppLayout title={activeChat.name} showNav={false}>
        <div className="flex flex-col h-[calc(100vh-60px)]">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setActiveChat(null)}
            >
              ← {t('common.back')}
            </Button>
            <div className="flex-1 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                {activeChat.avatar}
              </div>
              <div>
                <p className="font-medium">{activeChat.name}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {mockMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${msg.isMine ? 'order-2' : ''}`}>
                    {msg.pinned && (
                      <div className="flex items-center gap-1 text-xs text-primary mb-1">
                        <Pin className="h-3 w-3" />
                        {t('chat.pinned')}
                      </div>
                    )}
                    <div className={`px-4 py-2 rounded-2xl ${
                      msg.isMine 
                        ? 'bg-primary text-primary-foreground rounded-br-sm' 
                        : 'bg-muted rounded-bl-sm'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <p className={`text-[10px] text-muted-foreground mt-1 ${msg.isMine ? 'text-end' : ''}`}>
                      {msg.time}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border bg-card safe-bottom">
            <div className="flex items-center gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('chat.typeMessage')}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <Button size="icon" onClick={handleSend} disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

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
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="dm" className="text-xs">{t('chat.dm')}</TabsTrigger>
            <TabsTrigger value="team" className="text-xs">{t('chat.teamChat')}</TabsTrigger>
            <TabsTrigger value="system" className="text-xs">{t('chat.system')}</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="mt-4 space-y-3">
            {filteredConversations.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">{t('chat.noMessages')}</p>
                <p className="text-sm text-muted-foreground">{t('chat.startConversation')}</p>
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

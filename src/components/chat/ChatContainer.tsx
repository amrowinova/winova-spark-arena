import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Search, Users, Settings, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useP2P } from '@/contexts/P2PContext';
import { useSupport } from '@/contexts/SupportContext';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useUserSearch } from '@/hooks/useUserSearch';
import { useTeamChat } from '@/hooks/useTeamChat';
import { useChatListPresence } from '@/hooks/useChatListPresence';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { TeamChatHeader } from '@/components/chat/TeamChatHeader';
import { DMChatView } from '@/components/chat/DMChatView';
import { TeamChatView } from '@/components/chat/TeamChatView';
import { SupportChatView } from '@/components/chat/SupportChatView';
import { UserSearchSheet } from '@/components/chat/UserSearchSheet';
import { ChatSearchResults } from '@/components/chat/ChatSearchResults';
import { RankBadge } from '@/components/common/RankBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCountryFlag } from '@/lib/countryFlags';
import { cn } from '@/lib/utils';
import { 
  P2PChatHeader, 
  P2POrderCard, 
  P2PPaymentCard, 
  P2PSystemMessage 
} from '@/components/p2p';
import { P2PStatusActions } from '@/components/p2p/P2PStatusActions';
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
  manager?: {
    id: string;
    name: string;
    nameAr: string;
    avatar: string;
    rank: UserRank;
    active?: boolean;
  };
  p2pChatId?: string;
  dmConversationId?: string;
  dmParticipantId?: string;
}

interface ChatContainerProps {
  conversations: Conversation[];
  selectedConversation: string | null;
  onConversationSelect: (id: string) => void;
  onSearch: (query: string) => void;
  searchResults: any[];
  searchQuery: string;
  isSearching: boolean;
}

export function ChatContainer({
  conversations,
  selectedConversation,
  onConversationSelect,
  onSearch,
  searchResults,
  searchQuery,
  isSearching
}: ChatContainerProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useUser();
  const { chats: p2pChats } = useP2P();
  const { tickets } = useSupport();
  const { conversations: dmConversations } = useDirectMessages();
  const { conversations: teamConversations } = useTeamChat();
  const { statusMap } = useChatListPresence();
  const { results: searchedUsers } = useUserSearch();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [activeTab, setActiveTab] = useState('chats');
  const [showSearch, setShowSearch] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);

  // Calculate unread counts
  const dmUnread = dmConversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
  const teamUnread = teamConversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
  const totalUnread = useMemo(() => {
    const p2pUnread = p2pChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
    const supportUnread = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    return dmUnread + teamUnread + p2pUnread + supportUnread;
  }, [p2pChats, tickets, dmUnread, teamUnread]);

  // Filter conversations based on active tab
  const filteredConversations = useMemo(() => {
    switch (activeTab) {
      case 'chats':
        return conversations.filter(c => c.type === 'dm' || c.type === 'team');
      case 'p2p':
        return conversations.filter(c => c.type === 'p2p');
      case 'support':
        return conversations.filter(c => c.type === 'system');
      default:
        return conversations;
    }
  }, [conversations, activeTab]);

  const handleSearch = useCallback((query: string) => {
    onSearch(query);
  }, [onSearch]);

  const handleUserSelect = useCallback((user: any) => {
    // Navigate to user profile or start DM
    if (user.id) {
      onConversationSelect(`dm_${user.id}`);
    }
  }, [onConversationSelect]);

  const formatLastMessage = (message: string) => {
    if (message.length > 50) {
      return message.substring(0, 50) + '...';
    }
    return message;
  };

  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'dm':
        return '💬';
      case 'team':
        return '👥';
      case 'p2p':
        return '💰';
      case 'system':
        return '🎧';
      default:
        return '💬';
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-80 border-r bg-background flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              {isRTL ? 'المحادثات' : 'Messages'}
            </h2>
            <Badge variant="secondary" className="text-xs">
              {totalUnread}
            </Badge>
          </div>

          {/* Search */}
          <div className="relative">
            <Input
              placeholder={isRTL ? 'ابحث عن محادثة...' : 'Search conversations...'}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chats" className="text-xs">
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                <span>{isRTL ? 'الدردشة' : 'Chat'}</span>
                {(dmUnread + teamUnread) > 0 && (
                  <Badge variant="destructive" className="h-4 w-4 p-0 text-xs">
                    {dmUnread + teamUnread}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="p2p" className="text-xs">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{isRTL ? 'P2P' : 'P2P'}</span>
                {p2pChats.filter(c => c.unreadCount > 0).length > 0 && (
                  <Badge variant="destructive" className="h-4 w-4 p-0 text-xs">
                    {p2pChats.filter(c => c.unreadCount > 0).length}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="support" className="text-xs">
              <div className="flex items-center gap-1">
                <Settings className="h-3 w-3" />
                <span>{isRTL ? 'الدعم' : 'Support'}</span>
                {tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length > 0 && (
                  <Badge variant="destructive" className="h-4 w-4 p-0 text-xs">
                    {tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            <TabsContent value="chats" className="mt-0">
              <div className="space-y-1">
                {filteredConversations.map((conversation) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ backgroundColor: 'hsl(var(--muted))' }}
                    onClick={() => onConversationSelect(conversation.id)}
                    className={cn(
                      "p-3 cursor-pointer rounded-lg border-b transition-colors",
                      selectedConversation === conversation.id && "bg-primary/10 border-primary"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conversation.avatar} alt={conversation.name} />
                          <AvatarFallback>
                            {getCountryFlag(conversation.username || '')}
                            {conversation.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {isRTL ? conversation.nameAr || conversation.name : conversation.name}
                            </span>
                            {conversation.rank && (
                              <RankBadge rank={conversation.rank} size="sm" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{getConversationIcon(conversation.type)}</span>
                            <span>{conversation.time}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate">
                            {formatLastMessage(conversation.lastMessage)}
                          </p>
                          {conversation.unread > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                              {conversation.unread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="p2p" className="mt-0">
              <div className="space-y-1">
                {p2pChats.map((chat) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ backgroundColor: 'hsl(var(--muted))' }}
                    onClick={() => onConversationSelect(`p2p_${chat.id}`)}
                    className={cn(
                      "p-3 cursor-pointer rounded-lg border-b transition-colors",
                      selectedConversation === `p2p_${chat.id}` && "bg-primary/10 border-primary"
                    )}
                  >
                    <P2PChatHeader chat={chat} currentUserId={user?.id} onBack={() => {}} />
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="support" className="mt-0">
              <div className="space-y-1">
                {tickets.map((ticket) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ backgroundColor: 'hsl(var(--muted))' }}
                    onClick={() => onConversationSelect(`support_${ticket.id}`)}
                    className={cn(
                      "p-3 cursor-pointer rounded-lg border-b transition-colors",
                      selectedConversation === `support_${ticket.id}` && "bg-primary/10 border-primary"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{ticket.title || 'Support Ticket'}</h4>
                        <p className="text-xs text-muted-foreground">{ticket.status}</p>
                      </div>
                      <Badge variant={ticket.status === 'open' ? 'destructive' : 'secondary'}>
                        {ticket.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Action Buttons */}
        <div className="p-4 border-t">
          <Button
            variant="outline"
            onClick={() => setShowUserSearch(true)}
            className="w-full"
          >
            <Users className="h-4 w-4 mr-2" />
            {isRTL ? 'ابحث عن مستخدم' : 'Search User'}
          </Button>
        </div>
      </div>

      {/* Search Results Overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 p-4"
          >
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {isRTL ? 'نتائج البحث' : 'Search Results'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearch(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <ChatSearchResults
                conversations={searchResults}
                onConversationSelect={onConversationSelect}
                query={searchQuery}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Search Sheet */}
      <UserSearchSheet
        open={showUserSearch}
        onOpenChange={setShowUserSearch}
        results={searchedUsers}
        onSelect={handleUserSelect}
      />
    </div>
  );
}

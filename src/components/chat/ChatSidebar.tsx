import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Users, Search, Headphones, UserPlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useDirectMessages, DMConversation } from '@/hooks/useDirectMessages';
import { useTeamChat, TeamConversation } from '@/hooks/useTeamChat';
import { useChatListPresence, useGlobalPresence } from '@/hooks/useChatListPresence';
import { useUserSearch, SearchedUser } from '@/hooks/useUserSearch';
import { useSupport } from '@/hooks/useSupport';
import { ChatSearchResults } from '@/components/chat/ChatSearchResults';
import { UserSearchSheet } from '@/components/chat/UserSearchSheet';
import { P2PChatHeader } from '@/components/p2p';
import { RankBadge } from '@/components/common/RankBadge';
import { getCountryFlag } from '@/lib/countryFlags';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  conversations: any[];
  activeChat: any;
  setActiveChat: (chat: any) => void;
  dmConversations: DMConversation[];
  teamConversations: TeamConversation[];
  p2pChats: any[];
  supportTickets: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  searchResults: any[];
  isUserOnline: (id: string) => boolean;
  isRTL: boolean;
  language: string;
  user: any;
  t: (key: string) => string;
  navigate: any;
}

export function ChatSidebar({
  selectedTab,
  setSelectedTab,
  conversations,
  activeChat,
  setActiveChat,
  dmConversations,
  teamConversations,
  p2pChats,
  supportTickets,
  searchQuery,
  setSearchQuery,
  showSearch,
  setShowSearch,
  searchResults,
  isUserOnline,
  isRTL,
  language,
  user,
  t,
  navigate
}: ChatSidebarProps) {
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchedUsers, setSearchedUsers] = useState<SearchedUser[]>([]);

  // User search hook
  const { results: userSearchResults, isSearching: isUserSearching, searchUsers, clearResults: clearUserSearch } = useUserSearch();

  const handleUserSelect = useCallback((selectedUser: SearchedUser) => {
    // Handle user selection for new DM
    setShowUserSearch(false);
    clearUserSearch();
    // Navigate to DM conversation
    navigate(`/chat?dm=${selectedUser.id}`);
  }, [navigate, clearUserSearch]);

  const handleConversationSelect = useCallback((conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setActiveChat(conversation);
    }
  }, [conversations, setActiveChat]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => 
      conv.name.toLowerCase().includes(query) ||
      conv.username?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  return (
    <div className="w-80 border-r bg-background flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isRTL ? 'بحث...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-10 pr-10 ${isRTL ? 'text-right' : 'text-left'}`}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dm" className="relative">
            <MessageCircle className="h-4 w-4" />
            {dmConversations.some(c => c.unreadCount > 0) && (
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="team" className="relative">
            <Users className="h-4 w-4" />
            {teamConversations.some(c => c.unreadCount > 0) && (
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="p2p" className="relative">
            <Headphones className="h-4 w-4" />
            {p2pChats.some(c => c.unreadCount > 0) && (
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="support">
            <Loader2 className="h-4 w-4" />
            {supportTickets.some(t => t.status === 'open') && (
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* DM Conversations */}
        <TabsContent value="dm" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              <AnimatePresence>
                {dmConversations.map((conversation) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    whileHover={{ backgroundColor: 'hsl(var(--muted))' }}
                    onClick={() => handleConversationSelect(conversation.id)}
                    className={cn(
                      "p-3 cursor-pointer rounded-lg border-b transition-colors",
                      activeChat?.id === conversation.id && "bg-primary/10 border-primary"
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
                            <span>DM</span>
                            <span>{conversation.time}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Team Conversations */}
        <TabsContent value="team" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              <AnimatePresence>
                {teamConversations.map((conversation) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    whileHover={{ backgroundColor: 'hsl(var(--muted))' }}
                    onClick={() => handleConversationSelect(conversation.id)}
                    className={cn(
                      "p-3 cursor-pointer rounded-lg border-b transition-colors",
                      activeChat?.id === conversation.id && "bg-primary/10 border-primary"
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
                            <span>Team</span>
                            <span>{conversation.time}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* P2P Chats */}
        <TabsContent value="p2p" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              <AnimatePresence>
                {p2pChats.map((chat) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    whileHover={{ backgroundColor: 'hsl(var(--muted))' }}
                    onClick={() => handleConversationSelect(`p2p_${chat.id}`)}
                    className={cn(
                      "p-3 cursor-pointer rounded-lg border-b transition-colors",
                      activeChat?.id === `p2p_${chat.id}` && "bg-primary/10 border-primary"
                    )}
                  >
                    <P2PChatHeader
                      chat={chat}
                      currentUserId={user?.id}
                      onBack={() => {}}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Support Tickets */}
        <TabsContent value="support" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              <AnimatePresence>
                {supportTickets.map((ticket) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    whileHover={{ backgroundColor: 'hsl(var(--muted))' }}
                    onClick={() => handleConversationSelect(`support_${ticket.id}`)}
                    className={cn(
                      "p-3 cursor-pointer rounded-lg border-b transition-colors",
                      activeChat?.id === `support_${ticket.id}` && "bg-primary/10 border-primary"
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
              </AnimatePresence>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="p-4 border-t">
        <Button
          variant="outline"
          onClick={() => setShowUserSearch(true)}
          className="w-full"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {isRTL ? 'بحث عن مستخدم' : 'Search User'}
        </Button>
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
                onConversationSelect={handleConversationSelect}
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

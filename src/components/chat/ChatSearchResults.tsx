import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Users, ArrowLeftRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ConversationResult {
  id: string;
  type: 'dm' | 'team' | 'p2p';
  name: string;
  nameAr?: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
}

export interface UserResult {
  id: string;
  name: string;
  nameAr: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
  lastSeenAr?: string;
}

interface ChatSearchResultsProps {
  searchQuery: string;
  conversations: ConversationResult[];
  users: UserResult[];
  onSelectConversation: (conv: ConversationResult) => void;
  onSelectUser: (user: UserResult) => void;
}

export function ChatSearchResults({
  searchQuery,
  conversations,
  users,
  onSelectConversation,
  onSelectUser,
}: ChatSearchResultsProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();

  if (!searchQuery.trim()) return null;

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const searchLower = searchQuery.toLowerCase();
    const name = conv.name.toLowerCase();
    const nameAr = conv.nameAr?.toLowerCase() || '';
    return name.includes(searchLower) || nameAr.includes(searchLower);
  });

  // Filter users
  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const name = user.name.toLowerCase();
    const nameAr = user.nameAr.toLowerCase();
    const username = user.username.toLowerCase();
    return name.includes(searchLower) || nameAr.includes(searchLower) || username.includes(searchLower);
  });

  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'dm': return MessageCircle;
      case 'team': return Users;
      case 'p2p': return ArrowLeftRight;
      default: return MessageCircle;
    }
  };

  const getConversationTypeLabel = (type: string) => {
    switch (type) {
      case 'dm': return language === 'ar' ? 'رسالة خاصة' : 'DM';
      case 'team': return language === 'ar' ? 'فريق' : 'Team';
      case 'p2p': return 'P2P';
      default: return '';
    }
  };

  const handleUserClick = (user: UserResult) => {
    // Navigate to public profile
    navigate(`/user/${user.id}`);
    onSelectUser(user);
  };

  if (filteredConversations.length === 0 && filteredUsers.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {t('chatSearch.noResults')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Conversations Section */}
      {filteredConversations.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
            {t('chatSearch.conversations')}
          </h3>
          <div className="space-y-1">
            {filteredConversations.map((conv) => {
              const Icon = getConversationIcon(conv.type);
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-start"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conv.avatar} />
                      <AvatarFallback className="text-lg bg-primary/10 text-primary">
                        {conv.avatar || conv.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -end-1 h-5 w-5 rounded-full bg-card flex items-center justify-center border border-border">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {language === 'ar' && conv.nameAr ? conv.nameAr : conv.name}
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5">
                        {getConversationTypeLabel(conv.type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unread > 0 && (
                    <Badge className="bg-primary text-primary-foreground min-w-[20px] justify-center">
                      {conv.unread}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Users Section */}
      {filteredUsers.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
            {t('chatSearch.users')}
          </h3>
          <div className="space-y-1">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserClick(user)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-start"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <span className={cn(
                    "absolute bottom-0 end-0 h-3 w-3 rounded-full border-2 border-card",
                    user.isOnline ? "bg-success" : "bg-muted-foreground"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">
                      {language === 'ar' ? user.nameAr : user.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      @{user.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ·
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.isOnline 
                        ? (language === 'ar' ? 'متصل الآن' : 'Online now')
                        : (language === 'ar' ? user.lastSeenAr : user.lastSeen)
                      }
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

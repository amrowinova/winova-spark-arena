import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle, Send, User } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserSearch, SearchedUser } from '@/hooks/useUserSearch';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { RankBadge } from '@/components/common/RankBadge';
import { getCountryFlag } from '@/lib/countryFlags';

interface UserSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser?: (user: SearchedUser, conversationId: string) => void;
}

export function UserSearchSheet({ open, onOpenChange, onSelectUser }: UserSearchSheetProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { results, isSearching, searchUsers, clearResults } = useUserSearch();
  const { getOrCreateConversation } = useDirectMessages();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (query.length >= 2) {
      const timer = setTimeout(() => searchUsers(query), 300);
      return () => clearTimeout(timer);
    } else {
      clearResults();
    }
  }, [query, searchUsers, clearResults]);

  const handleStartChat = async (user: SearchedUser) => {
    setLoading(user.userId);
    try {
      const conversationId = await getOrCreateConversation(user.userId);
      if (conversationId) {
        onSelectUser?.(user, conversationId);
        onOpenChange(false);
        setQuery('');
        clearResults();
      }
    } finally {
      setLoading(null);
    }
  };

  const handleViewProfile = (user: SearchedUser) => {
    navigate(`/profile/${user.userId}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>
            {language === 'ar' ? 'بحث عن مستخدم' : 'Search Users'}
          </SheetTitle>
        </SheetHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={language === 'ar' ? 'ابحث بالاسم أو @username...' : 'Search by name or @username...'}
            className="pl-10"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[calc(100%-120px)]">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{user.name}</span>
                        <RankBadge rank={user.rank as any} size="sm" />
                      </div>
                      <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <span>{getCountryFlag(user.country)}</span>
                        <span>{user.country}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewProfile(user)}
                      className="shrink-0"
                    >
                      <User className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleStartChat(user)}
                      disabled={loading === user.userId}
                      className="shrink-0"
                    >
                      {loading === user.userId ? (
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <MessageCircle className="h-4 w-4 mr-1" />
                          {language === 'ar' ? 'محادثة' : 'Chat'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

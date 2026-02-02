import { useState, useEffect } from 'react';
import { Search, Send, Forward, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useUserSearch } from '@/hooks/useUserSearch';
import { getCountryFlag } from '@/lib/countryFlags';

interface Contact {
  id: string;
  name: string;
  username?: string;
  avatar: string | null;
  country?: string;
}

interface ForwardDialogProps {
  open: boolean;
  onClose: () => void;
  onForward: (contactIds: string[]) => void;
  messagePreview: string;
}

export function ForwardDialog({ open, onClose, onForward, messagePreview }: ForwardDialogProps) {
  const { language } = useLanguage();
  const { conversations } = useDirectMessages();
  const { results: searchResults, isSearching, searchUsers, clearResults } = useUserSearch();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Clear on open
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedIds([]);
      clearResults();
    }
  }, [open, clearResults]);

  // Search users when query changes
  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      const timer = setTimeout(() => searchUsers(searchQuery), 200);
      return () => clearTimeout(timer);
    } else {
      clearResults();
    }
  }, [searchQuery, searchUsers, clearResults]);

  // Convert conversations to contacts (recent chats)
  const recentContacts: Contact[] = conversations.slice(0, 10).map(conv => ({
    id: conv.participantId,
    name: conv.participantName,
    username: conv.participantUsername,
    avatar: conv.participantAvatar,
    country: conv.participantCountry,
  }));

  // Convert search results to contacts
  const searchContacts: Contact[] = searchResults.map(user => ({
    id: user.userId,
    name: user.name,
    username: user.username,
    avatar: user.avatarUrl,
    country: user.country,
  }));

  // Combine: search results first, then recent contacts (filtered to avoid duplicates)
  const displayContacts = searchQuery.trim() 
    ? searchContacts 
    : recentContacts;

  const toggleContact = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleForward = () => {
    onForward(selectedIds);
    setSelectedIds([]);
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="h-5 w-5" />
            {language === 'ar' ? 'إعادة توجيه إلى' : 'Forward to'}
          </DialogTitle>
        </DialogHeader>

        {/* Message preview */}
        <div className="p-3 bg-muted rounded-lg text-sm">
          <p className="text-xs text-muted-foreground mb-1">
            {language === 'ar' ? 'الرسالة:' : 'Message:'}
          </p>
          <p className="line-clamp-2">{messagePreview}</p>
        </div>

        {/* Selected count */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? `تم اختيار ${selectedIds.length} جهة اتصال`
                : `${selectedIds.length} contact${selectedIds.length > 1 ? 's' : ''} selected`
              }
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="text-xs h-7"
            >
              <X className="h-3 w-3 me-1" />
              {language === 'ar' ? 'مسح' : 'Clear'}
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ar' ? 'ابحث بالاسم أو @username...' : 'Search by name or @username...'}
            className="ps-10"
          />
        </div>

        {/* Section title */}
        <p className="text-xs text-muted-foreground px-1">
          {searchQuery.trim() 
            ? (language === 'ar' ? 'نتائج البحث' : 'Search results')
            : (language === 'ar' ? 'المحادثات الأخيرة' : 'Recent chats')
          }
        </p>

        {/* Contacts list */}
        <ScrollArea className="flex-1 min-h-[200px] max-h-[300px]">
          <div className="space-y-1 pe-2">
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isSearching && displayContacts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  {searchQuery.trim()
                    ? (language === 'ar' ? 'لا توجد نتائج' : 'No results found')
                    : (language === 'ar' ? 'لا توجد محادثات' : 'No conversations yet')
                  }
                </p>
                {!searchQuery.trim() && (
                  <p className="text-xs mt-1">
                    {language === 'ar' 
                      ? 'ابدأ محادثة مع أحد المستخدمين أولاً'
                      : 'Start a conversation with a user first'}
                  </p>
                )}
              </div>
            )}

            {!isSearching && displayContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => toggleContact(contact.id)}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                  selectedIds.includes(contact.id) 
                    ? 'bg-primary/10 ring-1 ring-primary/30' 
                    : 'hover:bg-muted'
                }`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={contact.avatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {contact.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{contact.name}</p>
                    {contact.country && (
                      <span className="text-xs">{getCountryFlag(contact.country)}</span>
                    )}
                  </div>
                  {contact.username && (
                    <p className="text-xs text-muted-foreground truncate">@{contact.username}</p>
                  )}
                </div>

                <Checkbox 
                  checked={selectedIds.includes(contact.id)} 
                  className="pointer-events-none"
                />
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Forward button */}
        <Button 
          onClick={handleForward} 
          disabled={selectedIds.length === 0}
          className="w-full gap-2"
        >
          <Send className="h-4 w-4" />
          {language === 'ar' 
            ? `إرسال${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`
            : `Send${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`
          }
        </Button>
      </DialogContent>
    </Dialog>
  );
}

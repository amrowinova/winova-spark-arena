import { useState, useEffect } from 'react';
import { Search, Send } from 'lucide-react';
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
import { useLanguage } from '@/contexts/LanguageContext';
import { useDirectMessages } from '@/hooks/useDirectMessages';

interface Contact {
  id: string;
  name: string;
  username?: string;
  avatar: string | null;
}

interface ForwardDialogProps {
  open: boolean;
  onClose: () => void;
  onForward: (contactIds: string[]) => void;
  messagePreview: string;
}

export function ForwardDialog({ open, onClose, onForward, messagePreview }: ForwardDialogProps) {
  const { language } = useLanguage();
  const { conversations, isLoading } = useDirectMessages();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Convert conversations to contacts
  const contacts: Contact[] = conversations.map(conv => ({
    id: conv.participantId,
    name: conv.participantName,
    username: conv.participantUsername,
    avatar: conv.participantAvatar,
  }));

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleContact = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleForward = () => {
    onForward(selectedIds);
    setSelectedIds([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'إعادة توجيه إلى' : 'Forward to'}
          </DialogTitle>
        </DialogHeader>

        {/* Message preview */}
        <div className="p-2 bg-muted rounded-lg text-sm truncate">
          {messagePreview}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
            className="ps-10"
          />
        </div>

        {/* Contacts list */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-1">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  {language === 'ar' ? 'لا توجد محادثات' : 'No conversations yet'}
                </p>
                <p className="text-xs mt-1">
                  {language === 'ar' 
                    ? 'ابدأ محادثة مع أحد المستخدمين أولاً'
                    : 'Start a conversation with a user first'}
                </p>
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => toggleContact(contact.id)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedIds.includes(contact.id) ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-muted">
                    {contact.avatar || '👤'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{contact.name}</p>
                    {contact.username && (
                      <p className="text-xs text-muted-foreground">@{contact.username}</p>
                    )}
                  </div>

                  <Checkbox checked={selectedIds.includes(contact.id)} />
                </div>
              ))
            )}
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
            ? `إرسال ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`
            : `Send ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`
          }
        </Button>
      </DialogContent>
    </Dialog>
  );
}

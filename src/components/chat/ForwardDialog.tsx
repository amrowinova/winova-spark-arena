import { useState } from 'react';
import { Search, Check, Users, Send } from 'lucide-react';
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

interface Contact {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  isTeam?: boolean;
}

interface ForwardDialogProps {
  open: boolean;
  onClose: () => void;
  onForward: (contactIds: string[]) => void;
  messagePreview: string;
}

// Mock contacts
const mockContacts: Contact[] = [
  { id: '1', name: 'سارة أحمد', username: 'sara_ahmed', avatar: '👩' },
  { id: '2', name: 'محمد خالد', username: 'mkhalid', avatar: '👨' },
  { id: '3', name: 'ليلى محمد', username: 'layla_m', avatar: '👩‍🦱' },
  { id: '4', name: 'عمر البدر', username: 'omar_b', avatar: '🧔' },
  { id: 'team', name: 'فريقي المباشر', avatar: '👥', isTeam: true },
];

export function ForwardDialog({ open, onClose, onForward, messagePreview }: ForwardDialogProps) {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredContacts = mockContacts.filter(contact =>
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
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => toggleContact(contact.id)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedIds.includes(contact.id) ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  contact.isTeam ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  {contact.avatar}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{contact.name}</p>
                    {contact.isTeam && (
                      <Users className="h-3 w-3 text-primary" />
                    )}
                  </div>
                  {contact.username && (
                    <p className="text-xs text-muted-foreground">@{contact.username}</p>
                  )}
                </div>

                <Checkbox checked={selectedIds.includes(contact.id)} />
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
            ? `إرسال ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`
            : `Send ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`
          }
        </Button>
      </DialogContent>
    </Dialog>
  );
}

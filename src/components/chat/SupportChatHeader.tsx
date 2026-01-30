import { ArrowLeft, Headphones, MoreVertical, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type SupportStatus = 'waiting' | 'active' | 'resolved';

export interface SupportAgent {
  id: string;
  name: string;
  nameAr: string;
  avatar: string;
}

interface SupportChatHeaderProps {
  categoryTitle: string;
  status: SupportStatus;
  agent?: SupportAgent;
  onBack: () => void;
  onCloseTicket?: () => void;
}

export function SupportChatHeader({
  categoryTitle,
  status,
  agent,
  onBack,
  onCloseTicket,
}: SupportChatHeaderProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const getStatusBadge = () => {
    switch (status) {
      case 'waiting':
        return (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {isRTL ? 'بانتظار الدعم' : 'Waiting'}
          </Badge>
        );
      case 'active':
        return (
          <Badge variant="default" className="bg-success text-success-foreground gap-1 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {isRTL ? 'قيد المعالجة' : 'In Progress'}
          </Badge>
        );
      case 'resolved':
        return (
          <Badge variant="outline" className="text-muted-foreground text-xs">
            {isRTL ? 'تم الحل' : 'Resolved'}
          </Badge>
        );
    }
  };

  const displayName = agent 
    ? (isRTL ? agent.nameAr : agent.name)
    : (isRTL ? 'فريق الدعم' : 'Support Team');

  return (
    <div className="px-3 py-2 border-b border-border bg-card flex items-center gap-2 shrink-0">
      {/* Back button */}
      <Button 
        variant="ghost" 
        size="icon"
        className="h-9 w-9"
        onClick={onBack}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Avatar */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
          {agent ? agent.avatar : <Headphones className="w-5 h-5 text-primary" />}
        </div>
        {status === 'active' && (
          <span className="absolute bottom-0 end-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{displayName}</p>
          {getStatusBadge()}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {isRTL ? `📂 ${categoryTitle}` : `📂 ${categoryTitle}`}
        </p>
      </div>

      {/* More options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onCloseTicket}>
            {isRTL ? 'إغلاق التذكرة' : 'Close Ticket'}
          </DropdownMenuItem>
          <DropdownMenuItem>
            {isRTL ? 'تقييم الخدمة' : 'Rate Service'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

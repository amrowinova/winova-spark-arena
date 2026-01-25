import { ArrowLeft, DollarSign, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RankBadge } from '@/components/common/RankBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UserRank } from '@/contexts/UserContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
  name: string;
  username?: string;
  avatar: string;
  rank?: UserRank;
  
  isOnline?: boolean;
  lastSeen?: string;
  onBack: () => void;
  onTransfer: () => void;
  onViewProfile?: () => void;
}

export function ChatHeader({
  name,
  username,
  avatar,
  rank = 'subscriber',
  isOnline = false,
  lastSeen,
  onBack,
  onTransfer,
  onViewProfile,
}: ChatHeaderProps) {
  const { language } = useLanguage();

  const getStatusText = () => {
    if (isOnline) {
      return language === 'ar' ? 'متصل الآن' : 'Online';
    }
    if (lastSeen) {
      return language === 'ar' ? `آخر ظهور ${lastSeen}` : `Last seen ${lastSeen}`;
    }
    return null;
  };

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

      {/* Avatar with online indicator */}
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
          {avatar}
        </div>
        {isOnline && (
          <span className="absolute bottom-0 end-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
        )}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0" onClick={onViewProfile}>
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{name}</p>
          <RankBadge rank={rank} size="sm" />
        </div>
        <div className="flex items-center gap-1.5">
          {username && (
            <span className="text-xs text-muted-foreground">@{username}</span>
          )}
          {getStatusText() && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className={`text-xs ${isOnline ? 'text-success' : 'text-muted-foreground'}`}>
                {getStatusText()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Transfer button */}
      <Button 
        size="sm" 
        onClick={onTransfer}
        className="bg-gradient-nova text-nova-foreground gap-1"
      >
        <DollarSign className="h-4 w-4" />
        <span className="hidden sm:inline">
          {language === 'ar' ? 'تحويل' : 'Send'}
        </span>
      </Button>

      {/* More options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onViewProfile}>
            {language === 'ar' ? 'عرض الملف الشخصي' : 'View Profile'}
          </DropdownMenuItem>
          <DropdownMenuItem>
            {language === 'ar' ? 'كتم الإشعارات' : 'Mute Notifications'}
          </DropdownMenuItem>
          <DropdownMenuItem>
            {language === 'ar' ? 'مسح المحادثة' : 'Clear Chat'}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">
            {language === 'ar' ? 'حظر' : 'Block'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

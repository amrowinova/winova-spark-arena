import { useState } from 'react';
import { ArrowLeft, MoreVertical } from 'lucide-react';
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
import { ChatInfoSheet } from './ChatInfoSheet';

interface ChatHeaderProps {
  id?: string;
  name: string;
  username?: string;
  avatar: string;
  rank?: UserRank;
  isOnline?: boolean;
  lastSeen?: string;
  country?: string;
  engagementStatus?: 'both' | 'contest' | 'vote' | 'none';
  p2pStats?: {
    trades: number;
    rating: number;
  };
  onBack: () => void;
  onTransfer: () => void;
  onViewProfile?: () => void;
}

export function ChatHeader({
  id = '1',
  name,
  username,
  avatar,
  rank = 'subscriber',
  isOnline = false,
  lastSeen,
  country,
  engagementStatus = 'none',
  p2pStats,
  onBack,
  onTransfer,
  onViewProfile,
}: ChatHeaderProps) {
  const { language } = useLanguage();
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  const getStatusText = () => {
    if (isOnline) {
      return language === 'ar' ? 'متصل الآن' : 'Online';
    }
    if (lastSeen) {
      return language === 'ar' ? `آخر ظهور ${lastSeen}` : `Last seen ${lastSeen}`;
    }
    return null;
  };

  const handleUserClick = () => {
    setInfoSheetOpen(true);
  };

  const handleToggleStar = () => {
    setIsStarred(!isStarred);
  };

  return (
    <>
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

        {/* Avatar with online indicator - Clickable */}
        <div 
          className="relative cursor-pointer"
          onClick={handleUserClick}
        >
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg hover:ring-2 hover:ring-primary/50 transition-all">
            {avatar}
          </div>
          {isOnline && (
            <span className="absolute bottom-0 end-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
          )}
        </div>

        {/* User info - Clickable */}
        <div
          className="flex-1 min-w-0 cursor-pointer" 
          onClick={handleUserClick}
        >
          <div className="flex items-center gap-2">
            <p className="font-medium truncate hover:text-primary transition-colors">{name}</p>
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
          className="gap-1.5"
        >
          <span className="font-bold">И</span>
          <span>{language === 'ar' ? 'إرسال' : 'Send'}</span>
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

      {/* Chat Info Sheet */}
      <ChatInfoSheet
        open={infoSheetOpen}
        onOpenChange={setInfoSheetOpen}
        user={{
          id,
          name,
          username: username || '',
          avatar,
          rank,
          isOnline,
          lastSeen,
          country,
          engagementStatus,
          p2pStats,
        }}
        onTransfer={onTransfer}
        isStarred={isStarred}
        onToggleStar={handleToggleStar}
      />
    </>
  );
}

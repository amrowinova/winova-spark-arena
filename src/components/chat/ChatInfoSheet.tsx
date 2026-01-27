import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UserRank } from '@/contexts/UserContext';
import { RankBadge } from '@/components/common/RankBadge';
import {
  DollarSign,
  User,
  Star,
  Search,
  Image,
  Link2,
  FileText,
  Bell,
  BellOff,
  Ban,
  Flag,
  Check,
  X,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    username: string;
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
  };
  onTransfer: () => void;
  isStarred?: boolean;
  onToggleStar?: () => void;
}

export function ChatInfoSheet({
  open,
  onOpenChange,
  user,
  onTransfer,
  isStarred = false,
  onToggleStar,
}: ChatInfoSheetProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [muteOpen, setMuteOpen] = useState(false);

  const isContestActive = user.engagementStatus === 'both' || user.engagementStatus === 'contest';
  const isVoteActive = user.engagementStatus === 'both' || user.engagementStatus === 'vote';

  const handleViewProfile = () => {
    onOpenChange(false);
    navigate(`/user/${user.id}`);
  };

  const getStatusText = () => {
    if (user.isOnline) {
      return language === 'ar' ? 'متصل الآن' : 'Online now';
    }
    if (user.lastSeen) {
      return language === 'ar' ? `آخر ظهور ${user.lastSeen}` : `Last seen ${user.lastSeen}`;
    }
    return null;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>
            {language === 'ar' ? 'معلومات المحادثة' : 'Chat Info'}
          </SheetTitle>
        </SheetHeader>
        
        {/* User Profile Section */}
        <div className="flex flex-col items-center pt-6 pb-4 px-4 bg-card">
          {/* Avatar */}
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl">
              {user.avatar}
            </div>
            {user.isOnline && (
              <span className="absolute bottom-1 end-1 w-4 h-4 bg-success rounded-full border-3 border-card" />
            )}
          </div>

          {/* Name & Rank */}
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold">{user.name}</h2>
            {user.rank && <RankBadge rank={user.rank} size="sm" />}
          </div>

          {/* Username */}
          <p className="text-sm text-muted-foreground mb-1">@{user.username}</p>

          {/* Status */}
          {getStatusText() && (
            <p className={`text-xs ${user.isOnline ? 'text-success' : 'text-muted-foreground'}`}>
              {getStatusText()}
            </p>
          )}

          {/* Country */}
          {user.country && (
            <p className="text-xs text-muted-foreground mt-1">{user.country}</p>
          )}

          {/* Engagement Status */}
          <div className="flex items-center gap-3 mt-3">
            <span className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-full ${
              isContestActive 
                ? 'bg-success/10 text-success' 
                : 'bg-destructive/10 text-destructive'
            }`}>
              {isContestActive ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {language === 'ar' ? 'مسابقة' : 'Contest'}
            </span>
            <span className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-full ${
              isVoteActive 
                ? 'bg-success/10 text-success' 
                : 'bg-destructive/10 text-destructive'
            }`}>
              {isVoteActive ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {language === 'ar' ? 'تصويت' : 'Vote'}
            </span>
          </div>

          {/* P2P Summary */}
          {user.p2pStats && (
            <div className="flex items-center gap-4 mt-3 p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-1 text-xs">
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                <span>{user.p2pStats.trades} {language === 'ar' ? 'صفقة' : 'trades'}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="text-success">{user.p2pStats.rating}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 px-4 py-3 border-b border-border">
          <Button 
            variant="outline" 
            className="flex-1 gap-2"
            onClick={onTransfer}
          >
            <DollarSign className="h-4 w-4" />
            <span>{language === 'ar' ? 'تحويل' : 'Send'} И</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 gap-2"
            onClick={handleViewProfile}
          >
            <User className="h-4 w-4" />
            <span>{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
          </Button>
          <Button 
            variant={isStarred ? "default" : "outline"}
            size="icon"
            onClick={onToggleStar}
            className={isStarred ? 'bg-primary hover:bg-primary/90' : ''}
          >
            <Star className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
          </Button>
        </div>

        {/* Chat Tools Section */}
        <div className="px-4 py-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
            {language === 'ar' ? 'أدوات المحادثة' : 'Chat Tools'}
          </p>
          
          <Button variant="ghost" className="w-full justify-start gap-3 h-11">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span>{language === 'ar' ? 'بحث في المحادثة' : 'Search in Chat'}</span>
          </Button>
          
          <Button variant="ghost" className="w-full justify-start gap-3 h-11">
            <Image className="h-4 w-4 text-muted-foreground" />
            <span>{language === 'ar' ? 'الوسائط' : 'Media'}</span>
          </Button>
          
          <Button variant="ghost" className="w-full justify-start gap-3 h-11">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span>{language === 'ar' ? 'الروابط' : 'Links'}</span>
          </Button>
          
          <Button variant="ghost" className="w-full justify-start gap-3 h-11">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{language === 'ar' ? 'المستندات' : 'Documents'}</span>
          </Button>
          
          <Button variant="ghost" className="w-full justify-start gap-3 h-11">
            <Star className="h-4 w-4 text-muted-foreground" />
            <span>{language === 'ar' ? 'الرسائل المميزة' : 'Starred Messages'}</span>
          </Button>
        </div>

        <Separator />

        {/* Notifications & Privacy Section */}
        <div className="px-4 py-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
            {language === 'ar' ? 'الإشعارات والخصوصية' : 'Notifications & Privacy'}
          </p>
          
          <DropdownMenu open={muteOpen} onOpenChange={setMuteOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-11">
                <BellOff className="h-4 w-4 text-muted-foreground" />
                <span>{language === 'ar' ? 'كتم الإشعارات' : 'Mute Notifications'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem>
                {language === 'ar' ? '8 ساعات' : '8 hours'}
              </DropdownMenuItem>
              <DropdownMenuItem>
                {language === 'ar' ? 'أسبوع' : '1 week'}
              </DropdownMenuItem>
              <DropdownMenuItem>
                {language === 'ar' ? 'دائماً' : 'Always'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive">
            <Ban className="h-4 w-4" />
            <span>{language === 'ar' ? 'حظر المستخدم' : 'Block User'}</span>
          </Button>
          
          <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive">
            <Flag className="h-4 w-4" />
            <span>{language === 'ar' ? 'إبلاغ' : 'Report'}</span>
          </Button>
        </div>

        <div className="h-6" /> {/* Bottom padding */}
      </SheetContent>
    </Sheet>
  );
}

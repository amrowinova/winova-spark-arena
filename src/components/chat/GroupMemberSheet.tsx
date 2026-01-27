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
import { useLanguage } from '@/contexts/LanguageContext';
import type { UserRank } from '@/contexts/UserContext';
import { RankBadge } from '@/components/common/RankBadge';
import {
  DollarSign,
  User,
  MessageCircle,
  BellOff,
  Ban,
  Flag,
  Check,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GroupMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    rank: UserRank;
    isActive: boolean;
    engagementStatus?: 'both' | 'contest' | 'vote' | 'none';
  };
  onTransfer: () => void;
  onPrivateMessage: () => void;
}

export function GroupMemberSheet({
  open,
  onOpenChange,
  member,
  onTransfer,
  onPrivateMessage,
}: GroupMemberSheetProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [muteOpen, setMuteOpen] = useState(false);

  const isContestActive = member.engagementStatus === 'both' || member.engagementStatus === 'contest';
  const isVoteActive = member.engagementStatus === 'both' || member.engagementStatus === 'vote';

  const handleViewProfile = () => {
    onOpenChange(false);
    navigate(`/user/${member.id}`);
  };

  const handlePrivateMessage = () => {
    onOpenChange(false);
    onPrivateMessage();
  };

  const handleTransfer = () => {
    onOpenChange(false);
    onTransfer();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>
            {language === 'ar' ? 'معلومات العضو' : 'Member Info'}
          </SheetTitle>
        </SheetHeader>
        
        {/* Member Profile Section */}
        <div className="flex flex-col items-center pt-6 pb-4 px-4 bg-card">
          {/* Avatar */}
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl">
              {member.avatar}
            </div>
            <span className={`absolute bottom-1 end-1 w-4 h-4 rounded-full border-3 border-card ${
              member.isActive ? 'bg-success' : 'bg-destructive'
            }`} />
          </div>

          {/* Name & Rank */}
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold">{member.name}</h2>
            <RankBadge rank={member.rank} size="sm" />
          </div>

          {/* Username */}
          <p className="text-sm text-muted-foreground mb-1">@{member.username}</p>

          {/* Activity Status */}
          <p className={`text-xs font-medium ${member.isActive ? 'text-success' : 'text-destructive'}`}>
            {member.isActive 
              ? (language === 'ar' ? 'نشط' : 'Active')
              : (language === 'ar' ? 'غير نشط' : 'Inactive')
            }
          </p>

          {/* Engagement Status */}
          {member.engagementStatus && member.engagementStatus !== 'none' && (
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
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-border">
          <Button 
            variant="outline" 
            className="flex-col gap-1 h-auto py-3"
            onClick={handleViewProfile}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">{language === 'ar' ? 'الملف' : 'Profile'}</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex-col gap-1 h-auto py-3"
            onClick={handlePrivateMessage}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-xs">{language === 'ar' ? 'مراسلة' : 'Message'}</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex-col gap-1 h-auto py-3"
            onClick={handleTransfer}
          >
            <DollarSign className="h-5 w-5" />
            <span className="text-xs">{language === 'ar' ? 'تحويل' : 'Send'} И</span>
          </Button>
        </div>

        {/* Privacy Actions */}
        <div className="px-4 py-3 space-y-1">
          <DropdownMenu open={muteOpen} onOpenChange={setMuteOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-11">
                <BellOff className="h-4 w-4 text-muted-foreground" />
                <span>{language === 'ar' ? 'كتم الإشعارات' : 'Mute'}</span>
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
            <span>{language === 'ar' ? 'حظر' : 'Block'}</span>
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

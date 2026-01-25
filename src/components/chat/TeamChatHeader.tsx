import { ArrowLeft, ArrowRight, Users, MoreVertical, Bell, BellOff, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';

interface TeamChatHeaderProps {
  teamName: string;
  teamNameAr: string;
  memberCount: number;
  activeCount: number;
  isMuted: boolean;
  onBack: () => void;
  onOpenInfo: () => void;
  onToggleMute: () => void;
  onRemindInactive: () => void;
}

export function TeamChatHeader({
  teamName,
  teamNameAr,
  memberCount,
  activeCount,
  isMuted,
  onBack,
  onOpenInfo,
  onToggleMute,
  onRemindInactive,
}: TeamChatHeaderProps) {
  const { language } = useLanguage();
  const BackArrow = language === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3 safe-top">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <BackArrow className="h-5 w-5" />
      </Button>

      {/* Team Info - Clickable */}
      <div 
        className="flex-1 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onOpenInfo}
      >
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {language === 'ar' ? teamNameAr : teamName}
          </p>
          <p className="text-xs text-muted-foreground">
            {activeCount}/{memberCount} {language === 'ar' ? 'نشط' : 'active'}
          </p>
        </div>
      </div>

      {/* Mute indicator */}
      {isMuted && (
        <BellOff className="h-4 w-4 text-muted-foreground" />
      )}

      {/* Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onOpenInfo}>
            <Info className="h-4 w-4 me-2" />
            {language === 'ar' ? 'معلومات الفريق' : 'Team Info'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleMute}>
            {isMuted ? (
              <>
                <Bell className="h-4 w-4 me-2" />
                {language === 'ar' ? 'إلغاء الكتم' : 'Unmute'}
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4 me-2" />
                {language === 'ar' ? 'كتم' : 'Mute'}
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onRemindInactive}>
            <Bell className="h-4 w-4 me-2 text-warning" />
            {language === 'ar' ? 'تذكير غير النشطين' : 'Remind Inactive'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

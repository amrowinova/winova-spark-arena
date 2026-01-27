import { Bell, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { RankBadge } from '@/components/common/RankBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export function Header({ title }: HeaderProps) {
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const { user } = useUser();
  const navigate = useNavigate();

  // Weekly rank (would come from backend)
  const weeklyRank = 47;

  const handleAvatarClick = () => {
    navigate('/profile');
  };

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center gap-2">
            {/* User Avatar - Clickable to Profile */}
            <button 
              onClick={handleAvatarClick}
              className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-primary/20 hover:ring-primary/40 transition-all"
            >
              <Avatar className="h-full w-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-base">
                  {title || user.name}
                </span>
                <RankBadge rank={user.rank} size="sm" />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'ترتيبك في التطبيق:' : 'App Rank:'}
                </span>
                <span className="text-xs font-bold text-primary">
                  #{weeklyRank}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {language === 'ar' ? '(ضمن الأقوى)' : '(Top Performer)'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="h-9 w-9 rounded-full"
          >
            <Globe className="h-4 w-4" />
            <span className="sr-only">{t('settings.language')}</span>
          </Button>
          
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          </Button>
        </div>
      </div>
    </header>
  );
}

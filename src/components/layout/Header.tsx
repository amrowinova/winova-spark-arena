import { Bell, Settings, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { RankBadge } from '@/components/common/RankBadge';
import { motion } from 'framer-motion';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export function Header({ title }: HeaderProps) {
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const { user } = useUser();

  // Mock weekly rank (would come from backend)
  const weeklyRank = 47;

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">W</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">
                  {title || user.name}
                </span>
                <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
                  #{weeklyRank}
                </span>
              </div>
              <RankBadge rank={user.rank} size="sm" className="mt-0.5" />
            </div>
          </div>
        </motion.div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="h-8 w-8 rounded-full"
          >
            <Globe className="h-4 w-4" />
            <span className="sr-only">{t('settings.language')}</span>
          </Button>
          
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Language indicator - smaller and less intrusive */}
      <motion.div
        key={language}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-muted/80 rounded-full"
      >
        <span className="text-[9px] font-medium text-muted-foreground">
          {language === 'en' ? 'EN' : 'ع'}
        </span>
      </motion.div>
    </header>
  );
}

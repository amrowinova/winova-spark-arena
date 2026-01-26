import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Award, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface WinRecord {
  id: string;
  contestName: string;
  contestDate: string;
  position: 1 | 2 | 3 | 4 | 5;
  prizeAmount: number;
  prizeType: 'nova' | 'aura';
  userAvatar?: string;
  userName: string;
  username: string;
}

interface WinsHistoryCardProps {
  wins: WinRecord[];
  onViewContest?: (contestId: string) => void;
}

const positionConfig = {
  1: {
    icon: Crown,
    label: { en: '1st', ar: 'الأول' },
    gradient: 'from-yellow-400 to-amber-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    textColor: 'text-yellow-600',
  },
  2: {
    icon: Medal,
    label: { en: '2nd', ar: 'الثاني' },
    gradient: 'from-gray-300 to-gray-400',
    bgColor: 'bg-gray-400/10',
    borderColor: 'border-gray-400/30',
    textColor: 'text-gray-500',
  },
  3: {
    icon: Medal,
    label: { en: '3rd', ar: 'الثالث' },
    gradient: 'from-amber-600 to-amber-700',
    bgColor: 'bg-amber-600/10',
    borderColor: 'border-amber-600/30',
    textColor: 'text-amber-600',
  },
  4: {
    icon: Award,
    label: { en: 'Top 5', ar: 'أفضل 5' },
    gradient: 'from-primary/80 to-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    textColor: 'text-primary',
  },
  5: {
    icon: Award,
    label: { en: 'Top 5', ar: 'أفضل 5' },
    gradient: 'from-primary/60 to-primary/80',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    textColor: 'text-primary',
  },
};

export function WinsHistoryCard({ wins, onViewContest }: WinsHistoryCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  if (wins.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5 text-nova" />
          {t('profile.winsHistory')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-4">
        <ScrollArea className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className={cn("flex gap-3 px-4", isRTL && "flex-row-reverse")}>
            {wins.map((win, index) => {
              const config = positionConfig[win.position];
              const PositionIcon = config.icon;
              
              return (
                <motion.div
                  key={win.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => onViewContest?.(win.id)}
                  className={cn(
                    "flex-shrink-0 w-[200px] rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md",
                    config.bgColor,
                    config.borderColor
                  )}
                >
                  {/* Position Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold text-white",
                      `bg-gradient-to-r ${config.gradient}`
                    )}>
                      <PositionIcon className="h-3.5 w-3.5" />
                      {isRTL ? config.label.ar : config.label.en}
                    </div>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Calendar className="h-3 w-3" />
                      {win.contestDate}
                    </Badge>
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar className="h-10 w-10 border-2 border-background">
                      <AvatarImage src={win.userAvatar} alt={win.userName} />
                      <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                        {win.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{win.userName}</p>
                      <p className="text-xs text-muted-foreground truncate">@{win.username}</p>
                    </div>
                  </div>

                  {/* Contest Name */}
                  <p className="text-xs text-muted-foreground mb-2 truncate">
                    {win.contestName}
                  </p>

                  {/* Prize */}
                  <div className={cn(
                    "flex items-center gap-1 text-lg font-bold",
                    win.prizeType === 'nova' ? 'text-nova' : 'text-aura'
                  )}>
                    {win.prizeType === 'nova' ? '✦' : '◈'} {win.prizeAmount}
                    <span className="text-xs font-normal text-muted-foreground uppercase">
                      {win.prizeType}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        
        {/* Scroll Hint */}
        <div className="flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground">
          {isRTL ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          <span>{t('profile.scrollForMore')}</span>
          {isRTL ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </div>
      </CardContent>
    </Card>
  );
}

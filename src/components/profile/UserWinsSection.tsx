import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Trophy, Crown, Medal, Award, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ContestWin {
  id: string;
  contestId: string;
  contestName: string;
  contestNameAr: string;
  contestDate: string;
  position: 1 | 2 | 3 | 4 | 5;
  prizeAmount: number;
}

interface UserWinsSectionProps {
  wins: ContestWin[];
  isOwnProfile?: boolean;
  onViewMore?: () => void;
  onViewContest?: (contestId: string) => void;
}

const positionConfig = {
  1: {
    icon: Crown,
    labelEn: '1st',
    labelAr: 'الأول',
    gradient: 'from-yellow-400 to-amber-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  2: {
    icon: Medal,
    labelEn: '2nd',
    labelAr: 'الثاني',
    gradient: 'from-gray-300 to-gray-400',
    bgColor: 'bg-gray-400/10',
    borderColor: 'border-gray-400/30',
  },
  3: {
    icon: Medal,
    labelEn: '3rd',
    labelAr: 'الثالث',
    gradient: 'from-amber-600 to-amber-700',
    bgColor: 'bg-amber-600/10',
    borderColor: 'border-amber-600/30',
  },
  4: {
    icon: Award,
    labelEn: 'Top 5',
    labelAr: 'أفضل 5',
    gradient: 'from-primary/80 to-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
  },
  5: {
    icon: Award,
    labelEn: 'Top 5',
    labelAr: 'أفضل 5',
    gradient: 'from-primary/60 to-primary/80',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
  },
};

export function UserWinsSection({ wins, isOwnProfile = false, onViewMore, onViewContest }: UserWinsSectionProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  if (wins.length === 0) {
    return null;
  }

  // Title changes based on whose profile we're viewing
  const sectionTitle = isOwnProfile 
    ? (isRTL ? 'انتصاراتي' : 'My Wins')
    : (isRTL ? 'انتصاراته' : 'Their Wins');

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-nova" />
          {sectionTitle}
        </h3>
        {onViewMore && wins.length > 3 && (
          <Button variant="ghost" size="sm" onClick={onViewMore} className="text-primary">
            {isRTL ? 'عرض المزيد' : 'View More'}
            {isRTL ? <ChevronLeft className="h-4 w-4 ms-1" /> : <ChevronRight className="h-4 w-4 ms-1" />}
          </Button>
        )}
      </div>

      <ScrollArea className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className={cn('flex gap-3 pb-2', isRTL && 'flex-row-reverse')}>
          {wins.map((win, index) => {
            const config = positionConfig[win.position];
            const PositionIcon = config.icon;

            return (
              <motion.div
                key={win.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onViewContest?.(win.contestId)}
                className={cn(
                  'flex-shrink-0 w-[180px] rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md',
                  config.bgColor,
                  config.borderColor
                )}
              >
                {/* Position Badge + Date */}
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold text-white',
                      `bg-gradient-to-r ${config.gradient}`
                    )}
                  >
                    <PositionIcon className="h-3.5 w-3.5" />
                    {isRTL ? config.labelAr : config.labelEn}
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <Calendar className="h-3 w-3" />
                  {win.contestDate}
                </div>

                {/* Contest Name */}
                <p className="text-sm font-medium text-foreground truncate mb-3">
                  {isRTL ? win.contestNameAr : win.contestName}
                </p>

                {/* Prize */}
                <div className="flex items-center gap-1 text-lg font-bold text-nova">
                  <span>И</span>
                  <span>{win.prizeAmount}</span>
                  <span className="text-xs font-normal text-muted-foreground">Nova</span>
                </div>
              </motion.div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}

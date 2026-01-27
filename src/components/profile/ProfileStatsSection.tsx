import { motion } from 'framer-motion';
import { Trophy, Target, Vote, Clover } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ProfileStats {
  contests: number;
  wins: number;
  votesGiven: number;
  votesReceived: number;
  luckyWins: number;
}

interface ProfileStatsSectionProps {
  stats: ProfileStats;
  isOwnProfile?: boolean;
}

export function ProfileStatsSection({ stats, isOwnProfile = false }: ProfileStatsSectionProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Title changes based on whose profile
  const sectionTitle = isOwnProfile 
    ? (isRTL ? 'إنجازاتي' : 'My Achievements')
    : (isRTL ? 'إنجازاته' : 'Their Achievements');

  const statsCards = [
    {
      icon: Target,
      label: isRTL ? 'المسابقات' : 'Contests',
      value: stats.contests,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Trophy,
      label: isRTL ? 'الانتصارات' : 'Wins',
      value: stats.wins,
      color: 'text-nova',
      bgColor: 'bg-nova/10',
    },
    {
      icon: Vote,
      label: isRTL ? 'الأصوات' : 'Votes',
      value: null,
      subValues: [
        { label: isRTL ? 'صوّت' : 'Given', value: stats.votesGiven },
        { label: isRTL ? 'استلم' : 'Received', value: stats.votesReceived },
      ],
      color: 'text-aura',
      bgColor: 'bg-aura/10',
    },
    {
      icon: Clover,
      label: isRTL ? 'فوز محظوظ' : 'Lucky Wins',
      value: stats.luckyWins,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h2 className="text-lg font-semibold mb-4">{sectionTitle}</h2>
      
      <div className="grid grid-cols-2 gap-3">
        {statsCards.map((stat, index) => (
          <Card key={index} className="border-border/50">
            <CardContent className="p-4">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center mb-3", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {stat.label}
              </p>
              {stat.value !== null ? (
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              ) : (
                <div className="flex items-center gap-3">
                  {stat.subValues?.map((sub, i) => (
                    <div key={i} className="text-center">
                      <p className="text-lg font-bold text-foreground">
                        {sub.value}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {sub.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.section>
  );
}

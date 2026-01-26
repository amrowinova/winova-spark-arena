import { motion } from 'framer-motion';
import { TrendingUp, ChevronRight, Target, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';

interface UserRankingCardProps {
  dailyRank: number;
  currentVotes: number;
  votesNeededForTop50: number;
}

export function UserRankingCard({ dailyRank, currentVotes, votesNeededForTop50 }: UserRankingCardProps) {
  const { language } = useLanguage();
  const votesRemaining = Math.max(0, votesNeededForTop50 - currentVotes);
  const progressPercent = Math.min(100, (currentVotes / votesNeededForTop50) * 100);
  const isInTop50 = dailyRank <= 50;

  return (
    <Card className={`overflow-hidden ${isInTop50 ? 'border-success glow-success' : 'border-warning/50'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className={`h-5 w-5 ${isInTop50 ? 'text-success' : 'text-warning'}`} />
            <span className="font-semibold">
              {language === 'ar' ? 'ترتيبك في المسابقة' : 'Your Contest Rank'}
            </span>
          </div>
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`text-2xl font-bold ${isInTop50 ? 'text-success' : 'text-warning'}`}
          >
            #{dailyRank}
          </motion.div>
        </div>

        {!isInTop50 && (
          <>
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'للدخول في Top 50' : 'To reach Top 50'}
                </span>
                <span className="font-medium text-warning">
                  {votesRemaining} {language === 'ar' ? 'صوت متبقي' : 'votes left'}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="p-3 bg-warning/10 rounded-lg mb-3">
              <p className="text-xs text-warning flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {language === 'ar' 
                  ? `لديك ${currentVotes} صوت • تحتاج ${votesRemaining} للتأهل`
                  : `You have ${currentVotes} votes • Need ${votesRemaining} to qualify`
                }
              </p>
            </div>
          </>
        )}

        {isInTop50 && (
          <div className="p-3 bg-success/10 rounded-lg mb-3">
            <p className="text-xs text-success flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {language === 'ar' 
                ? '🎉 أنت في Top 50! حافظ على مركزك'
                : '🎉 You\'re in Top 50! Maintain your position'
              }
            </p>
          </div>
        )}

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/contests" className="flex items-center justify-center gap-2">
            <HelpCircle className="h-4 w-4" />
            {language === 'ar' ? 'كيف أتقدم؟' : 'How can I improve?'}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

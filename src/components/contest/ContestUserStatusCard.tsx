import { motion } from 'framer-motion';
import { Target, TrendingUp, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';

interface ContestUserStatusCardProps {
  userRank: number;
  userVotes: number;
  votesNeededForTop50: number;
  hasJoined: boolean;
}

export function ContestUserStatusCard({ 
  userRank, 
  userVotes, 
  votesNeededForTop50,
  hasJoined 
}: ContestUserStatusCardProps) {
  const { language } = useLanguage();
  
  if (!hasJoined) return null;
  
  const isQualified = userRank <= 50;
  const votesRemaining = Math.max(0, votesNeededForTop50 - userVotes);
  const progressPercent = Math.min(100, (userVotes / votesNeededForTop50) * 100);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card className={`overflow-hidden ${isQualified ? 'border-success glow-success' : 'border-warning'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Rank Circle */}
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`w-16 h-16 rounded-full flex flex-col items-center justify-center ${
                isQualified 
                  ? 'bg-success/10 text-success border-2 border-success' 
                  : 'bg-warning/10 text-warning border-2 border-warning'
              }`}
            >
              <span className="text-2xl font-bold">#{userRank}</span>
            </motion.div>
            
            {/* Info */}
            <div className="flex-1">
              <p className="font-semibold text-sm mb-1">
                {language === 'ar' ? 'ترتيبك اليوم' : 'Your Rank Today'}
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                {userVotes} {language === 'ar' ? 'صوت' : 'votes'}
              </p>
              
              {isQualified ? (
                <div className="flex items-center gap-1 text-success text-xs font-medium">
                  <Check className="h-3 w-3" />
                  {language === 'ar' ? 'ضمن المتأهلين' : 'Qualified'}
                </div>
              ) : (
                <div className="space-y-1">
                  <Progress value={progressPercent} className="h-1.5" />
                  <p className="text-xs text-warning flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {language === 'ar' 
                      ? `تحتاج ${votesRemaining} صوت للدخول إلى Top 50`
                      : `Need ${votesRemaining} votes for Top 50`
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

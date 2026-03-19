import { motion } from 'framer-motion';
import { Crown, Flame, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

interface FinalStageUserCardProps {
  userRank: number | null;
  userVotes: number;
  isQualified: boolean;
  totalParticipants?: number;
}

export function FinalStageUserCard({ userRank, userVotes, isQualified, totalParticipants = 0 }: FinalStageUserCardProps) {
  const { language } = useLanguage();
  
  // User did not qualify
  if (!isQualified) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardContent className="p-6 text-center">
          <Heart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <h3 className="font-bold text-lg mb-2">
            {language === 'ar' ? 'لم تتأهل للمرحلة النهائية' : 'You did not qualify for the Final Stage'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' 
              ? 'حاول مجددًا في مسابقة اليوم التالي 💙'
              : 'Try again in tomorrow\'s contest 💙'}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const isTop5 = userRank !== null && userRank <= 5;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card className={`overflow-hidden ${isTop5 ? 'border-amber-500 shadow-amber-500/20 shadow-lg' : 'border-success'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Rank Circle */}
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`w-16 h-16 rounded-full flex flex-col items-center justify-center ${
                isTop5 
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' 
                  : 'bg-success/10 text-success border-2 border-success'
              }`}
            >
              {isTop5 && <Crown className="h-4 w-4 mb-0.5" />}
              <span className="text-xl font-bold">#{userRank}</span>
            </motion.div>
            
            {/* Info */}
            <div className="flex-1">
              <p className="font-semibold text-sm mb-1">
                {language === 'ar' ? 'ترتيبك الحالي' : 'Your Current Rank'}
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                {userVotes} {language === 'ar' ? 'صوت' : 'votes'}
              </p>
              
              <div className={`flex items-center gap-1 text-xs font-medium ${isTop5 ? 'text-amber-600' : 'text-success'}`}>
                <Flame className="h-3 w-3" />
                {isTop5
                  ? (language === 'ar' ? 'أنت ضمن الفائزين حالياً! 👑' : 'You\'re currently winning! 👑')
                  : (language === 'ar' ? 'أنت ضمن المتأهلين – المنافسة على الفوز بدأت 🔥' : 'You\'re qualified – The race for victory has begun 🔥')
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { Crown, Target, Rocket, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCountryFlag } from '@/lib/countryFlags';

interface Contestant {
  id: string;
  name: string;
  username: string;
  votes: number;
  avatar: string;
  rank: number;
  country: string;
}

interface FinalContestantCardProps {
  contestant: Contestant;
  index: number;
  onVote: (contestant: Contestant) => void;
  canVote?: boolean;
  votesExhausted?: boolean;
}

// Prize data for top 5
const PRIZE_DATA = [
  { rank: 1, emoji: '🥇', amount: 500 },
  { rank: 2, emoji: '🥈', amount: 300 },
  { rank: 3, emoji: '🥉', amount: 200 },
  { rank: 4, emoji: '🏅', amount: 100 },
  { rank: 5, emoji: '🏅', amount: 50 },
];

export function FinalContestantCard({ 
  contestant, 
  index, 
  onVote,
  canVote = true,
  votesExhausted = false 
}: FinalContestantCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  
  const isTop5 = contestant.rank <= 5;
  const isTop3 = contestant.rank <= 3;

  const handleProfileClick = () => {
    navigate(`/user/${contestant.id}`);
  };

  // Get prize info for top 5
  const prizeInfo = PRIZE_DATA.find(p => p.rank === contestant.rank);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className={`transition-all ${
        isTop5 
          ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10' 
          : 'border-muted'
      }`}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-3">
            {/* Rank Badge */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              isTop3 
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' 
                : isTop5
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-muted text-muted-foreground'
            }`}>
              {isTop3 && <Crown className="h-3 w-3 absolute -top-1 -right-1" />}
              {contestant.rank}
            </div>
            
            {/* Avatar - Clickable */}
            <div 
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={handleProfileClick}
            >
              {contestant.avatar}
            </div>
            
            {/* Name & Votes */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p 
                  className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={handleProfileClick}
                >
                  {contestant.name}
                </p>
                {getCountryFlag(contestant.country) && (
                  <span className="text-sm shrink-0">{getCountryFlag(contestant.country)}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {contestant.votes} {isRTL ? 'صوت' : 'votes'}
              </p>
            </div>
            
            {/* Status Badge */}
            <div className="shrink-0">
              {isTop5 ? (
                <Badge className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  <Crown className="h-3 w-3 me-1" />
                  {isRTL ? 'فائز مؤقت' : 'Winning'}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-muted-foreground/30 text-muted-foreground">
                  <Target className="h-3 w-3 me-1" />
                  {isRTL ? 'ينافس' : 'Competing'}
                </Badge>
              )}
            </div>
            
            {/* Vote Button */}
            {canVote && (
              votesExhausted ? (
                <div className="shrink-0 flex flex-col items-center">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-xs h-8 px-3 opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <Lock className="h-3 w-3 me-1" />
                    {isRTL ? 'مقفل' : 'Locked'}
                  </Button>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  variant={isTop5 ? "default" : "outline"}
                  className={`shrink-0 text-xs h-8 px-3 ${isTop5 ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' : ''}`}
                  onClick={() => onVote(contestant)}
                >
                  {isRTL ? 'صوّت' : 'Vote'}
                </Button>
              )
            )}
          </div>

          {/* Prize Info for Top 5 */}
          {isTop5 && prizeInfo && (
            <div className="pt-2 border-t border-amber-500/20">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                {prizeInfo.emoji} {isRTL 
                  ? `عند انتهاء المسابقة وأنت في هذا المركز سوف تتلقى ${prizeInfo.amount} Nova`
                  : `If you finish in this position you'll receive ${prizeInfo.amount} Nova`}
              </p>
            </div>
          )}

          {/* Motivational text for ranks 6+ */}
          {!isTop5 && (
            <div className="pt-2 border-t border-muted">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Rocket className="h-3 w-3" />
                {isRTL 
                  ? 'اقترب أكثر! ادخل ضمن أول 5 للفوز بجائزة Nova'
                  : 'Get closer! Enter Top 5 to win a Nova prize'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

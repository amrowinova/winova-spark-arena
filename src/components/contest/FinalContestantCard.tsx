import { motion } from 'framer-motion';
import { Crown, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

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
}

export function FinalContestantCard({ 
  contestant, 
  index, 
  onVote,
  canVote = true 
}: FinalContestantCardProps) {
  const { language } = useLanguage();
  
  const isTop5 = contestant.rank <= 5;
  const isTop3 = contestant.rank <= 3;
  
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
        <CardContent className="p-3 flex items-center gap-3">
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
          
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg shrink-0">
            {contestant.avatar}
          </div>
          
          {/* Name & Votes */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{contestant.name}</p>
            <p className="text-xs text-muted-foreground">
              {contestant.votes} {language === 'ar' ? 'صوت' : 'votes'}
            </p>
          </div>
          
          {/* Status Badge */}
          <div className="shrink-0">
            {isTop5 ? (
              <Badge className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <Crown className="h-3 w-3 me-1" />
                {language === 'ar' ? 'فائز مؤقت' : 'Winning'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-muted-foreground/30 text-muted-foreground">
                <Target className="h-3 w-3 me-1" />
                {language === 'ar' ? 'ينافس' : 'Competing'}
              </Badge>
            )}
          </div>
          
          {/* Vote Button */}
          {canVote && (
            <Button 
              size="sm" 
              variant={isTop5 ? "default" : "outline"}
              className={`shrink-0 text-xs h-8 px-3 ${isTop5 ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' : ''}`}
              onClick={() => onVote(contestant)}
            >
              {language === 'ar' ? 'صوّت' : 'Vote'}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

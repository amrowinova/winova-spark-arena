import { motion } from 'framer-motion';
import { Check, XCircle } from 'lucide-react';
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

interface ContestContestantCardProps {
  contestant: Contestant;
  index: number;
  onVote: (contestant: Contestant) => void;
  canVote?: boolean;
}

export function ContestContestantCard({ 
  contestant, 
  index, 
  onVote,
  canVote = true 
}: ContestContestantCardProps) {
  const { language } = useLanguage();
  
  const isQualified = contestant.rank <= 50;
  const isTop3 = contestant.rank <= 3;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className={`transition-all ${
        isQualified 
          ? 'border-success/30 bg-success/5' 
          : 'border-muted bg-muted/20'
      }`}>
        <CardContent className="p-3 flex items-center gap-3">
          {/* Rank Badge */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
            isTop3 
              ? 'bg-gradient-nova text-nova-foreground' 
              : isQualified
                ? 'bg-success/20 text-success border border-success/30'
                : 'bg-muted text-muted-foreground'
          }`}>
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
          
          {/* Qualification Status Badge */}
          <div className="shrink-0">
            {isQualified ? (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-success/50 text-success bg-success/10">
                <Check className="h-3 w-3 me-1" />
                {language === 'ar' ? 'متأهل' : 'Qualified'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-muted-foreground/30 text-muted-foreground">
                <XCircle className="h-3 w-3 me-1" />
                {language === 'ar' ? 'خارج' : 'Out'}
              </Badge>
            )}
          </div>
          
          {/* Vote Button */}
          {canVote && (
            <Button 
              size="sm" 
              variant={isQualified ? "default" : "outline"}
              className="shrink-0 text-xs h-8 px-3"
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

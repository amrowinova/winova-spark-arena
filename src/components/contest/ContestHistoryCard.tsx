import { Calendar, Users, Trophy, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ContestHistoryItem {
  id: string;
  date: string;
  prizePool: number;
  participants: number;
  userRank: number | null;
  participated: boolean;
  winners: { name: string; prize: number; rank: number; votes: number }[];
}

interface ContestHistoryCardProps {
  contest: ContestHistoryItem;
  onViewDetails: (contest: ContestHistoryItem) => void;
}

export function ContestHistoryCard({ contest, onViewDetails }: ContestHistoryCardProps) {
  const { language } = useLanguage();
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {contest.date}
            </h3>
          </div>
          <Badge 
            variant={contest.participated ? "default" : "secondary"}
            className={contest.participated ? "bg-success/10 text-success border-success/30" : ""}
          >
            {contest.participated 
              ? (language === 'ar' ? 'شاركت' : 'Participated')
              : (language === 'ar' ? 'لم تشارك' : 'Did not participate')
            }
          </Badge>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <Trophy className="h-4 w-4 mx-auto mb-1 text-nova" />
            <p className="font-bold text-nova text-sm">И {contest.prizePool}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'الجوائز' : 'Prizes'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="font-bold text-sm">{contest.participants}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'مشارك' : 'Participants'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <span className="text-lg">🎯</span>
            <p className="font-bold text-sm">
              {contest.participated && contest.userRank ? `#${contest.userRank}` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'مركزك' : 'Your Rank'}
            </p>
          </div>
        </div>
        
        {/* CTA Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => onViewDetails(contest)}
        >
          {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
          <ChevronRight className="h-4 w-4 ms-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

import { motion } from 'framer-motion';
import { 
  Star, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface P2PComment {
  id: string;
  userName: string;
  userAvatar?: string;
  comment: string;
  rating: 'positive' | 'negative';
  date: string;
  tags?: string[];
}

interface P2PReputationData {
  overallRating: number; // 0-100
  totalTransactions: number;
  avgExecutionTime: string; // e.g., "5 min"
  disputeCount: number;
  positiveCount: number;
  negativeCount: number;
  recentComments: P2PComment[];
}

interface P2PReputationCardProps {
  reputation: P2PReputationData;
  onViewAllRatings?: () => void;
}

export function P2PReputationCard({ reputation, onViewAllRatings }: P2PReputationCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const ratingColor = reputation.overallRating >= 90 
    ? 'text-success' 
    : reputation.overallRating >= 70 
      ? 'text-nova' 
      : reputation.overallRating >= 50 
        ? 'text-warning' 
        : 'text-destructive';

  const stats = [
    {
      icon: CheckCircle2,
      label: t('profile.p2p.completed'),
      value: reputation.totalTransactions,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      icon: Clock,
      label: t('profile.p2p.avgTime'),
      value: reputation.avgExecutionTime,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: AlertTriangle,
      label: t('profile.p2p.disputes'),
      value: reputation.disputeCount,
      color: reputation.disputeCount > 0 ? 'text-warning' : 'text-muted-foreground',
      bgColor: reputation.disputeCount > 0 ? 'bg-warning/10' : 'bg-muted/50',
    },
  ];

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <Star className="h-5 w-5 text-nova fill-nova" />
            {t('profile.p2p.reputation')}
          </div>
          <Badge variant="outline" className={cn("text-sm font-bold", ratingColor)}>
            <Star className="h-3.5 w-3.5 mr-1 fill-current" />
            {reputation.overallRating}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rating Summary */}
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="text-center">
            <div className="flex items-center gap-1 text-success">
              <span className="text-lg">👍</span>
              <span className="text-xl font-bold">{reputation.positiveCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('profile.p2p.positive')}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="flex items-center gap-1 text-destructive">
              <span className="text-lg">👎</span>
              <span className="text-xl font-bold">{reputation.negativeCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('profile.p2p.negative')}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "rounded-lg p-3 text-center",
                stat.bgColor
              )}
            >
              <stat.icon className={cn("h-5 w-5 mx-auto mb-1", stat.color)} />
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Comments */}
        {reputation.recentComments.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              {t('profile.p2p.recentComments')}
            </h4>
            <ScrollArea className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
                {reputation.recentComments.map((comment, index) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "flex-shrink-0 w-[220px] rounded-lg border p-3",
                      comment.rating === 'positive' 
                        ? 'bg-success/5 border-success/20' 
                        : 'bg-destructive/5 border-destructive/20'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={comment.userAvatar} />
                        <AvatarFallback className="text-xs">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium truncate flex-1">
                        {comment.userName}
                      </span>
                      <span className="text-lg">
                        {comment.rating === 'positive' ? '👍' : '👎'}
                      </span>
                    </div>
                    
                    {comment.tags && comment.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {comment.tags.slice(0, 2).map((tag, i) => (
                          <Badge 
                            key={i} 
                            variant="secondary" 
                            className="text-[10px] px-1.5 py-0"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {comment.comment && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        "{comment.comment}"
                      </p>
                    )}
                    
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {comment.date}
                    </p>
                  </motion.div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {/* View All Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={onViewAllRatings}
        >
          {t('profile.p2p.viewAllRatings')}
          {isRTL ? (
            <ChevronLeft className="h-4 w-4 ms-2" />
          ) : (
            <ChevronRight className="h-4 w-4 ms-2" />
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

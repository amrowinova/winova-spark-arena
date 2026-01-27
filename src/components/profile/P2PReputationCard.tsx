import { motion } from 'framer-motion';
import { 
  Star, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  User,
  Package,
  ThumbsUp,
  ThumbsDown
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
  completedOrders: number;
  recentComments: P2PComment[];
}

interface P2PReputationCardProps {
  reputation: P2PReputationData;
  isOwnProfile?: boolean;
  onViewAllRatings?: () => void;
}

export function P2PReputationCard({ reputation, isOwnProfile = false, onViewAllRatings }: P2PReputationCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const ratingColor = reputation.overallRating >= 90 
    ? 'text-success' 
    : reputation.overallRating >= 70 
      ? 'text-nova' 
      : reputation.overallRating >= 50 
        ? 'text-warning' 
        : 'text-destructive';

  // Title changes based on whose profile
  const sectionTitle = isOwnProfile 
    ? (isRTL ? 'سمعتي P2P' : 'My P2P Reputation')
    : (isRTL ? 'سمعته P2P' : 'Their P2P Reputation');

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <Star className="h-5 w-5 text-nova fill-nova" />
            {sectionTitle}
          </div>
          <Badge variant="outline" className={cn("text-sm font-bold", ratingColor)}>
            <Star className="h-3.5 w-3.5 mr-1 fill-current" />
            {reputation.overallRating}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rating Summary - Positive/Negative */}
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="text-center">
            <div className="flex items-center gap-1 text-success">
              <ThumbsUp className="h-5 w-5" />
              <span className="text-xl font-bold">{reputation.positiveCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'إيجابي' : 'Positive'}
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="flex items-center gap-1 text-destructive">
              <ThumbsDown className="h-5 w-5" />
              <span className="text-xl font-bold">{reputation.negativeCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'سلبي' : 'Negative'}
            </p>
          </div>
        </div>

        {/* All 4 Stats Grid - Must include all elements */}
        <div className="grid grid-cols-2 gap-2">
          {/* Total Deals */}
          <div className="rounded-lg p-3 text-center bg-primary/10">
            <Package className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">{reputation.totalTransactions}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {isRTL ? 'عدد الصفقات' : 'Total Deals'}
            </p>
          </div>
          
          {/* Completed Orders */}
          <div className="rounded-lg p-3 text-center bg-success/10">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-success" />
            <p className="text-lg font-bold text-foreground">{reputation.completedOrders}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {isRTL ? 'طلبات مكتملة' : 'Completed'}
            </p>
          </div>
          
          {/* Avg Completion Time */}
          <div className="rounded-lg p-3 text-center bg-aura/10">
            <Clock className="h-5 w-5 mx-auto mb-1 text-aura" />
            <p className="text-lg font-bold text-foreground">{reputation.avgExecutionTime}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {isRTL ? 'متوسط الوقت' : 'Avg Time'}
            </p>
          </div>
          
          {/* Disputes */}
          <div className={cn(
            "rounded-lg p-3 text-center",
            reputation.disputeCount > 0 ? 'bg-warning/10' : 'bg-muted/50'
          )}>
            <AlertTriangle className={cn(
              "h-5 w-5 mx-auto mb-1",
              reputation.disputeCount > 0 ? 'text-warning' : 'text-muted-foreground'
            )} />
            <p className="text-lg font-bold text-foreground">{reputation.disputeCount}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {isRTL ? 'النزاعات' : 'Disputes'}
            </p>
          </div>
        </div>

        {/* Recent Comments */}
        {reputation.recentComments.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              {isRTL ? 'آخر التعليقات' : 'Recent Comments'}
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
                      {comment.rating === 'positive' ? (
                        <ThumbsUp className="h-4 w-4 text-success" />
                      ) : (
                        <ThumbsDown className="h-4 w-4 text-destructive" />
                      )}
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
          {isRTL ? 'عرض التقييمات' : 'View Ratings'}
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

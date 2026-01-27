import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, User, MessageSquare } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface P2PRating {
  id: string;
  reviewerName: string;
  reviewerNameAr: string;
  reviewerAvatar?: string;
  rating: 'positive' | 'negative';
  comment: string;
  commentAr: string;
  reason?: string;
  reasonAr?: string;
  tags?: string[];
  tagsAr?: string[];
  date: string;
  dateAr: string;
}

interface P2PRatingsSheetProps {
  open: boolean;
  onClose: () => void;
  ratings: P2PRating[];
  positiveCount: number;
  negativeCount: number;
}

export function P2PRatingsSheet({
  open,
  onClose,
  ratings,
  positiveCount,
  negativeCount,
}: P2PRatingsSheetProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState<'positive' | 'negative'>('positive');

  const positiveRatings = ratings.filter((r) => r.rating === 'positive');
  const negativeRatings = ratings.filter((r) => r.rating === 'negative');

  const RatingCard = ({ rating }: { rating: P2PRating }) => (
    <div
      className={cn(
        'p-4 rounded-xl border mb-3',
        rating.rating === 'positive'
          ? 'bg-success/5 border-success/20'
          : 'bg-destructive/5 border-destructive/20'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-10 w-10 border-2 border-background">
          <AvatarImage src={rating.reviewerAvatar} />
          <AvatarFallback className="bg-muted">
            <User className="h-4 w-4 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            {isRTL ? rating.reviewerNameAr : rating.reviewerName}
          </p>
          <p className="text-xs text-muted-foreground">
            {isRTL ? rating.dateAr : rating.date}
          </p>
        </div>
        <div
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center',
            rating.rating === 'positive' ? 'bg-success/10' : 'bg-destructive/10'
          )}
        >
          {rating.rating === 'positive' ? (
            <ThumbsUp className="h-4 w-4 text-success" />
          ) : (
            <ThumbsDown className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>

      {/* Tags */}
      {rating.tags && rating.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(isRTL ? rating.tagsAr || rating.tags : rating.tags).map((tag, i) => (
            <Badge
              key={i}
              variant="secondary"
              className={cn(
                'text-xs',
                rating.rating === 'positive'
                  ? 'bg-success/10 text-success border-success/20'
                  : 'bg-destructive/10 text-destructive border-destructive/20'
              )}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Comment */}
      {rating.comment && (
        <div className="flex items-start gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-foreground">
            "{isRTL ? rating.commentAr : rating.comment}"
          </p>
        </div>
      )}

      {/* Negative Reason */}
      {rating.rating === 'negative' && rating.reason && (
        <div className="mt-2 p-2 bg-destructive/10 rounded-lg">
          <p className="text-xs text-destructive font-medium">
            {isRTL ? 'السبب:' : 'Reason:'}{' '}
            <span className="font-normal">
              {isRTL ? rating.reasonAr || rating.reason : rating.reason}
            </span>
          </p>
        </div>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">
            {isRTL ? 'التقييمات' : 'Ratings'}
          </SheetTitle>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'positive' | 'negative')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="positive" className="gap-2">
              <ThumbsUp className="h-4 w-4" />
              <span>{isRTL ? 'إيجابية' : 'Positive'}</span>
              <Badge
                variant="secondary"
                className="bg-success/10 text-success text-xs px-1.5"
              >
                {positiveCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="negative" className="gap-2">
              <ThumbsDown className="h-4 w-4" />
              <span>{isRTL ? 'سلبية' : 'Negative'}</span>
              <Badge
                variant="secondary"
                className="bg-destructive/10 text-destructive text-xs px-1.5"
              >
                {negativeCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(85vh-180px)]">
            <TabsContent value="positive" className="mt-0 px-1">
              {positiveRatings.length > 0 ? (
                positiveRatings.map((rating) => (
                  <RatingCard key={rating.id} rating={rating} />
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <ThumbsUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {isRTL ? 'لا توجد تقييمات إيجابية' : 'No positive ratings yet'}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="negative" className="mt-0 px-1">
              {negativeRatings.length > 0 ? (
                negativeRatings.map((rating) => (
                  <RatingCard key={rating.id} rating={rating} />
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <ThumbsDown className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {isRTL ? 'لا توجد تقييمات سلبية' : 'No negative ratings yet'}
                  </p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

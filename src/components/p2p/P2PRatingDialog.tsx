import { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface RatingTag {
  id: string;
  labelEn: string;
  labelAr: string;
  type: 'positive' | 'negative';
}

const RATING_TAGS: RatingTag[] = [
  { id: 'fast', labelEn: 'Fast Transfer', labelAr: 'تحويل سريع', type: 'positive' },
  { id: 'committed', labelEn: 'Committed', labelAr: 'ملتزم', type: 'positive' },
  { id: 'name_match', labelEn: 'Name Matched', labelAr: 'اسم مطابق', type: 'positive' },
  { id: 'good_communication', labelEn: 'Good Communication', labelAr: 'تواصل جيد', type: 'positive' },
  { id: 'slow', labelEn: 'Slow', labelAr: 'بطيء', type: 'negative' },
  { id: 'delayed', labelEn: 'Delayed Payment', labelAr: 'تأخر في الدفع', type: 'negative' },
  { id: 'unresponsive', labelEn: 'Unresponsive', labelAr: 'غير متجاوب', type: 'negative' },
  { id: 'name_mismatch', labelEn: 'Name Mismatch', labelAr: 'اسم غير مطابق', type: 'negative' },
];

interface P2PRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counterparty: {
    name: string;
    nameAr: string;
    avatar: string;
  };
  orderId: string;
  orderAmount: number;
  onSubmitRating: (rating: {
    orderId: string;
    isPositive: boolean;
    tags: string[];
    comment?: string;
  }) => void;
}

export function P2PRatingDialog({
  open,
  onOpenChange,
  counterparty,
  orderId,
  orderAmount,
  onSubmitRating,
}: P2PRatingDialogProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [isPositive, setIsPositive] = useState<boolean | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const availableTags = RATING_TAGS.filter(tag => 
    isPositive === null || tag.type === (isPositive ? 'positive' : 'negative')
  );

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = () => {
    if (isPositive === null) return;

    onSubmitRating({
      orderId,
      isPositive,
      tags: selectedTags,
      comment: comment.trim() || undefined,
    });

    // Reset form
    setIsPositive(null);
    setSelectedTags([]);
    setComment('');
    onOpenChange(false);
  };

  // Comment is now mandatory
  const canSubmit = isPositive !== null && comment.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-nova" />
            {isRTL ? 'تقييم الصفقة' : 'Rate Transaction'}
          </DialogTitle>
          <DialogDescription>
            {isRTL ? 'طلب رقم' : 'Order'} #{orderId} • И {orderAmount}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Counterparty Info */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-xl">
                {counterparty.avatar}
              </div>
              <div>
                <p className="font-semibold">
                  {isRTL ? counterparty.nameAr : counterparty.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'كيف كانت تجربتك؟' : 'How was your experience?'}
                </p>
              </div>
            </div>
          </Card>

          {/* Rating Selection */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-20 flex-col gap-2 transition-all",
                isPositive === true && "border-success bg-success/10 text-success"
              )}
              onClick={() => {
                setIsPositive(true);
                setSelectedTags([]);
              }}
            >
              <ThumbsUp className={cn(
                "h-8 w-8",
                isPositive === true && "fill-success"
              )} />
              <span className="font-semibold">
                {isRTL ? 'إيجابي' : 'Positive'}
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-20 flex-col gap-2 transition-all",
                isPositive === false && "border-destructive bg-destructive/10 text-destructive"
              )}
              onClick={() => {
                setIsPositive(false);
                setSelectedTags([]);
              }}
            >
              <ThumbsDown className={cn(
                "h-8 w-8",
                isPositive === false && "fill-destructive"
              )} />
              <span className="font-semibold">
                {isRTL ? 'سلبي' : 'Negative'}
              </span>
            </Button>
          </div>

          {/* Rating Tags */}
          {isPositive !== null && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {isRTL ? 'اختر الوصف المناسب' : 'Select appropriate tags'}
              </p>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <Badge
                      key={tag.id}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all",
                        isSelected && isPositive && "bg-success hover:bg-success/90",
                        isSelected && !isPositive && "bg-destructive hover:bg-destructive/90"
                      )}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {isRTL ? tag.labelAr : tag.labelEn}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mandatory Comment - no anonymous option */}
          {isPositive !== null && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                {isRTL ? 'تعليق (إجباري)' : 'Comment (required)'}
                <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={isRTL ? 'اكتب تعليقك هنا...' : 'Write your comment here...'}
                rows={3}
                maxLength={200}
                className={cn(
                  comment.trim().length === 0 && "border-destructive/50 focus-visible:ring-destructive"
                )}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {isRTL ? '❌ لا يوجد تعليق مجهول' : '❌ No anonymous comments'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {comment.length}/200
                </p>
              </div>
            </div>
          )}

          {/* Info Notice */}
          <Card className="p-3 bg-info/10 border-info/30">
            <p className="text-xs text-info">
              {isRTL 
                ? 'تقييمك يساعد في بناء مجتمع P2P موثوق ويؤثر على ترتيب الإعلانات'
                : 'Your rating helps build a trusted P2P community and affects ad rankings'
              }
            </p>
          </Card>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit}
            className={cn(
              "w-full",
              isPositive === true && "bg-success hover:bg-success/90",
              isPositive === false && "bg-destructive hover:bg-destructive/90"
            )}
          >
            {isRTL ? '🟢 إرسال التقييم' : '🟢 Submit Rating'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

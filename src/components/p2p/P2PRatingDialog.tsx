import { useState, useEffect, useCallback } from 'react';
import { Star, ThumbsUp, ThumbsDown, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { useP2PRatings } from '@/hooks/useP2PRatings';
import { toast } from '@/hooks/use-toast';
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
    id: string;
    name: string;
    nameAr: string;
    avatar: string;
  };
  orderId: string;
  orderAmount: number;
  onSubmitRating?: (rating: {
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
  const { submitRating, isSubmitting, hasRatedOrder } = useP2PRatings();

  const [isPositive, setIsPositive] = useState<boolean | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  // Check if already rated when dialog opens
  useEffect(() => {
    if (open && orderId) {
      hasRatedOrder(orderId).then(rated => {
        setAlreadyRated(rated);
        if (rated) setSubmitted(true);
      });
    }
  }, [open, orderId, hasRatedOrder]);

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

  const handleSubmit = useCallback(async () => {
    if (isPositive === null) return;

    // Build comment with tags
    const tagLabels = selectedTags
      .map(id => RATING_TAGS.find(t => t.id === id))
      .filter(Boolean)
      .map(t => isRTL ? t!.labelAr : t!.labelEn);
    
    const fullComment = [
      ...tagLabels,
      comment.trim(),
    ].filter(Boolean).join('. ');

    // Submit via RPC
    const result = await submitRating(orderId, counterparty.id, isPositive, fullComment || undefined);

    if (result.success) {
      setSubmitted(true);
      toast({
        title: isRTL ? 'شكرًا لتقييمك!' : 'Thanks for your rating!',
        description: isRTL
          ? 'تقييمك يساعد في بناء مجتمع P2P موثوق'
          : 'Your rating helps build a trusted P2P community',
      });

      // Call legacy callback if provided
      onSubmitRating?.({
        orderId,
        isPositive,
        tags: selectedTags,
        comment: comment.trim() || undefined,
      });
    } else {
      toast({
        title: isRTL ? 'فشل التقييم' : 'Rating failed',
        description: result.error,
        variant: 'destructive',
      });
    }
  }, [isPositive, selectedTags, comment, orderId, counterparty.id, isRTL, submitRating, onSubmitRating]);

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after animation
    setTimeout(() => {
      if (!submitted && !alreadyRated) {
        setIsPositive(null);
        setSelectedTags([]);
        setComment('');
      }
    }, 300);
  };

  // Comment is now mandatory
  const canSubmit = isPositive !== null && comment.trim().length > 0 && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-nova" />
            {submitted
              ? (isRTL ? 'شكرًا لتقييمك!' : 'Thanks for your rating!')
              : (isRTL ? 'تقييم الصفقة' : 'Rate Transaction')
            }
          </DialogTitle>
          <DialogDescription>
            {isRTL ? 'طلب رقم' : 'Order'} #{orderId.slice(0, 8)} • И {orderAmount}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6 space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">
              {isRTL
                ? 'تقييمك يساعد في بناء مجتمع P2P موثوق'
                : 'Your rating helps build a trusted P2P community'
              }
            </p>
            <Button onClick={handleClose} className="w-full">
              {isRTL ? 'إغلاق' : 'Close'}
            </Button>
          </motion.div>
        ) : (
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
            <AnimatePresence>
              {isPositive !== null && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 overflow-hidden"
                >
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mandatory Comment */}
            <AnimatePresence>
              {isPositive !== null && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 overflow-hidden"
                >
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
                </motion.div>
              )}
            </AnimatePresence>

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
        )}

        {!submitted && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              {isRTL ? 'لاحقًا' : 'Later'}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!canSubmit}
              className={cn(
                "flex-1",
                isPositive === true && "bg-success hover:bg-success/90",
                isPositive === false && "bg-destructive hover:bg-destructive/90"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isRTL ? 'جاري الإرسال...' : 'Submitting...'}
                </>
              ) : (
                isRTL ? '🟢 إرسال التقييم' : '🟢 Submit Rating'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

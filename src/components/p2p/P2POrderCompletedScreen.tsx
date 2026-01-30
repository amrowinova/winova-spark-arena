import { useState } from 'react';
import { CheckCircle2, ThumbsUp, ThumbsDown, ArrowLeft, Star, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2POrder } from '@/contexts/P2PContext';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface RatingTag {
  id: string;
  labelEn: string;
  labelAr: string;
  type: 'positive' | 'negative';
}

const RATING_TAGS: RatingTag[] = [
  // Positive tags
  { id: 'fast', labelEn: 'Fast Transaction', labelAr: 'معاملة سريعة', type: 'positive' },
  { id: 'trusted', labelEn: 'Trusted Trader', labelAr: 'تاجر موثوق', type: 'positive' },
  { id: 'communication', labelEn: 'Great Communication', labelAr: 'تواصل ممتاز', type: 'positive' },
  { id: 'good_price', labelEn: 'Good Price', labelAr: 'سعر جيد', type: 'positive' },
  { id: 'professional', labelEn: 'Professional', labelAr: 'محترف', type: 'positive' },
  // Negative tags
  { id: 'slow', labelEn: 'Slow', labelAr: 'بطيء', type: 'negative' },
  { id: 'delayed', labelEn: 'Delayed Payment', labelAr: 'تأخير في الدفع', type: 'negative' },
  { id: 'time_issue', labelEn: 'Didn\'t Respect Time', labelAr: 'لم يلتزم بالوقت', type: 'negative' },
  { id: 'transfer_issue', labelEn: 'Transfer Problem', labelAr: 'مشكلة في التحويل', type: 'negative' },
  { id: 'unresponsive', labelEn: 'Unresponsive', labelAr: 'غير متجاوب', type: 'negative' },
];

interface P2PRatingData {
  isPositive: boolean;
  tags: string[];
  comment?: string;
}

interface P2POrderCompletedScreenProps {
  order: P2POrder;
  currentUserId: string;
  onRate: (isPositive: boolean, data?: P2PRatingData) => void;
  onClose: () => void;
  hasRated?: boolean;
}

export function P2POrderCompletedScreen({
  order,
  currentUserId,
  onRate,
  onClose,
  hasRated = false,
}: P2POrderCompletedScreenProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [selectedRating, setSelectedRating] = useState<boolean | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(hasRated);

  const isBuyer = order.buyer.id === currentUserId;
  const counterparty = isBuyer ? order.seller : order.buyer;

  // Filter tags based on selected rating
  const availableTags = RATING_TAGS.filter(tag => 
    selectedRating === null || tag.type === (selectedRating ? 'positive' : 'negative')
  );

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleRateSubmit = () => {
    if (selectedRating !== null) {
      const ratingData: P2PRatingData = {
        isPositive: selectedRating,
        tags: selectedTags,
        comment: comment.trim() || undefined,
      };
      
      onRate(selectedRating, ratingData);
      setSubmitted(true);
      
      // Show success toast
      toast({
        title: isRTL ? 'شكرًا لتقييمك!' : 'Thanks for your rating!',
        description: isRTL 
          ? 'تقييمك يساعد في بناء مجتمع P2P موثوق'
          : 'Your rating helps build a trusted P2P community',
      });
    }
  };

  const handleRatingSelect = (isPositive: boolean) => {
    setSelectedRating(isPositive);
    setSelectedTags([]); // Reset tags when changing rating type
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3 shrink-0 safe-top">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">
          {isRTL ? 'تمت الصفقة' : 'Order Completed'}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="flex flex-col items-center py-6"
        >
          <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-14 w-14 text-success" />
          </div>
          <h2 className="text-xl font-bold text-success">
            {isRTL ? '✓ تمت الصفقة بنجاح' : '✓ Order completed successfully'}
          </h2>
        </motion.div>

        {/* Order Details Card */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {isRTL ? 'رقم الطلب' : 'Order ID'}
              </span>
              <span className="font-mono text-sm">#{order.id}</span>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {isBuyer 
                    ? (isRTL ? 'Nova المستلمة' : 'Nova Received')
                    : (isRTL ? 'Nova المرسلة' : 'Nova Sent')
                  }
                </span>
                <span className="font-bold text-nova text-lg">
                  И {order.amount.toFixed(0)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {isBuyer
                    ? (isRTL ? 'المبلغ المدفوع' : 'Amount Paid')
                    : (isRTL ? 'المبلغ المستلم' : 'Amount Received')
                  }
                </span>
                <span className="font-bold text-success text-lg">
                  {order.currencySymbol} {order.total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl">
                  {counterparty.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    {isBuyer 
                      ? (isRTL ? 'البائع' : 'Seller')
                      : (isRTL ? 'المشتري' : 'Buyer')
                    }
                  </p>
                  <p className="font-semibold">
                    {isRTL ? counterparty.nameAr : counterparty.name}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 text-warning fill-warning" />
                  <span>{(counterparty.rating * 20).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating Section */}
        {!submitted ? (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="text-center">
                <h3 className="font-semibold mb-1">
                  {isRTL ? 'قيّم الصفقة' : 'Rate this transaction'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isRTL 
                    ? `كيف كانت تجربتك مع ${counterparty.nameAr}؟`
                    : `How was your experience with ${counterparty.name}?`
                  }
                </p>
              </div>

              {/* Rating Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-16 flex-col gap-2 transition-all",
                    selectedRating === true && "border-success bg-success/10 text-success"
                  )}
                  onClick={() => handleRatingSelect(true)}
                >
                  <ThumbsUp className={cn(
                    "h-6 w-6",
                    selectedRating === true && "fill-success"
                  )} />
                  <span className="text-sm font-medium">
                    {isRTL ? 'إيجابي' : 'Positive'}
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-16 flex-col gap-2 transition-all",
                    selectedRating === false && "border-destructive bg-destructive/10 text-destructive"
                  )}
                  onClick={() => handleRatingSelect(false)}
                >
                  <ThumbsDown className={cn(
                    "h-6 w-6",
                    selectedRating === false && "fill-destructive"
                  )} />
                  <span className="text-sm font-medium">
                    {isRTL ? 'سلبي' : 'Negative'}
                  </span>
                </Button>
              </div>

              {/* Expandable Rating Details */}
              <AnimatePresence>
                {selectedRating !== null && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Quick Tags */}
                    <div className="space-y-2 pt-2">
                      <p className="text-sm font-medium">
                        {isRTL ? 'اختر وصفًا سريعًا (اختياري)' : 'Quick tags (optional)'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => {
                          const isSelected = selectedTags.includes(tag.id);
                          return (
                            <Badge
                              key={tag.id}
                              variant={isSelected ? "default" : "outline"}
                              className={cn(
                                "cursor-pointer transition-all py-1.5 px-3",
                                isSelected && selectedRating && "bg-success hover:bg-success/90",
                                isSelected && !selectedRating && "bg-destructive hover:bg-destructive/90",
                                !isSelected && "hover:bg-muted"
                              )}
                              onClick={() => toggleTag(tag.id)}
                            >
                              {isRTL ? tag.labelAr : tag.labelEn}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {/* Comment Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        {isRTL ? 'تعليقك (اختياري)' : 'Your comment (optional)'}
                      </label>
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value.slice(0, 500))}
                        placeholder={isRTL 
                          ? 'اكتب ملاحظتك عن التجربة مع هذا الطرف...'
                          : 'Write your feedback about the experience with this party...'
                        }
                        rows={3}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground text-end">
                        {comment.length}/500
                      </p>
                    </div>

                    {/* Transparency Notice */}
                    <Card className="p-3 bg-muted/50 border-muted">
                      <p className="text-xs text-muted-foreground">
                        {isRTL 
                          ? '🔒 تقييمك سيكون مرتبطًا بحسابك لضمان الشفافية والثقة داخل سوق P2P'
                          : '🔒 Your rating will be linked to your account to ensure transparency and trust in the P2P market'
                        }
                      </p>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              {selectedRating !== null && (
                <Button 
                  className={cn(
                    "w-full mt-4",
                    selectedRating === true && "bg-success hover:bg-success/90",
                    selectedRating === false && "bg-destructive hover:bg-destructive/90"
                  )}
                  onClick={handleRateSubmit}
                >
                  {isRTL ? 'إرسال التقييم' : 'Submit Rating'}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-success/10 border-success/30">
            <CardContent className="p-4 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
              <p className="font-semibold text-success">
                {isRTL ? 'شكرًا لتقييمك!' : 'Thanks for your rating!'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isRTL 
                  ? 'تقييمك يساعد في بناء مجتمع P2P موثوق'
                  : 'Your rating helps build a trusted P2P community'
                }
              </p>
              <Badge variant="outline" className="mt-2 bg-success/10 text-success border-success/30">
                {isRTL ? 'مكتمل + تم التقييم' : 'Completed + Rated'}
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Button */}
      <div className="p-4 border-t border-border bg-card safe-bottom">
        <Button className="w-full" onClick={onClose}>
          {isRTL ? 'رجوع' : 'Exit'}
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSupportAgentRating } from '@/hooks/useSupportAgentRating';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, Loader2, Check, Scale } from 'lucide-react';

interface DisputeRatingPromptProps {
  orderId: string;
}

export function DisputeRatingPrompt({ orderId }: DisputeRatingPromptProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { myRating, isEditable, isLoading, isSubmitting, submitRating, hasRated } = useSupportAgentRating(orderId);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  if (isLoading) return null;

  const handleRate = async (rating: 'up' | 'down') => {
    await submitRating(rating, note || undefined);
    setShowNote(false);
    setNote('');
  };

  // Already rated and locked
  if (hasRated && !isEditable) {
    return (
      <Card className="mx-2 my-2 p-3 bg-muted/30 border-muted">
        <div className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            {isRTL ? 'شكراً لتقييمك' : 'Thanks for your feedback'}
          </span>
          <Badge variant="outline" className="ms-auto text-xs">
            {myRating?.rating === 'up' ? '👍' : '👎'}
            {myRating?.rating === 'up'
              ? (isRTL ? ' عادل' : ' Fair')
              : (isRTL ? ' غير عادل' : ' Unfair')
            }
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-2 my-2 p-4 border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <Scale className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {isRTL
              ? 'تم حل النزاع بواسطة فريق الدعم ⚖️'
              : 'The dispute has been resolved by Support ⚖️'
            }
          </p>
          <p className="text-xs text-muted-foreground">
            {isRTL
              ? 'رأيك يهمنا. كيف تقيّم قرار موظف الدعم؟'
              : 'Your feedback matters. How would you rate the agent\'s decision?'
            }
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={myRating?.rating === 'up' ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => handleRate('up')}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4 me-1" />}
          {isRTL ? 'عادل' : 'Fair'}
        </Button>
        <Button
          variant={myRating?.rating === 'down' ? 'destructive' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => handleRate('down')}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4 me-1" />}
          {isRTL ? 'غير عادل' : 'Unfair'}
        </Button>
      </div>

      {hasRated && isEditable && (
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          {isRTL ? 'يمكنك تعديل تقييمك خلال 30 دقيقة' : 'You can edit your rating within 30 minutes'}
        </p>
      )}

      {!showNote && !hasRated && (
        <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => setShowNote(true)}>
          {isRTL ? '+ إضافة ملاحظة' : '+ Add a note'}
        </Button>
      )}

      {showNote && (
        <Input
          className="mt-2"
          placeholder={isRTL ? 'ملاحظة اختيارية...' : 'Optional note...'}
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      )}
    </Card>
  );
}

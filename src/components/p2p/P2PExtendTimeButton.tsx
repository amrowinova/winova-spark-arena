import { useState, useCallback } from 'react';
import { Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useP2PExtendTime } from '@/hooks/useP2PExtendTime';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface P2PExtendTimeButtonProps {
  orderId: string;
  canExtend: boolean;
  extensionCount: number;
  onExtended?: () => void;
}

export function P2PExtendTimeButton({
  orderId,
  canExtend,
  extensionCount,
  onExtended,
}: P2PExtendTimeButtonProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { extendTime, isExtending } = useP2PExtendTime();
  const [open, setOpen] = useState(false);

  const handleExtend = useCallback(async () => {
    const result = await extendTime(orderId, 10); // 10 minutes extension

    if (result.success) {
      toast({
        title: isRTL ? 'تم تمديد الوقت' : 'Time Extended',
        description: isRTL 
          ? 'تم تمديد وقت الانتظار 10 دقائق' 
          : 'Wait time extended by 10 minutes',
      });
      onExtended?.();
      setOpen(false);
    } else {
      toast({
        title: isRTL ? 'فشل التمديد' : 'Extension Failed',
        description: result.error,
        variant: 'destructive',
      });
    }
  }, [orderId, extendTime, isRTL, onExtended]);

  // Already used extension
  if (extensionCount >= 1) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2 opacity-50">
        <Clock className="h-4 w-4" />
        {isRTL ? 'تم استخدام التمديد' : 'Extension Used'}
      </Button>
    );
  }

  // Cannot extend (not seller or wrong status)
  if (!canExtend) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Clock className="h-4 w-4" />
          {isRTL ? 'تمديد 10 دقائق' : 'Extend 10min'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {isRTL ? 'تمديد وقت الانتظار' : 'Extend Wait Time'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {isRTL
                ? 'سيتم تمديد وقت الانتظار 10 دقائق إضافية.'
                : 'Wait time will be extended by 10 additional minutes.'
              }
            </p>
            <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg text-warning text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                {isRTL
                  ? 'يمكنك استخدام التمديد مرة واحدة فقط لكل طلب.'
                  : 'You can only use this extension once per order.'
                }
              </span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isExtending}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleExtend} disabled={isExtending}>
            {isExtending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isRTL ? 'جاري التمديد...' : 'Extending...'}
              </>
            ) : (
              isRTL ? 'تأكيد التمديد' : 'Confirm Extension'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

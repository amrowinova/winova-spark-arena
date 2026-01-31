import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';

interface CancelReason {
  id: string;
  labelEn: string;
  labelAr: string;
}

const CANCEL_REASONS: CancelReason[] = [
  { id: 'could_not_transfer', labelEn: "Couldn't complete transfer", labelAr: 'لم أتمكن من التحويل' },
  { id: 'bank_issue', labelEn: 'Bank / Account issue', labelAr: 'مشكلة في البنك / الحساب' },
  { id: 'changed_mind', labelEn: 'Changed my mind', labelAr: 'غيّرت رأيي' },
  { id: 'price_not_suitable', labelEn: 'Price no longer suitable', labelAr: 'السعر لم يعد مناسبًا' },
  { id: 'other', labelEn: 'Other reason', labelAr: 'سبب آخر' },
];

interface P2PCancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}

export function P2PCancelOrderDialog({
  open,
  onOpenChange,
  onConfirm,
}: P2PCancelOrderDialogProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) return;

    let finalReason: string;
    if (selectedReason === 'other') {
      if (!otherText.trim()) return;
      finalReason = otherText.trim();
    } else {
      const reason = CANCEL_REASONS.find(r => r.id === selectedReason);
      finalReason = isRTL ? reason?.labelAr || '' : reason?.labelEn || '';
    }

    onConfirm(finalReason);
    setSelectedReason(null);
    setOtherText('');
  };

  const isValid = selectedReason && (selectedReason !== 'other' || otherText.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle>
              {isRTL ? 'إلغاء الطلب' : 'Cancel Order'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isRTL 
              ? 'يرجى اختيار سبب الإلغاء (إجباري)'
              : 'Please select a cancellation reason (required)'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedReason || ''}
            onValueChange={setSelectedReason}
            className="space-y-3"
          >
            {CANCEL_REASONS.map((reason) => (
              <div key={reason.id} className="flex items-center space-x-3 rtl:space-x-reverse">
                <RadioGroupItem value={reason.id} id={reason.id} />
                <Label 
                  htmlFor={reason.id} 
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  {isRTL ? reason.labelAr : reason.labelEn}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedReason === 'other' && (
            <div className="mt-4">
              <Textarea
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder={isRTL ? 'اكتب سبب الإلغاء...' : 'Enter cancellation reason...'}
                className="min-h-[80px]"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1 text-end">
                {otherText.length}/200
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {isRTL ? 'رجوع' : 'Back'}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid}
            className="flex-1"
          >
            {isRTL ? 'تأكيد الإلغاء' : 'Confirm Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

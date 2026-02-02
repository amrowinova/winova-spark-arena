import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Check, CheckCheck, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DMMessageData } from './DMMessageBubble';

interface MessageInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: DMMessageData | null;
}

export function MessageInfoSheet({ open, onOpenChange, message }: MessageInfoSheetProps) {
  const { language } = useLanguage();

  if (!message) return null;

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
  };

  const sentAt = formatDateTime(message.createdAt);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[50vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>
            {language === 'ar' ? 'معلومات الرسالة' : 'Message Info'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Message preview */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">{message.content}</p>
          </div>

          <Separator />

          {/* Sent info */}
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Check className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {language === 'ar' ? 'تم الإرسال' : 'Sent'}
              </p>
              <p className="text-xs text-muted-foreground">{sentAt.date}</p>
              <p className="text-xs text-muted-foreground">{sentAt.time}</p>
            </div>
          </div>

          {/* Delivered info */}
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <CheckCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {language === 'ar' ? 'تم التسليم' : 'Delivered'}
              </p>
              <p className="text-xs text-muted-foreground">{sentAt.date}</p>
              <p className="text-xs text-muted-foreground">{sentAt.time}</p>
            </div>
          </div>

          {/* Read info */}
          {message.isRead && (
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <CheckCheck className="h-4 w-4 text-info" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {language === 'ar' ? 'تمت القراءة' : 'Read'}
                </p>
                <p className="text-xs text-muted-foreground">{sentAt.date}</p>
                <p className="text-xs text-muted-foreground">{sentAt.time}</p>
              </div>
            </div>
          )}

          {!message.isRead && message.isMine && (
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {language === 'ar' ? 'لم تُقرأ بعد' : 'Not read yet'}
                </p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

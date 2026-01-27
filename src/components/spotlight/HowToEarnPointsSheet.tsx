import { Info, Trophy, Vote, Send, ShoppingBag, UserPlus, X } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { useLanguage } from '@/contexts/LanguageContext';

interface HowToEarnPointsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowToEarnPointsSheet({ open, onOpenChange }: HowToEarnPointsSheetProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const earnPoints = [
    {
      icon: Trophy,
      points: '+10',
      textAr: 'الدخول إلى مسابقة (سواء فزت أو خسرت)',
      textEn: 'Entering a contest (win or lose)',
    },
    {
      icon: Vote,
      points: '+1',
      textAr: 'كل تصويت مدفوع',
      textEn: 'Each paid vote',
    },
    {
      icon: Send,
      points: '+1',
      textAr: 'تحويل Nova ناجح',
      textEn: 'Successful Nova transfer',
    },
    {
      icon: ShoppingBag,
      points: '+1',
      textAr: 'إكمال طلب P2P بنجاح',
      textEn: 'Completing a P2P order successfully',
    },
    {
      icon: UserPlus,
      points: '+1',
      textAr: 'تسجيل مستخدم عبر كود الإحالة',
      textEn: 'User signup via referral code',
    },
  ];

  const noPoints = isRTL
    ? [
        'الصوت المجاني',
        'الفوز بالمسابقة',
        'تسجيل الدخول',
        'المتابعة',
        'فتح الشات',
        'تحويل Aura',
      ]
    : [
        'Free vote',
        'Winning a contest',
        'Logging in',
        'Following users',
        'Opening chat',
        'Aura transfers',
      ];

  const notes = isRTL
    ? [
        'نقاط اليوم تُصفّر بنهاية اليوم',
        'النقاط تتراكم ضمن دورة 98 يوم',
        'ترتيب المستخدم يعتمد على مجموع نقاطه داخل رتبته',
      ]
    : [
        'Daily points reset at end of day',
        'Points accumulate within a 98-day cycle',
        'User ranking is based on total points within their tier',
      ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="relative border-b border-border pb-3">
          <DrawerTitle className="text-lg font-bold text-center">
            {isRTL ? 'كيف تكسب النقاط؟' : 'How to Earn Points?'}
          </DrawerTitle>
          <DrawerClose className="absolute left-4 top-4 rounded-full p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </DrawerClose>
        </DrawerHeader>

        <div className="px-4 py-4 space-y-5 overflow-y-auto">
          {/* Earning Points Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {isRTL ? 'طرق كسب النقاط' : 'Ways to Earn Points'}
            </h3>
            <div className="space-y-2">
              {earnPoints.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="flex-1 text-sm">
                    {isRTL ? item.textAr : item.textEn}
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {item.points}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* No Points Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
              {isRTL ? 'لا يتم احتساب نقاط على' : 'No Points Awarded For'}
            </h3>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex flex-wrap gap-2">
                {noPoints.map((item, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-background rounded-full text-muted-foreground border border-border"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Info className="h-4 w-4" />
              {isRTL ? 'ملاحظات مهمة' : 'Important Notes'}
            </h3>
            <div className="space-y-2">
              {notes.map((note, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-primary mt-0.5">•</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

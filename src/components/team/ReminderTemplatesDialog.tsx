import { MessageCircle, Bell, TrendingUp, Gift, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { banner } from '@/contexts/BannerContext';

interface ReminderTemplatesDialogProps {
  open: boolean;
  onClose: () => void;
  targetType: 'inactive' | 'at-risk' | 'all';
  targetCount: number;
}

interface Template {
  id: string;
  icon: React.ElementType;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
}

const templates: Template[] = [
  {
    id: 'friendly',
    icon: MessageCircle,
    titleEn: 'Friendly Nudge',
    titleAr: 'تذكير ودي',
    messageEn: "Hey! We miss you in the contests. Join us this week and let's win together! 🎯",
    messageAr: 'مرحباً! نفتقدك في المسابقات. انضم إلينا هذا الأسبوع ولنفز معاً! 🎯',
  },
  {
    id: 'urgent',
    icon: Bell,
    titleEn: 'Urgent Reminder',
    titleAr: 'تذكير عاجل',
    messageEn: "⚠️ Your activity is dropping! Join today's contest to stay active and keep your streak alive.",
    messageAr: '⚠️ نشاطك في انخفاض! انضم لمسابقة اليوم للحفاظ على نشاطك وسلسلتك.',
  },
  {
    id: 'motivation',
    icon: TrendingUp,
    titleEn: 'Motivational',
    titleAr: 'تحفيزي',
    messageEn: "You're so close to leveling up! Just one more active week and you could be promoted. Let's go! 🚀",
    messageAr: 'أنت قريب جداً من الترقية! أسبوع نشط واحد آخر وستتم ترقيتك. هيا! 🚀',
  },
  {
    id: 'reward',
    icon: Gift,
    titleEn: 'Reward Focused',
    titleAr: 'التركيز على المكافآت',
    messageEn: "Don't miss out on this week's prizes! Big rewards waiting for active members. Join now! 💰",
    messageAr: 'لا تفوت جوائز هذا الأسبوع! مكافآت كبيرة تنتظر الأعضاء النشطين. انضم الآن! 💰',
  },
];

export function ReminderTemplatesDialog({ 
  open, 
  onClose, 
  targetType, 
  targetCount 
}: ReminderTemplatesDialogProps) {
  const { language } = useLanguage();

  const handleSendTemplate = (template: Template) => {
    const targetLabel = {
      inactive: language === 'ar' ? 'الأعضاء غير النشطين' : 'inactive members',
      'at-risk': language === 'ar' ? 'الأعضاء المعرضين للخطر' : 'at-risk members',
      all: language === 'ar' ? 'جميع الأعضاء' : 'all members',
    };
    
    banner.success(
      language === 'ar'
        ? `تم إرسال "${template.titleAr}" لـ ${targetCount} ${targetLabel[targetType]}`
        : `Sent "${template.titleEn}" to ${targetCount} ${targetLabel[targetType]}`
    );
    onClose();
  };

  const targetLabel = {
    inactive: language === 'ar' ? 'غير النشطين' : 'Inactive',
    'at-risk': language === 'ar' ? 'المعرضين للخطر' : 'At Risk',
    all: language === 'ar' ? 'الجميع' : 'Everyone',
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-3xl max-h-[85vh] overflow-y-auto safe-bottom"
          >
            <div className="p-5">
              {/* Handle */}
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />
              
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">
                    {language === 'ar' ? 'اختر رسالة' : 'Choose Message'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? `إرسال لـ ${targetCount} ${targetLabel[targetType]}`
                      : `Sending to ${targetCount} ${targetLabel[targetType]}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Templates */}
              <div className="space-y-3">
                {templates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <Card 
                      key={template.id}
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSendTemplate(template)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm mb-1">
                            {language === 'ar' ? template.titleAr : template.titleEn}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {language === 'ar' ? template.messageAr : template.messageEn}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

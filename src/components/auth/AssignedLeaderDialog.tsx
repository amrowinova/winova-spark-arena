import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, Users, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface AssignedLeaderInfo {
  name: string;
  username: string;
  rank: string;
  avatar_url?: string | null;
  reason: string;
}

interface AssignedLeaderDialogProps {
  open: boolean;
  onClose: () => void;
  leader: AssignedLeaderInfo | null;
}

const rankLabels: Record<string, { en: string; ar: string }> = {
  subscriber: { en: 'Subscriber', ar: 'مشترك' },
  marketer: { en: 'Marketer', ar: 'مسوق' },
  leader: { en: 'Leader', ar: 'قائد' },
  manager: { en: 'Manager', ar: 'مدير' },
  president: { en: 'President', ar: 'رئيس' },
};

const reasonLabels: Record<string, { en: string; ar: string }> = {
  referral_code: { en: 'Used your referral code', ar: 'استخدمت كود الإحالة الخاص بك' },
  same_district: { en: 'Most active leader in your area', ar: 'أنشط قائد في منطقتك' },
  same_city: { en: 'Most active leader in your city', ar: 'أنشط قائد في مدينتك' },
  same_country: { en: 'Most active leader in your country', ar: 'أنشط قائد في بلدك' },
  global_active: { en: 'Top global active leader', ar: 'أنشط قائد عالمي' },
  fallback_any_user: { en: 'Assigned automatically', ar: 'تم تعيينه تلقائيًا' },
  already_assigned: { en: 'Previously assigned', ar: 'تم تعيينه مسبقًا' },
};

export function AssignedLeaderDialog({ open, onClose, leader }: AssignedLeaderDialogProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  if (!leader) return null;

  const rankInfo = rankLabels[leader.rank] || rankLabels.subscriber;
  const reasonInfo = reasonLabels[leader.reason] || reasonLabels.fallback_any_user;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mx-auto mb-4"
          >
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
          </motion.div>
          
          <DialogTitle className="text-xl">
            {isRTL ? 'تم إضافتك للفريق!' : 'You\'ve been added to a team!'}
          </DialogTitle>
          <DialogDescription>
            {isRTL 
              ? 'تم ربطك بمسؤولك المباشر بنجاح'
              : 'You have been successfully linked to your direct leader'}
          </DialogDescription>
        </DialogHeader>

        {/* Leader Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-2"
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/30">
              <AvatarImage src={leader.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {leader.name?.charAt(0) || '👤'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{leader.name}</p>
              <p className="text-sm text-muted-foreground">@{leader.username}</p>
              <Badge variant="outline" className="mt-1 text-xs bg-primary/10 text-primary border-primary/30">
                {isRTL ? rankInfo.ar : rankInfo.en}
              </Badge>
            </div>
          </div>

          {/* Assignment Reason */}
          <div className="mt-3 pt-3 border-t border-primary/10">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{isRTL ? reasonInfo.ar : reasonInfo.en}</span>
            </div>
          </div>
        </motion.div>

        {/* Info Text */}
        <p className="text-xs text-muted-foreground text-center mt-2">
          {isRTL 
            ? 'يمكنك التواصل مع مسؤولك من صفحة الفريق في أي وقت'
            : 'You can contact your leader from the Team page anytime'}
        </p>

        {/* Continue Button */}
        <Button 
          onClick={onClose} 
          className="w-full mt-4 gap-2"
        >
          {isRTL ? 'متابعة' : 'Continue'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}

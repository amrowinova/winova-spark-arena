import { X, Users, TrendingUp, Calendar, MessageCircle, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RankBadge } from '@/components/common/RankBadge';
import { ProgressRing } from '@/components/common/ProgressRing';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import type { TeamMember } from './TeamMemberCard';

interface MemberDetailPanelProps {
  member: TeamMember | null;
  open: boolean;
  onClose: () => void;
  onViewTeam?: () => void;
}

export function MemberDetailPanel({ member, open, onClose, onViewTeam }: MemberDetailPanelProps) {
  const { language } = useLanguage();

  if (!member) return null;

  const memberActivity = Math.round((member.activeWeeks / member.totalWeeks) * 100);
  const activeUnder = Math.round(member.teamSize * (memberActivity / 100));

  const handleMessage = () => {
    toast.success(language === 'ar' ? 'جاري فتح المحادثة...' : 'Opening chat...');
    onClose();
  };

  const handleRemind = () => {
    toast.success(language === 'ar' ? 'تم إرسال التذكير!' : 'Reminder sent!');
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
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl relative">
                    {member.avatar}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-bold ${
                      member.active ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
                    }`}>
                      {member.active ? '✓' : '!'}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {language === 'ar' ? member.nameAr : member.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">@{member.username}</p>
                    <RankBadge rank={member.rank} size="sm" className="mt-1" />
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Activity Status */}
              <div className={`p-3 rounded-lg mb-4 ${
                member.active 
                  ? 'bg-success/10 border border-success/20' 
                  : 'bg-destructive/10 border border-destructive/20'
              }`}>
                <p className={`text-sm font-medium ${member.active ? 'text-success' : 'text-destructive'}`}>
                  {member.active 
                    ? (language === 'ar' ? '✓ نشط هذا الأسبوع' : '✓ Active this week')
                    : (language === 'ar' ? '✗ غير نشط هذا الأسبوع' : '✗ Inactive this week')}
                </p>
              </div>

              {/* Quick Actions Row */}
              <div className="flex gap-2 mb-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleMessage}
                >
                  <MessageCircle className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'مراسلة' : 'Message'}
                </Button>
                {!member.active && (
                  <Button 
                    variant="default"
                    className="flex-1"
                    onClick={handleRemind}
                  >
                    <Bell className="h-4 w-4 me-2" />
                    {language === 'ar' ? 'تذكير' : 'Remind'}
                  </Button>
                )}
              </div>

              {/* Team Summary Card */}
              <Card className="p-4 mb-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">
                    {language === 'ar' ? 'ملخص الفريق' : 'Team Summary'}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{member.directTeam}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {language === 'ar' ? 'مباشر' : 'Direct'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{member.indirectTeam}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {language === 'ar' ? 'غير مباشر' : 'Indirect'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-success">{activeUnder}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {language === 'ar' ? 'نشط' : 'Active'}
                    </p>
                  </div>
                </div>
                
                {/* Impact indicator */}
                {member.teamSize > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">
                      {language === 'ar' 
                        ? `يؤثر على ${member.teamSize} عضو في الفريق الكلي`
                        : `Impacts ${member.teamSize} total team members`}
                    </p>
                  </div>
                )}
              </Card>

              {/* Activity */}
              <Card className="p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">
                    {language === 'ar' ? 'النشاط' : 'Activity'}
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  <ProgressRing progress={memberActivity} size={60} strokeWidth={5}>
                    <span className="text-sm font-bold">{memberActivity}%</span>
                  </ProgressRing>
                  
                  <div className="flex-1">
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'أسابيع نشطة' : 'Active weeks'}
                      </span>
                      <span className="font-bold">
                        {member.activeWeeks} / {member.totalWeeks}
                      </span>
                    </div>
                    <Progress value={memberActivity} className="h-2" />
                  </div>
                </div>
              </Card>

              {/* View Team Button */}
              {member.teamSize > 0 && onViewTeam && (
                <Button 
                  className="w-full"
                  size="lg"
                  onClick={onViewTeam}
                >
                  <Users className="h-4 w-4 me-2" />
                  {language === 'ar' 
                    ? `عرض فريق ${member.nameAr} الكامل`
                    : `View ${member.name}'s Full Team`}
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

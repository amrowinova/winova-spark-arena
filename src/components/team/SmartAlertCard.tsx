import { AlertTriangle, Users, TrendingDown, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import type { TeamMember } from './TeamMemberCard';

interface SmartAlertCardProps {
  members: TeamMember[];
  onRemindAll: () => void;
}

export function SmartAlertCard({ members, onRemindAll }: SmartAlertCardProps) {
  const { language } = useLanguage();
  
  const inactiveMembers = members.filter(m => !m.active);
  const inactiveCount = inactiveMembers.length;
  
  // Members with significant impact (have their own teams)
  const impactfulInactive = inactiveMembers.filter(m => m.teamSize > 0);
  
  // Calculate potential activity loss
  const potentialLoss = impactfulInactive.reduce((acc, m) => acc + m.teamSize, 0);

  if (inactiveCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-4 bg-success/10 border-success/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-success">
                {language === 'ar' ? 'فريقك نشط بالكامل! 🎉' : 'Your team is fully active! 🎉'}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? `جميع الـ ${members.length} أعضاء نشطين هذا الأسبوع`
                  : `All ${members.length} members are active this week`}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Main Alert */}
      <Card className="p-4 bg-warning/10 border-warning/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-warning">
              {language === 'ar' 
                ? `${inactiveCount} أعضاء غير نشطين`
                : `${inactiveCount} inactive members`}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? 'تواصل معهم للحفاظ على نشاط فريقك'
                : 'Reach out to maintain your team activity'}
            </p>
            
            {/* Inactive avatars */}
            <div className="flex items-center gap-1 mt-2">
              {inactiveMembers.slice(0, 5).map((m, i) => (
                <div 
                  key={m.id}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm border-2 border-card"
                  style={{ marginLeft: i > 0 ? '-8px' : 0 }}
                >
                  {m.avatar}
                </div>
              ))}
              {inactiveCount > 5 && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold border-2 border-card" style={{ marginLeft: '-8px' }}>
                  +{inactiveCount - 5}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Button 
          className="w-full mt-3" 
          variant="default"
          onClick={onRemindAll}
        >
          <Bell className="h-4 w-4 me-2" />
          {language === 'ar' ? 'تذكير الفريق غير النشط' : 'Remind Inactive Team'}
        </Button>
      </Card>

      {/* Impact Alert - Only show if there are impactful inactive members */}
      {impactfulInactive.length > 0 && (
        <Card className="p-3 bg-destructive/5 border-destructive/20">
          <div className="flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {language === 'ar' 
                  ? `${impactfulInactive.length} أعضاء مؤثرين غير نشطين`
                  : `${impactfulInactive.length} influential members inactive`}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' 
                  ? `يؤثرون على ${potentialLoss} عضو في الفريق`
                  : `Affecting ${potentialLoss} team members`}
              </p>
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  );
}

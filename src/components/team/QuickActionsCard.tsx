import { AlertTriangle, Clock, Star, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TeamMember } from './TeamMemberCard';

interface QuickActionsCardProps {
  members: TeamMember[];
  onTakeAction: () => void;
}

export function QuickActionsCard({ members, onTakeAction }: QuickActionsCardProps) {
  const { language } = useLanguage();
  
  // Calculate metrics
  const inactiveMembers = members.filter(m => !m.active);
  const inactiveCount = inactiveMembers.length;
  
  // At risk: active but low activity percentage (below 50%)
  const atRiskMembers = members.filter(m => {
    const activity = (m.activeWeeks / m.totalWeeks) * 100;
    return m.active && activity < 50;
  });
  const atRiskCount = atRiskMembers.length;
  
  // Close to promotion: subscribers with 2+ direct members and 3+ active weeks
  const closeToPromotion = members.filter(m => 
    m.rank === 'subscriber' && m.directTeam >= 2 && m.activeWeeks >= 3
  );
  const promotableCount = closeToPromotion.length;

  const totalPriority = inactiveCount + atRiskCount;
  
  if (totalPriority === 0 && promotableCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="p-4 bg-gradient-to-br from-primary/10 via-background to-warning/10 border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">
            {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
          </h3>
          {totalPriority > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalPriority} {language === 'ar' ? 'بحاجة اهتمام' : 'need attention'}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {/* Inactive */}
          <div className={`p-2 rounded-lg text-center ${inactiveCount > 0 ? 'bg-destructive/10' : 'bg-muted/50'}`}>
            <AlertTriangle className={`h-4 w-4 mx-auto mb-1 ${inactiveCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            <p className={`text-lg font-bold ${inactiveCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {inactiveCount}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'غير نشط' : 'Inactive'}
            </p>
          </div>

          {/* At Risk */}
          <div className={`p-2 rounded-lg text-center ${atRiskCount > 0 ? 'bg-warning/10' : 'bg-muted/50'}`}>
            <Clock className={`h-4 w-4 mx-auto mb-1 ${atRiskCount > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
            <p className={`text-lg font-bold ${atRiskCount > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
              {atRiskCount}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'معرض للخطر' : 'At Risk'}
            </p>
          </div>

          {/* Close to Promotion */}
          <div className={`p-2 rounded-lg text-center ${promotableCount > 0 ? 'bg-success/10' : 'bg-muted/50'}`}>
            <Star className={`h-4 w-4 mx-auto mb-1 ${promotableCount > 0 ? 'text-success' : 'text-muted-foreground'}`} />
            <p className={`text-lg font-bold ${promotableCount > 0 ? 'text-success' : 'text-muted-foreground'}`}>
              {promotableCount}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'قريب للترقية' : 'Near Promo'}
            </p>
          </div>
        </div>

        <Button 
          className="w-full" 
          onClick={onTakeAction}
          disabled={totalPriority === 0 && promotableCount === 0}
        >
          {language === 'ar' ? 'اتخذ إجراء' : 'Take Action'}
          <ChevronRight className="h-4 w-4 ms-1" />
        </Button>
      </Card>
    </motion.div>
  );
}

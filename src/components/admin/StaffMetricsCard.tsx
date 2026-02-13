import { useLanguage } from '@/contexts/LanguageContext';
import { useStaffMetrics } from '@/hooks/useSupportAgentRating';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertTriangle, Star, Shield, ArrowUpCircle, User, Loader2 } from 'lucide-react';

export function StaffMetricsCard() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { metrics, flaggedStaff, isLoading, NEGATIVE_THRESHOLD } = useStaffMetrics();

  if (isLoading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground text-sm">
        {isRTL ? 'لا توجد تقييمات بعد' : 'No ratings yet'}
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Alert for flagged staff */}
      {flaggedStaff.length > 0 && (
        <Card className="p-4 bg-destructive/10 border-destructive/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span className="text-sm font-semibold text-destructive">
              {isRTL
                ? `${flaggedStaff.length} موظف تجاوز حد التقييمات السلبية (${NEGATIVE_THRESHOLD}%)`
                : `${flaggedStaff.length} staff exceed negative rating threshold (${NEGATIVE_THRESHOLD}%)`
              }
            </span>
          </div>
          <div className="space-y-1">
            {flaggedStaff.map(s => (
              <div key={s.staff_id} className="flex items-center gap-2 text-xs">
                <span className="font-medium">{s.staff_name}</span>
                <Badge variant="destructive" className="text-[10px]">
                  {100 - (s.positive_pct || 0)}% {isRTL ? 'سلبي' : 'negative'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Staff list */}
      {metrics.map(staff => {
        const negativePct = 100 - (staff.positive_pct || 0);
        const isAtRisk = staff.total_ratings >= 5 && negativePct > NEGATIVE_THRESHOLD;

        return (
          <Card key={staff.staff_id} className={`p-4 ${isAtRisk ? 'border-destructive/30' : ''}`}>
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{staff.staff_name || 'Staff'}</span>
                  {isAtRisk && <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {staff.positive_pct ?? 0}%
                  </span>
                  <span>👍 {staff.positive_ratings}</span>
                  <span>👎 {staff.negative_ratings}</span>
                </div>
              </div>
              <div className="text-end text-xs space-y-0.5">
                <div className="flex items-center gap-1 justify-end">
                  <Shield className="w-3 h-3 text-muted-foreground" />
                  <span>{staff.cases_handled} {isRTL ? 'قضية' : 'cases'}</span>
                </div>
                {staff.escalations > 0 && (
                  <div className="flex items-center gap-1 justify-end text-orange-500">
                    <ArrowUpCircle className="w-3 h-3" />
                    <span>{staff.escalations} {isRTL ? 'تصعيد' : 'esc.'}</span>
                  </div>
                )}
                {staff.fraud_flags > 0 && (
                  <div className="flex items-center gap-1 justify-end text-destructive">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{staff.fraud_flags} {isRTL ? 'احتيال' : 'fraud'}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

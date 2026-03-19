import { TrendingUp, Coins } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeamEarnings } from '@/hooks/useTeamEarnings';

export function TeamEarningsSummaryCard() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { summary, loading } = useTeamEarnings();

  const fmt = (n: number) => (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2));

  if (loading) {
    return (
      <Card className="p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Coins className="h-5 w-5 text-primary" />
        {isRTL ? 'أرباح الفريق' : 'Team Earnings'}
      </h3>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-primary/5 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-primary">И {fmt(summary.totalEarned)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {isRTL ? 'إجمالي الأرباح' : 'Total Earned'}
          </p>
        </div>

        <div className="bg-success/5 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-success">И {fmt(summary.thisMonth)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {isRTL ? 'هذا الشهر' : 'This Month'}
          </p>
        </div>

        <div className="bg-muted rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-muted-foreground">И {fmt(summary.lastMonth)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {isRTL ? 'الشهر الماضي' : 'Last Month'}
          </p>
        </div>
      </div>

      {summary.totalTransactions > 0 && (
        <div className="mt-3 pt-3 border-t flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          {isRTL
            ? `${summary.totalTransactions} عملية أرباح إجمالاً`
            : `${summary.totalTransactions} earning transactions total`}
        </div>
      )}
    </Card>
  );
}

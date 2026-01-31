import { useMemo, useState } from 'react';
import { TrendingUp, Calendar, Globe, Trophy, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTransactions, type Receipt, RANK_COMMISSION_RATES } from '@/contexts/TransactionContext';
import { useUser } from '@/contexts/UserContext';
import { getWalletCountryPricing } from './WalletCountrySelector';

// Format number - remove decimals if whole number
const formatAmount = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

const rankLabels: Record<string, { en: string; ar: string; icon: string }> = {
  leader: { en: 'Leader', ar: 'قائد', icon: '⭐' },
  manager: { en: 'Manager', ar: 'مدير', icon: '💎' },
  president: { en: 'President', ar: 'رئيس', icon: '👑' },
};

interface EarningsSummarySheetProps {
  children: React.ReactNode;
}

export function EarningsSummarySheet({ children }: EarningsSummarySheetProps) {
  const { language } = useLanguage();
  const { receipts } = useTransactions();
  const { user } = useUser();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'total'>('today');
  
  const pricing = getWalletCountryPricing(user.walletCountry);

  // Filter team earnings receipts
  const teamEarningsReceipts = useMemo(() => {
    return receipts.filter(r => r.type === 'team_earnings' && r.sender.id === user.id);
  }, [receipts, user.id]);

  // Calculate period-based stats
  const periodStats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const filterByPeriod = (receipt: Receipt) => {
      const receiptDate = new Date(receipt.createdAt);
      switch (period) {
        case 'today':
          return receiptDate >= startOfToday;
        case 'week':
          return receiptDate >= startOfWeek;
        case 'month':
          return receiptDate >= startOfMonth;
        case 'total':
        default:
          return true;
      }
    };

    const filtered = teamEarningsReceipts.filter(filterByPeriod);
    const totalNova = filtered.reduce((sum, r) => sum + r.amount, 0);
    const totalParticipants = filtered.reduce((sum, r) => sum + (r.teamEarnings?.participantCount || 0), 0);
    const contestCount = new Set(filtered.map(r => r.teamEarnings?.contestNumber)).size;

    // Group by country
    const byCountry = filtered.reduce((acc, r) => {
      const country = r.teamEarnings?.country || 'Unknown';
      if (!acc[country]) {
        acc[country] = { total: 0, participants: 0, contests: 0 };
      }
      acc[country].total += r.amount;
      acc[country].participants += r.teamEarnings?.participantCount || 0;
      acc[country].contests += 1;
      return acc;
    }, {} as Record<string, { total: number; participants: number; contests: number }>);

    return {
      totalNova,
      totalLocal: totalNova * pricing.novaRate,
      totalParticipants,
      contestCount,
      receipts: filtered,
      byCountry,
    };
  }, [teamEarningsReceipts, period, pricing.novaRate]);

  const rankInfo = rankLabels[user.rank] || { en: user.rank, ar: user.rank, icon: '🔵' };
  const commissionRate = RANK_COMMISSION_RATES[user.rank as keyof typeof RANK_COMMISSION_RATES] || 0;

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="text-start mb-4">
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'ملخص الأرباح' : 'Earnings Summary'}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-100px)]">
          <div className="space-y-4 pb-6">
            {/* Rank & Rate Info */}
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{rankInfo.icon}</span>
                  <span className="font-medium text-foreground">
                    {language === 'ar' ? rankInfo.ar : rankInfo.en}
                  </span>
                </div>
                <div className="text-end">
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'العمولة لكل مشارك' : 'Rate per participant'}
                  </p>
                  <p className="font-bold text-primary">
                    <span className="text-nova">И</span> {commissionRate}
                  </p>
                </div>
              </div>
            </Card>

            {/* Period Tabs */}
            <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="today" className="text-xs">
                  {language === 'ar' ? 'اليوم' : 'Today'}
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs">
                  {language === 'ar' ? 'الأسبوع' : 'Week'}
                </TabsTrigger>
                <TabsTrigger value="month" className="text-xs">
                  {language === 'ar' ? 'الشهر' : 'Month'}
                </TabsTrigger>
                <TabsTrigger value="total" className="text-xs">
                  {language === 'ar' ? 'الكل' : 'Total'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value={period} className="mt-4 space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      {language === 'ar' ? 'إجمالي الأرباح' : 'Total Earnings'}
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      <span className="text-nova">И</span> {formatAmount(periodStats.totalNova)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ≈ {pricing.symbol} {formatAmount(periodStats.totalLocal)}
                    </p>
                  </Card>

                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      {language === 'ar' ? 'المشاركين' : 'Participants'}
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {periodStats.totalParticipants}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {periodStats.contestCount} {language === 'ar' ? 'مسابقة' : 'contests'}
                    </p>
                  </Card>
                </div>

                {/* By Country Breakdown */}
                {Object.keys(periodStats.byCountry).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      {language === 'ar' ? 'حسب الدولة' : 'By Country'}
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(periodStats.byCountry).map(([country, data]) => (
                        <Card key={country} className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm text-foreground">{country}</p>
                              <p className="text-xs text-muted-foreground">
                                {data.participants} {language === 'ar' ? 'مشارك' : 'participants'} • {data.contests} {language === 'ar' ? 'مسابقة' : 'contests'}
                              </p>
                            </div>
                            <p className="font-bold text-primary">
                              +<span className="text-nova">И</span> {formatAmount(data.total)}
                            </p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Contest Earnings */}
                {periodStats.receipts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                      {language === 'ar' ? 'أرباح المسابقات' : 'Contest Earnings'}
                    </h3>
                    <div className="space-y-2">
                      {periodStats.receipts.slice(0, 10).map((receipt) => (
                        <Card key={receipt.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm text-foreground">
                                {language === 'ar' ? `مسابقة #${receipt.teamEarnings?.contestNumber}` : `Contest #${receipt.teamEarnings?.contestNumber}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {receipt.teamEarnings?.country} • {receipt.teamEarnings?.participantCount} {language === 'ar' ? 'مشارك' : 'participants'}
                              </p>
                            </div>
                            <p className="font-bold text-primary">
                              +<span className="text-nova">И</span> {formatAmount(receipt.amount)}
                            </p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {periodStats.receipts.length === 0 && (
                  <Card className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground">
                      {language === 'ar' ? 'لا توجد أرباح في هذه الفترة' : 'No earnings in this period'}
                    </p>
                    {commissionRate === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {language === 'ar' 
                          ? 'الأرباح متاحة للقادة والمدراء والرؤساء فقط'
                          : 'Earnings available for Leaders, Managers & Presidents only'}
                      </p>
                    )}
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

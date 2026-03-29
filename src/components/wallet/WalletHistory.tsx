import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { History, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWalletHistory, WalletTransaction } from '@/hooks/useWalletHistory';

interface WalletHistoryProps {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  loading: boolean;
  transactions: WalletTransaction[];
  hasMore: boolean;
  onLoadMore: () => void;
}

export function WalletHistory({
  selectedTab,
  setSelectedTab,
  loading,
  transactions,
  hasMore,
  onLoadMore
}: WalletHistoryProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const formatBalance = (value: number): string => {
    return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  };

  const getTransactionDisplay = (tx: WalletTransaction, isRTL: boolean) => {
    const typeMap: Record<string, { title: string; titleAr: string; icon: string; color: string }> = {
      transfer_out: { title: 'Transfer Sent', titleAr: 'تحويل مرسل', icon: '↗️', color: 'text-destructive' },
      transfer_in: { title: 'Transfer Received', titleAr: 'تحويل مستلم', icon: '↙️', color: 'text-success' },
      p2p_buy: { title: 'P2P Buy', titleAr: 'شراء P2P', icon: '🛒', color: 'text-success' },
      p2p_sell: { title: 'P2P Sell', titleAr: 'بيع P2P', icon: '💰', color: 'text-nova' },
      p2p_escrow_lock: { title: 'Escrow Lock', titleAr: 'تجميد ضمان', icon: '🔒', color: 'text-warning' },
      p2p_escrow_release: { title: 'Escrow Release', titleAr: 'إفراج ضمان', icon: '🔓', color: 'text-success' },
      contest_entry: { title: 'Contest Entry', titleAr: 'دخول مسابقة', icon: '🎯', color: 'text-primary' },
      contest_win: { title: 'Contest Win', titleAr: 'فوز مسابقة', icon: '🏆', color: 'text-nova' },
      vote_spend: { title: 'Vote Sent', titleAr: 'تصويت', icon: '🗳️', color: 'text-aura' },
      vote_receive: { title: 'Vote Received', titleAr: 'تصويت مستلم', icon: '⭐', color: 'text-aura' },
      referral_bonus: { title: 'Referral Bonus', titleAr: 'مكافأة إحالة', icon: '🎁', color: 'text-success' },
      team_earnings: { title: 'Team Earnings', titleAr: 'أرباح الفريق', icon: '👥', color: 'text-primary' },
      admin_credit: { title: 'Admin Credit', titleAr: 'إضافة إدارية', icon: '➕', color: 'text-success' },
      admin_debit: { title: 'Admin Debit', titleAr: 'خصم إداري', icon: '➖', color: 'text-destructive' },
      conversion: { title: 'Conversion', titleAr: 'تحويل', icon: '🔄', color: 'text-aura' },
      agent_escrow_lock: { title: 'Agent Escrow Lock', titleAr: 'تجميد وكيل', icon: '🔒', color: 'text-warning' },
      agent_escrow_release: { title: 'Agent Escrow Release', titleAr: 'إفراج وكيل', icon: '🔓', color: 'text-success' },
      streak_reward: { title: 'Streak Bonus', titleAr: 'مكافأة الاستمرارية', icon: '🔥', color: 'text-nova' },
    };

    return typeMap[tx.entry_type] || { 
      title: tx.entry_type, 
      titleAr: tx.entry_type, 
      icon: '📝', 
      color: 'text-foreground' 
    };
  };

  const TransactionCard = ({ tx }: { tx: WalletTransaction }) => {
    const display = getTransactionDisplay(tx, isRTL);
    const isPositive = tx.amount > 0;

    return (
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
            {display.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {isRTL ? display.titleAr : display.title}
            </p>
            {tx.counterparty_name && (
              <p className="text-xs text-muted-foreground truncate">
                {tx.counterparty_name} @{tx.counterparty_username}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(tx.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="text-end">
            <p className={`font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}{formatBalance(tx.amount)}
              <span className={tx.currency === 'nova' ? 'text-nova' : 'text-aura'}>
                {tx.currency === 'nova' ? ' И' : ' ✦'}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'الرصيد:' : 'Bal:'} {formatBalance(tx.balance_after)}
              <span className={tx.currency === 'nova' ? 'text-nova' : 'text-aura'}>
                {tx.currency === 'nova' ? ' И' : ' ✦'}
              </span>
            </p>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div id="transactions" className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        {isRTL ? 'سجل العمليات' : 'Transaction History'}
      </h2>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="aura" className="text-xs gap-1.5">
            <span className="text-aura font-bold">✦</span> Aura
          </TabsTrigger>
          <TabsTrigger value="nova" className="text-xs gap-1.5">
            <span className="text-nova font-bold">И</span> Nova
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-3">
          {loading && transactions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <Card className="p-8 text-center">
              <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                {isRTL ? 'لا توجد عمليات' : 'No transactions'}
              </p>
            </Card>
          ) : (
            <>
              {transactions.map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <TransactionCard tx={tx} />
                </motion.div>
              ))}
              
              {hasMore && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={onLoadMore}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRTL ? 'تحميل المزيد' : 'Load More')}
                </Button>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

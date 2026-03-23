import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, Send, RefreshCw, History, TrendingUp, Lock, AlertTriangle, MessageCircle, Loader2, Link2, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWallet } from '@/hooks/useWallet';
import { useWalletHistory, WalletTransaction } from '@/hooks/useWalletHistory';
import { useNovaPricing } from '@/hooks/useNovaPricing';
import { TransferNovaDialog } from '@/components/wallet/TransferNovaDialog';
import { ConvertNovaAuraDialog } from '@/components/wallet/ConvertNovaAuraDialog';
import { WalletCountrySelector } from '@/components/wallet/WalletCountrySelector';
import { EarningsSummarySheet } from '@/components/wallet/EarningsSummarySheet';
import { getNextReleaseDate } from '@/components/wallet/LockedEarningsCard';
import { PaymentQRDialog } from '@/components/wallet/PaymentQRDialog';
import { useBanner } from '@/contexts/BannerContext';
import { RANK_COMMISSION_RATES } from '@/contexts/TransactionContext';
import { KYCStatusBanner } from '@/components/kyc/KYCStatusBanner';

// Format number
const formatBalance = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

// Map entry_type to display info
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

function TransactionCard({ tx, isRTL }: { tx: WalletTransaction; isRTL: boolean }) {
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
          </p>
        </div>
      </div>
    </Card>
  );
}

function WalletContent() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useUser();
  const { wallet } = useWallet();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  
  const { getCurrencyInfo } = useNovaPricing();
  const pricing = getCurrencyInfo(user.walletCountry);

  const [selectedTab, setSelectedTab] = useState<'aura' | 'nova'>('aura');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const { success: showSuccess } = useBanner();

  // Fetch real transaction history from DB
  const { transactions, loading, hasMore, loadMore } = useWalletHistory({
    currency: selectedTab
  });

  const novaLocalValue = user.novaBalance * pricing.novaRate;
  const lockedLocalValue = user.lockedNovaBalance * pricing.novaRate;
  const releaseInfo = getNextReleaseDate();

  const canEarn = RANK_COMMISSION_RATES[user.rank as keyof typeof RANK_COMMISSION_RATES] > 0;
  const commissionRate = RANK_COMMISSION_RATES[user.rank as keyof typeof RANK_COMMISSION_RATES] || 0;

  // Calculate team earnings from real transactions
  const teamEarningsTotal = transactions
    .filter(tx => tx.entry_type === 'team_earnings')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const isWalletFrozen = wallet?.is_frozen ?? false;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={t('wallet.title')} />
      <main className="flex-1 px-4 py-4 pb-20 space-y-5">
        {/* KYC Verification Banner */}
        <KYCStatusBanner />

        {/* Frozen Wallet Warning */}
        {isWalletFrozen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="font-bold">
                {isRTL ? '⚠️ رصيدك مجمّد مؤقتًا' : '⚠️ Your wallet is temporarily frozen'}
              </AlertTitle>
              <AlertDescription className="mt-2">
                <p className="text-sm mb-3">
                  {isRTL 
                    ? 'لا يمكنك حاليًا سحب أو تحويل Nova. يرجى التواصل مع الدعم.'
                    : 'You cannot currently withdraw or transfer Nova. Please contact support.'}
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => navigate('/help')}
                >
                  <MessageCircle className="h-4 w-4" />
                  {isRTL ? 'تواصل مع الدعم' : 'Contact Support'}
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden border border-border bg-card shadow-sm">
            <div className="p-5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <WalletIcon className="h-5 w-5 text-foreground" />
                  <h1 className="text-foreground text-lg font-bold">{t('wallet.title')}</h1>
                </div>
                <WalletCountrySelector />
              </div>

              <div className="space-y-4">
                {/* Available Nova */}
                <div className="bg-nova/5 border border-nova/20 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-nova text-lg font-bold">И</span>
                    <span className="text-foreground/70 text-xs font-medium">
                      {isRTL ? 'Nova المتاح' : 'Available Nova'}
                    </span>
                  </div>
                  <p className="text-foreground text-3xl font-bold">{formatBalance(user.novaBalance)}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    ≈ {isRTL ? pricing.symbolAr : pricing.symbol} {formatBalance(novaLocalValue)}
                  </p>
                </div>

                {/* Locked Nova */}
                {user.lockedNovaBalance > 0 && (
                  <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Lock className="h-4 w-4 text-warning" />
                          <span className="text-foreground/70 text-xs font-medium">
                            {isRTL ? 'أرباح مقفلة' : 'Locked Earnings'}
                          </span>
                        </div>
                        <p className="text-foreground text-xl font-bold">
                          <span className="text-nova">И</span> {formatBalance(user.lockedNovaBalance)}
                        </p>
                        <p className="text-muted-foreground text-xs mt-1">
                          ≈ {isRTL ? pricing.symbolAr : pricing.symbol} {formatBalance(lockedLocalValue)}
                        </p>
                      </div>
                      <div className="text-end bg-warning/10 rounded-lg px-3 py-2">
                        <p className="text-xs text-warning font-medium">
                          {isRTL ? 'تاريخ الإفراج' : 'Release Date'}
                        </p>
                        <p className="text-base font-bold text-foreground">
                          {isRTL ? releaseInfo.formattedDateAr : releaseInfo.formattedDate}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Aura Balance */}
                <div className="bg-aura/5 border border-aura/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-aura text-lg font-bold">✦</span>
                      <span className="text-foreground/70 text-xs font-medium">Aura</span>
                    </div>
                    <span className="text-xs text-muted-foreground bg-aura/10 rounded-full px-2 py-0.5">
                      {isRTL ? `الإجمالي: ${formatBalance(user.auraBalance + user.freeAuraBalance)}` : `Total: ${formatBalance(user.auraBalance + user.freeAuraBalance)}`}
                    </span>
                  </div>
                  {/* Paid Aura */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-foreground/60">
                      {isRTL ? 'Aura مدفوعة' : 'Paid Aura'}
                    </span>
                    <span className="text-foreground font-bold text-lg">{formatBalance(user.auraBalance)}</span>
                  </div>
                  {/* Free Aura */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/60">
                      {isRTL ? 'Aura مجانية' : 'Free Aura'}
                    </span>
                    <span className="text-aura/70 font-semibold text-base">{formatBalance(user.freeAuraBalance)}</span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-2 border-t border-aura/10 pt-2">
                    {isRTL
                      ? 'Aura المدفوعة تُولّد عمولات · المجانية للتأهل فقط'
                      : 'Paid Aura earns commission · Free Aura for qualification only'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-3">
          <Button 
            onClick={() => setTransferDialogOpen(true)}
            variant="outline"
            className="flex-col h-auto py-4 border-nova/30 hover:bg-nova/5 hover:border-nova/50 disabled:opacity-50"
            disabled={isWalletFrozen}
          >
            <Send className="h-5 w-5 mb-1 text-nova" />
            <span className="text-xs text-foreground">{isRTL ? 'تحويل Nova' : 'Transfer Nova'}</span>
            {isWalletFrozen && <span className="text-[10px] text-destructive mt-1">{isRTL ? 'مجمّد' : 'Frozen'}</span>}
          </Button>
          
          <Button 
            onClick={() => setConvertDialogOpen(true)}
            variant="outline"
            className="flex-col h-auto py-4 border-aura/30 hover:bg-aura/5 hover:border-aura/50 disabled:opacity-50"
            disabled={isWalletFrozen}
          >
            <RefreshCw className="h-5 w-5 mb-1.5 text-aura" />
            <span className="text-xs text-foreground text-center leading-tight">Nova → Aura</span>
            <span className="text-[10px] text-muted-foreground mt-1">{isRTL ? 'كل 1 Nova = 2 Aura' : '1 Nova = 2 Aura'}</span>
            {isWalletFrozen && <span className="text-[10px] text-destructive mt-1">{isRTL ? 'مجمّد' : 'Frozen'}</span>}
          </Button>
        </motion.div>

        {/* Payment Link & QR Buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="flex-col h-auto py-3 border-border hover:bg-muted/50"
            onClick={() => {
              const link = `${window.location.origin}/pay/${user.username}`;
              navigator.clipboard.writeText(link);
              showSuccess(isRTL ? 'تم نسخ الرابط!' : 'Link copied!');
            }}
          >
            <Link2 className="h-5 w-5 mb-1 text-primary" />
            <span className="text-xs text-foreground">{isRTL ? 'نسخ رابط الدفع' : 'Copy Pay Link'}</span>
          </Button>
          <Button
            variant="outline"
            className="flex-col h-auto py-3 border-border hover:bg-muted/50"
            onClick={() => setQrDialogOpen(true)}
          >
            <QrCode className="h-5 w-5 mb-1 text-primary" />
            <span className="text-xs text-foreground">{isRTL ? 'رمز QR' : 'My QR Code'}</span>
          </Button>
        </motion.div>

        {canEarn && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <EarningsSummarySheet>
              <Card className="p-4 bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">{isRTL ? 'أرباح الفريق' : 'Team Earnings'}</p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? `عمولة ${commissionRate} Nova لكل مشارك` : `${commissionRate} Nova per participant`}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold text-primary">+<span className="text-nova">И</span> {formatBalance(teamEarningsTotal)}</p>
                    <p className="text-xs text-muted-foreground">{isRTL ? 'إجمالي' : 'Total'}</p>
                  </div>
                </div>
              </Card>
            </EarningsSummarySheet>
          </motion.div>
        )}

        {/* Price Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-3 bg-card border border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{isRTL ? 'سعر Nova' : 'Nova Rate'}</span>
              <span className="font-semibold text-foreground">
                <span className="text-nova">И</span> 1 = {isRTL ? pricing.symbolAr : pricing.symbol} {pricing.novaRate.toLocaleString()}
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Transaction History - FROM DATABASE */}
        <div id="transactions">
          <h2 className="text-lg font-semibold mb-3">{isRTL ? 'سجل العمليات' : 'Transaction History'}</h2>
          
          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'aura' | 'nova')}>
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
                  <p className="text-muted-foreground">{isRTL ? 'لا توجد عمليات' : 'No transactions'}</p>
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
                      <TransactionCard tx={tx} isRTL={isRTL} />
                    </motion.div>
                  ))}
                  
                  {hasMore && (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={loadMore}
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

        {/* Dialogs */}
        <TransferNovaDialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} />
        <ConvertNovaAuraDialog open={convertDialogOpen} onClose={() => setConvertDialogOpen(false)} />
        <PaymentQRDialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} />
      </main>
      <BottomNav />
    </div>
  );
}

export default function WalletPage() {
  return <WalletContent />;
}

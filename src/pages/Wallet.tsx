import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, Send, RefreshCw, History, TrendingUp, Users, Lock, AlertTriangle, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser } from '@/contexts/UserContext';
import { useTransactions, RANK_COMMISSION_RATES } from '@/contexts/TransactionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWallet } from '@/hooks/useWallet';
import { useNovaPricing } from '@/hooks/useNovaPricing';
import { ReceiptCard, ReceiptDialog } from '@/components/common/ReceiptCard';
import { TransferNovaDialog } from '@/components/wallet/TransferNovaDialog';
import { ConvertNovaAuraDialog } from '@/components/wallet/ConvertNovaAuraDialog';
import { WalletCountrySelector } from '@/components/wallet/WalletCountrySelector';
import { EarningsSummarySheet } from '@/components/wallet/EarningsSummarySheet';
import { LockedEarningsCard, getNextReleaseDate } from '@/components/wallet/LockedEarningsCard';
import { UnifiedTransactionCard } from '@/components/wallet/UnifiedTransactionCard';
import { FTUXGuard } from '@/components/ftux';
import type { Receipt } from '@/contexts/TransactionContext';

// Format number - remove decimals if whole number (matches Home)
const formatBalance = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

function WalletContent() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useUser();
  const { receipts, calculateLocalAmount } = useTransactions();
  const { wallet } = useWallet();
  const navigate = useNavigate();
  
  // Use unified pricing from app_settings
  const { getCurrencyInfo } = useNovaPricing();
  const pricing = getCurrencyInfo(user.walletCountry);

  const [selectedTab, setSelectedTab] = useState('aura');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  // Calculate local values using unified pricing
  const novaLocalValue = user.novaBalance * pricing.novaRate;
  const lockedLocalValue = user.lockedNovaBalance * pricing.novaRate;
  const releaseInfo = getNextReleaseDate();

  // Filter user receipts
  const userReceipts = receipts.filter(
    r => r.sender.id === user.id || r.receiver?.id === user.id
  );

  // Check if user can earn (Leader+)
  const canEarn = RANK_COMMISSION_RATES[user.rank as keyof typeof RANK_COMMISSION_RATES] > 0;
  const commissionRate = RANK_COMMISSION_RATES[user.rank as keyof typeof RANK_COMMISSION_RATES] || 0;

  // Calculate total team earnings
  const teamEarningsTotal = userReceipts
    .filter(r => r.type === 'team_earnings')
    .reduce((sum, r) => sum + r.amount, 0);

  const filteredReceipts = userReceipts.filter(r => {
    if (selectedTab === 'nova') {
      // Nova operations: transfers, P2P, team earnings, contest entry, earnings release
      return r.type === 'transfer_nova' || r.type === 'p2p_buy' || r.type === 'p2p_sell' || r.type === 'team_earnings' || r.type === 'earnings_release' || r.type === 'contest_entry';
    }
    if (selectedTab === 'aura') {
      // Aura operations: vote earnings, voting (sent/received), convert nova to aura
      return r.type === 'aura_vote_earnings' || r.type === 'vote_received' || r.type === 'vote_sent' || r.type === 'convert_nova_aura';
    }
    return true;
  });

  const handleReceiptClick = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setReceiptDialogOpen(true);
  };

  // Check if wallet is frozen
  const isWalletFrozen = wallet?.is_frozen ?? false;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={t('wallet.title')} />
      <main className="flex-1 px-4 py-4 pb-20 space-y-5">
        {/* Frozen Wallet Warning Banner */}
        {isWalletFrozen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="font-bold">
                {language === 'ar' ? '⚠️ رصيدك مجمّد مؤقتًا' : '⚠️ Your wallet is temporarily frozen'}
              </AlertTitle>
              <AlertDescription className="mt-2">
                <p className="text-sm mb-3">
                  {language === 'ar' 
                    ? 'لا يمكنك حاليًا سحب أو تحويل Nova. يرجى التواصل مع الدعم لمزيد من المعلومات.'
                    : 'You cannot currently withdraw or transfer Nova. Please contact support for more information.'}
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => navigate('/help')}
                >
                  <MessageCircle className="h-4 w-4" />
                  {language === 'ar' ? 'تواصل مع الدعم' : 'Contact Support'}
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
        {/* Balance Card - Clean White Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden border border-border bg-card shadow-sm">
            <div className="p-5">
              {/* Header with Country Selector */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <WalletIcon className="h-5 w-5 text-foreground" />
                  <h1 className="text-foreground text-lg font-bold">
                    {t('wallet.title')}
                  </h1>
                </div>
                <WalletCountrySelector />
              </div>

              {/* Nova & Aura Balances - Updated with Locked */}
              <div className="space-y-4">
                {/* Available Nova - Main balance */}
                <div className="bg-nova/5 border border-nova/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-nova text-lg font-bold">И</span>
                      <span className="text-foreground/70 text-xs font-medium">
                        {language === 'ar' ? 'Nova المتاح' : 'Available Nova'}
                      </span>
                    </div>
                  </div>
                  <p className="text-foreground text-3xl font-bold">
                    {formatBalance(user.novaBalance)}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    ≈ {language === 'ar' ? pricing.symbolAr : pricing.symbol} {formatBalance(novaLocalValue)}
                  </p>
                </div>

                {/* Locked Nova - Only show if > 0 */}
                {user.lockedNovaBalance > 0 && (
                  <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Lock className="h-4 w-4 text-warning" />
                          <span className="text-foreground/70 text-xs font-medium">
                            {language === 'ar' ? 'أرباح مقفلة' : 'Locked Earnings'}
                          </span>
                        </div>
                        <p className="text-foreground text-xl font-bold">
                          <span className="text-nova">И</span> {formatBalance(user.lockedNovaBalance)}
                        </p>
                        <p className="text-muted-foreground text-xs mt-1">
                          ≈ {language === 'ar' ? pricing.symbolAr : pricing.symbol} {formatBalance(lockedLocalValue)}
                        </p>
                      </div>
                      <div className="text-end bg-warning/10 rounded-lg px-3 py-2">
                        <p className="text-xs text-warning font-medium">
                          {language === 'ar' ? 'تاريخ الإفراج' : 'Release Date'}
                        </p>
                        <p className="text-base font-bold text-foreground">
                          {language === 'ar' ? releaseInfo.formattedDateAr : releaseInfo.formattedDate}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Aura Balance */}
                <div className="bg-aura/5 border border-aura/20 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-aura text-lg font-bold">✦</span>
                    <span className="text-foreground/70 text-xs font-medium">Aura</span>
                  </div>
                  <p className="text-foreground text-2xl font-bold">
                    {formatBalance(user.auraBalance)}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {language === 'ar' ? 'نقاط تصويت' : 'Voting Points'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>


        {/* Action Buttons - 2 columns + Earnings Summary for eligible ranks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          <Button 
            onClick={() => setTransferDialogOpen(true)}
            variant="outline"
            className="flex-col h-auto py-4 border-nova/30 hover:bg-nova/5 hover:border-nova/50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isWalletFrozen}
          >
            <Send className="h-5 w-5 mb-1 text-nova" />
            <span className="text-xs text-foreground">
              {language === 'ar' ? 'تحويل Nova' : 'Transfer Nova'}
            </span>
            {isWalletFrozen && (
              <span className="text-[10px] text-destructive mt-1">
                {language === 'ar' ? 'مجمّد' : 'Frozen'}
              </span>
            )}
          </Button>
          
          <Button 
            onClick={() => setConvertDialogOpen(true)}
            variant="outline"
            className="flex-col h-auto py-4 border-aura/30 hover:bg-aura/5 hover:border-aura/50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isWalletFrozen}
          >
            <RefreshCw className="h-5 w-5 mb-1.5 text-aura" />
            <span className="text-xs text-foreground text-center leading-tight">
              Nova → Aura
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              {language === 'ar' ? 'كل 1 Nova = 2 Aura' : '1 Nova = 2 Aura'}
            </span>
            {isWalletFrozen && (
              <span className="text-[10px] text-destructive mt-1">
                {language === 'ar' ? 'مجمّد' : 'Frozen'}
              </span>
            )}
          </Button>
        </motion.div>

        {/* Team Earnings Card - Only for Leader+ */}
        {canEarn && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <EarningsSummarySheet>
              <Card className="p-4 bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">
                      {language === 'ar' ? 'أرباح الفريق' : 'Team Earnings'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' 
                        ? `عمولة ${commissionRate} Nova لكل مشارك`
                        : `${commissionRate} Nova per participant`}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold text-primary">
                      +<span className="text-nova">И</span> {formatBalance(teamEarningsTotal)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'إجمالي' : 'Total'}
                    </p>
                  </div>
                </div>
              </Card>
            </EarningsSummarySheet>
          </motion.div>
        )}

        {/* Price Info - Nova rate display from app_settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-3 bg-card border border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'سعر Nova' : 'Nova Rate'}
              </span>
              <span className="font-semibold text-foreground">
                <span className="text-nova">И</span> 1 = {language === 'ar' ? pricing.symbolAr : pricing.symbol} {pricing.novaRate.toLocaleString()}
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Transaction History */}
        <div id="transactions">
          <h2 className="text-lg font-semibold mb-3">
            {language === 'ar' ? 'سجل العمليات' : 'Transaction History'}
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
              {filteredReceipts.length === 0 ? (
                <Card className="p-8 text-center">
                  <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'لا توجد عمليات' : 'No transactions'}
                  </p>
                </Card>
              ) : (
                filteredReceipts.map((receipt, index) => (
                  <motion.div
                    key={receipt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <UnifiedTransactionCard 
                      receipt={receipt} 
                      onClick={() => handleReceiptClick(receipt)}
                    />
                  </motion.div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialogs */}
        <TransferNovaDialog 
          open={transferDialogOpen} 
          onClose={() => setTransferDialogOpen(false)} 
        />
        
        <ConvertNovaAuraDialog 
          open={convertDialogOpen} 
          onClose={() => setConvertDialogOpen(false)} 
        />

        <ReceiptDialog
          receipt={selectedReceipt}
          open={receiptDialogOpen}
          onClose={() => setReceiptDialogOpen(false)}
        />
      </main>
      <BottomNav />
    </div>
  );
}

export default function WalletPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  
  return (
    <FTUXGuard pageTitle={language === 'ar' ? 'المحفظة' : 'Wallet'}>
      <WalletContent />
    </FTUXGuard>
  );
}

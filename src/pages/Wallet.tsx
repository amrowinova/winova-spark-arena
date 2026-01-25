import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, Send, RefreshCw, History, ChevronRight, Info } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/contexts/UserContext';
import { useTransactions, countryPricing } from '@/contexts/TransactionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ReceiptCard, ReceiptDialog } from '@/components/common/ReceiptCard';
import { TransferNovaDialog } from '@/components/wallet/TransferNovaDialog';
import { ConvertNovaAuraDialog } from '@/components/wallet/ConvertNovaAuraDialog';
import type { Receipt } from '@/contexts/TransactionContext';

export default function WalletPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useUser();
  const { receipts, calculateLocalAmount } = useTransactions();

  const [selectedTab, setSelectedTab] = useState('all');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  // Get local currency info
  const pricing = countryPricing[user.country] || countryPricing['Saudi Arabia'];
  const novaLocalValue = calculateLocalAmount(user.novaBalance, user.country);
  const auraLocalValue = calculateLocalAmount(user.auraBalance, user.country);
  const totalLocalValue = novaLocalValue.amount + auraLocalValue.amount;

  // Filter user receipts
  const userReceipts = receipts.filter(
    r => r.sender.id === user.id || r.receiver?.id === user.id
  );

  const filteredReceipts = userReceipts.filter(r => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'transfers') return r.type === 'transfer_nova' || r.type === 'convert_nova_aura';
    if (selectedTab === 'contests') return r.type === 'contest_entry' || r.type === 'vote_received' || r.type === 'vote_sent';
    if (selectedTab === 'p2p') return r.type === 'p2p_buy' || r.type === 'p2p_sell';
    return true;
  });

  const handleReceiptClick = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setReceiptDialogOpen(true);
  };

  return (
    <AppLayout title={t('wallet.title')}>
      <div className="px-4 py-4 space-y-5">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-dark p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <WalletIcon className="h-6 w-6 text-secondary-foreground" />
                  <h1 className="text-secondary-foreground text-lg font-bold">
                    {t('wallet.title')}
                  </h1>
                </div>
                <span className="px-2 py-1 bg-card/20 rounded text-secondary-foreground/80 text-xs">
                  {pricing.currency}
                </span>
              </div>

              {/* Local Currency Total */}
              <div className="text-center mb-4">
                <p className="text-secondary-foreground/70 text-sm mb-1">
                  {language === 'ar' ? 'القيمة الإجمالية' : 'Total Value'}
                </p>
                <p className="text-secondary-foreground text-3xl font-bold">
                  {pricing.symbol} {totalLocalValue.toFixed(2)}
                </p>
              </div>

              {/* Nova & Aura Balances */}
              <div className="grid grid-cols-2 gap-4">
                {/* Nova Balance */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-nova rounded-xl p-4 glow-nova"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">✦</span>
                    <span className="text-nova-foreground/80 text-xs font-medium">
                      Nova
                    </span>
                  </div>
                  <p className="text-nova-foreground text-2xl font-bold">
                    {user.novaBalance.toFixed(3)}
                  </p>
                  <p className="text-nova-foreground/70 text-xs mt-1">
                    ≈ {pricing.symbol} {novaLocalValue.amount.toFixed(2)}
                  </p>
                </motion.div>

                {/* Aura Balance */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-aura rounded-xl p-4 glow-aura"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">◈</span>
                    <span className="text-aura-foreground/80 text-xs font-medium">
                      Aura
                    </span>
                  </div>
                  <p className="text-aura-foreground text-2xl font-bold">
                    {user.auraBalance.toFixed(3)}
                  </p>
                  <p className="text-aura-foreground/70 text-xs mt-1">
                    ≈ {pricing.symbol} {auraLocalValue.amount.toFixed(2)}
                  </p>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Aura Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-3 bg-aura/5 border-aura/20">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-aura mt-0.5 shrink-0" />
              <p className="text-xs text-aura">
                {language === 'ar' 
                  ? 'Aura غير قابلة للتحويل بين المستخدمين. تُستخدم فقط في المسابقات والتصويت.'
                  : 'Aura cannot be transferred between users. It can only be used for contests and voting.'}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons - Only 3 as specified */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-3"
        >
          <Button 
            onClick={() => setTransferDialogOpen(true)}
            className="flex-col h-auto py-4 bg-gradient-nova text-nova-foreground hover:opacity-90"
          >
            <Send className="h-5 w-5 mb-1" />
            <span className="text-xs">
              {language === 'ar' ? 'تحويل Nova' : 'Transfer Nova'}
            </span>
          </Button>
          
          <Button 
            onClick={() => setConvertDialogOpen(true)}
            className="flex-col h-auto py-4 bg-gradient-aura text-aura-foreground hover:opacity-90"
          >
            <RefreshCw className="h-5 w-5 mb-1" />
            <span className="text-xs text-center leading-tight">
              {language === 'ar' ? 'Nova → Aura' : 'Nova → Aura'}
            </span>
          </Button>
          
          <Button 
            variant="secondary"
            className="flex-col h-auto py-4"
            onClick={() => document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <History className="h-5 w-5 mb-1" />
            <span className="text-xs">
              {language === 'ar' ? 'السجل' : 'History'}
            </span>
          </Button>
        </motion.div>

        {/* Price Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {language === 'ar' ? 'سعر Nova الرسمي' : 'Official Nova Price'}
              </span>
              <span className="font-bold text-primary">
                1 ✦ = {pricing.symbol} {pricing.rate.toFixed(2)} {pricing.currency}
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
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="all" className="text-xs">
                {language === 'ar' ? 'الكل' : 'All'}
              </TabsTrigger>
              <TabsTrigger value="transfers" className="text-xs">
                {language === 'ar' ? 'تحويلات' : 'Transfers'}
              </TabsTrigger>
              <TabsTrigger value="contests" className="text-xs">
                {language === 'ar' ? 'مسابقات' : 'Contests'}
              </TabsTrigger>
              <TabsTrigger value="p2p" className="text-xs">
                P2P
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
                    <ReceiptCard 
                      receipt={receipt} 
                      compact 
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
      </div>
    </AppLayout>
  );
}

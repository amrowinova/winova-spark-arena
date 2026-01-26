import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, Send, RefreshCw, History, Info } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/contexts/UserContext';
import { useTransactions, countryPricing, getPricing } from '@/contexts/TransactionContext';
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

  // Get local currency info - single price per country
  const pricing = getPricing(user.country);
  const novaLocalValue = calculateLocalAmount(user.novaBalance, user.country, 'nova');
  const auraLocalValue = calculateLocalAmount(user.auraBalance, user.country, 'aura');
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
        {/* Balance Card - Clean White Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden border border-border bg-card shadow-sm">
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <WalletIcon className="h-5 w-5 text-foreground" />
                  <h1 className="text-foreground text-lg font-bold">
                    {t('wallet.title')}
                  </h1>
                </div>
                <span className="px-2 py-1 bg-muted/30 rounded text-muted-foreground text-xs font-medium">
                  {pricing.currency}
                </span>
              </div>

              {/* Nova & Aura Balances - Clean Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Nova Balance - Gold accent */}
                <div className="bg-nova/5 border border-nova/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-nova text-lg">✦</span>
                    <span className="text-foreground/70 text-xs font-medium">
                      Nova
                    </span>
                  </div>
                  <p className="text-foreground text-2xl font-bold">
                    {user.novaBalance.toFixed(2)}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    ≈ {pricing.symbol} {novaLocalValue.amount.toFixed(2)}
                  </p>
                </div>

                {/* Aura Balance - Purple accent, NO local currency */}
                <div className="bg-aura/5 border border-aura/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-aura text-lg">◈</span>
                    <span className="text-foreground/70 text-xs font-medium">
                      Aura
                    </span>
                  </div>
                  <p className="text-foreground text-2xl font-bold">
                    {user.auraBalance.toFixed(0)}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {language === 'ar' ? 'نقاط تصويت' : 'Voting Points'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Aura Info - Simple text with icon */}
        <div className="flex items-center gap-2 px-1">
          <Info className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            {language === 'ar' 
              ? 'Aura تُستخدم فقط في المسابقات والتصويت • 1 Nova = 2 Aura'
              : 'Aura is used only for contests & voting • 1 Nova = 2 Aura'}
          </p>
        </div>

        {/* Action Buttons - Consistent styling */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          <Button 
            onClick={() => setTransferDialogOpen(true)}
            variant="outline"
            className="flex-col h-auto py-4 border-nova/30 hover:bg-nova/5 hover:border-nova/50"
          >
            <Send className="h-5 w-5 mb-1 text-nova" />
            <span className="text-xs text-foreground">
              {language === 'ar' ? 'تحويل Nova' : 'Transfer Nova'}
            </span>
          </Button>
          
          <Button 
            onClick={() => setConvertDialogOpen(true)}
            variant="outline"
            className="flex-col h-auto py-4 border-aura/30 hover:bg-aura/5 hover:border-aura/50"
          >
            <RefreshCw className="h-5 w-5 mb-1 text-aura" />
            <span className="text-xs text-foreground text-center leading-tight">
              Nova → Aura
            </span>
          </Button>
          
          <Button 
            variant="outline"
            className="flex-col h-auto py-4 border-border hover:bg-muted/30"
            onClick={() => document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <History className="h-5 w-5 mb-1 text-muted-foreground" />
            <span className="text-xs text-foreground">
              {language === 'ar' ? 'السجل' : 'History'}
            </span>
          </Button>
        </motion.div>

        {/* Price Info - Only Nova has real value */}
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
                1 <span className="text-nova">✦</span> = {pricing.symbol} {pricing.novaRate.toFixed(2)}
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

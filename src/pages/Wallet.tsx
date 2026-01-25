import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, RefreshCw, Receipt, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CurrencyBadge } from '@/components/common/CurrencyBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/contexts/UserContext';

// Mock transactions
const transactions = [
  { 
    id: 1, 
    type: 'receive', 
    currency: 'nova' as const, 
    amount: 50, 
    from: 'Contest #1247', 
    date: '2024-01-20T14:30:00', 
    status: 'completed' 
  },
  { 
    id: 2, 
    type: 'spend', 
    currency: 'nova' as const, 
    amount: 10, 
    from: 'Contest Entry', 
    date: '2024-01-20T10:00:00', 
    status: 'completed' 
  },
  { 
    id: 3, 
    type: 'receive', 
    currency: 'aura' as const, 
    amount: 25, 
    from: 'Voting Rewards', 
    date: '2024-01-19T18:45:00', 
    status: 'completed' 
  },
  { 
    id: 4, 
    type: 'spend', 
    currency: 'aura' as const, 
    amount: 5, 
    from: 'Vote Cast', 
    date: '2024-01-19T16:20:00', 
    status: 'completed' 
  },
  { 
    id: 5, 
    type: 'receive', 
    currency: 'nova' as const, 
    amount: 100, 
    from: 'P2P Purchase', 
    date: '2024-01-18T12:00:00', 
    status: 'pending' 
  },
];

export default function WalletPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [selectedTab, setSelectedTab] = useState('all');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTransactions = transactions.filter(tx => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'nova') return tx.currency === 'nova';
    if (selectedTab === 'aura') return tx.currency === 'aura';
    return true;
  });

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
              <div className="flex items-center gap-2 mb-4">
                <WalletIcon className="h-6 w-6 text-secondary-foreground" />
                <h1 className="text-secondary-foreground text-lg font-bold">
                  {t('wallet.totalBalance')}
                </h1>
              </div>

              {/* Balances */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                {/* Nova Balance */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-nova rounded-xl p-4 glow-nova"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">✦</span>
                    <span className="text-nova-foreground/80 text-sm font-medium">
                      {t('home.nova')}
                    </span>
                  </div>
                  <p className="text-nova-foreground text-3xl font-bold">
                    {user.novaBalance.toLocaleString()}
                  </p>
                </motion.div>

                {/* Aura Balance */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-aura rounded-xl p-4 glow-aura"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">◈</span>
                    <span className="text-aura-foreground/80 text-sm font-medium">
                      {t('home.aura')}
                    </span>
                  </div>
                  <p className="text-aura-foreground text-3xl font-bold">
                    {user.auraBalance.toLocaleString()}
                  </p>
                </motion.div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="secondary" 
                  className="flex-col h-auto py-3 bg-card/10 hover:bg-card/20 text-secondary-foreground"
                >
                  <ArrowUpRight className="h-5 w-5 mb-1" />
                  <span className="text-xs">{t('wallet.send')}</span>
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-col h-auto py-3 bg-card/10 hover:bg-card/20 text-secondary-foreground"
                >
                  <ArrowDownLeft className="h-5 w-5 mb-1" />
                  <span className="text-xs">{t('wallet.receive')}</span>
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-col h-auto py-3 bg-card/10 hover:bg-card/20 text-secondary-foreground"
                >
                  <RefreshCw className="h-5 w-5 mb-1" />
                  <span className="text-xs">{t('wallet.convert')}</span>
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4 bg-primary/5 border-primary/20">
            <p className="text-sm text-primary">
              💡 <strong>Note:</strong> Aura cannot be transferred between users. Nova → Aura conversion is automatic when needed.
            </p>
          </Card>
        </motion.div>

        {/* Transaction History */}
        <div>
          <h2 className="text-lg font-semibold mb-3">{t('wallet.transactions')}</h2>
          
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="nova">Nova ✦</TabsTrigger>
              <TabsTrigger value="aura">Aura ◈</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <Card className="p-8 text-center">
                  <Receipt className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">{t('wallet.noTransactions')}</p>
                </Card>
              ) : (
                filteredTransactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card>
                      <CardContent className="p-3 flex items-center gap-3">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.type === 'receive' 
                            ? 'bg-success/20 text-success' 
                            : 'bg-destructive/20 text-destructive'
                        }`}>
                          {tx.type === 'receive' 
                            ? <ArrowDownLeft className="h-5 w-5" /> 
                            : <ArrowUpRight className="h-5 w-5" />
                          }
                        </div>

                        {/* Details */}
                        <div className="flex-1">
                          <p className="font-medium">{tx.from}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(tx.date)}
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="text-end">
                          <div className={`font-semibold ${
                            tx.type === 'receive' ? 'text-success' : 'text-destructive'
                          }`}>
                            {tx.type === 'receive' ? '+' : '-'}
                            {tx.amount} {tx.currency === 'nova' ? '✦' : '◈'}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            tx.status === 'completed' 
                              ? 'bg-success/20 text-success' 
                              : 'bg-warning/20 text-warning'
                          }`}>
                            {t(`wallet.${tx.status}`)}
                          </span>
                        </div>

                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

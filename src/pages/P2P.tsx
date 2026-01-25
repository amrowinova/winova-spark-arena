import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, User, Clock, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CurrencyBadge } from '@/components/common/CurrencyBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Mock P2P orders
const orders = [
  {
    id: 'P2P-1234',
    type: 'buy',
    amount: 100,
    price: 10.50,
    total: 1050,
    currency: 'USD',
    seller: { name: 'Khalid M.', avatar: '👨', rating: 4.8 },
    status: 'open',
    createdAt: '2024-01-20T10:00:00',
  },
  {
    id: 'P2P-1235',
    type: 'sell',
    amount: 50,
    price: 10.45,
    total: 522.50,
    currency: 'USD',
    buyer: { name: 'Sara A.', avatar: '👩', rating: 4.9 },
    status: 'inProgress',
    createdAt: '2024-01-20T09:30:00',
  },
  {
    id: 'P2P-1236',
    type: 'buy',
    amount: 200,
    price: 10.40,
    total: 2080,
    currency: 'USD',
    seller: { name: 'Omar B.', avatar: '👨', rating: 4.7 },
    status: 'completed',
    createdAt: '2024-01-19T15:00:00',
  },
];

// Available listings
const listings = [
  {
    id: 'L-001',
    type: 'sell',
    seller: { name: 'Mohammed K.', avatar: '👨', rating: 4.9, orders: 156 },
    amount: 500,
    price: 10.50,
    minOrder: 50,
    maxOrder: 500,
    paymentMethods: ['Bank Transfer', 'PayPal'],
  },
  {
    id: 'L-002',
    type: 'sell',
    seller: { name: 'Layla H.', avatar: '👩', rating: 4.8, orders: 89 },
    amount: 300,
    price: 10.48,
    minOrder: 30,
    maxOrder: 300,
    paymentMethods: ['Bank Transfer'],
  },
  {
    id: 'L-003',
    type: 'sell',
    seller: { name: 'Ahmed N.', avatar: '👨', rating: 4.95, orders: 234 },
    amount: 1000,
    price: 10.45,
    minOrder: 100,
    maxOrder: 500,
    paymentMethods: ['Bank Transfer', 'PayPal', 'Wise'],
  },
];

const statusColors = {
  open: 'bg-primary/20 text-primary',
  inProgress: 'bg-warning/20 text-warning',
  completed: 'bg-success/20 text-success',
  disputed: 'bg-destructive/20 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

const statusIcons = {
  open: Clock,
  inProgress: Clock,
  completed: CheckCircle,
  disputed: AlertCircle,
  cancelled: AlertCircle,
};

export default function P2PPage() {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState('buy');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<typeof listings[0] | null>(null);
  const [buyAmount, setBuyAmount] = useState('');

  return (
    <AppLayout title={t('p2p.title')}>
      <div className="px-4 py-4 space-y-5">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{t('p2p.title')}</h1>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t('p2p.createOrder')}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="buy">{t('p2p.buy')} Nova</TabsTrigger>
            <TabsTrigger value="sell">{t('p2p.sell')} Nova</TabsTrigger>
            <TabsTrigger value="orders">{t('p2p.orders')}</TabsTrigger>
          </TabsList>

          {/* Buy Tab - Show Listings */}
          <TabsContent value="buy" className="mt-4 space-y-3">
            {listings.map((listing, index) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-4">
                    {/* Seller Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                        {listing.seller.avatar}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{listing.seller.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>⭐ {listing.seller.rating}</span>
                          <span>•</span>
                          <span>{listing.seller.orders} orders</span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Amount */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('p2p.price')}</p>
                        <p className="text-lg font-bold text-success">${listing.price}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Available</p>
                        <div className="flex items-center gap-1">
                          <span className="text-lg font-bold">{listing.amount}</span>
                          <span className="text-muted-foreground">✦</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Limits */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>Limit: {listing.minOrder} - {listing.maxOrder} Nova</span>
                      <span>{listing.paymentMethods.join(', ')}</span>
                    </div>

                    <Button 
                      className="w-full"
                      onClick={() => setSelectedListing(listing)}
                    >
                      {t('p2p.buy')} Nova
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* Sell Tab */}
          <TabsContent value="sell" className="mt-4">
            <Card className="p-8 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground mb-4">Create a sell order to list your Nova</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 me-2" />
                {t('p2p.createOrder')}
              </Button>
            </Card>
          </TabsContent>

          {/* My Orders Tab */}
          <TabsContent value="orders" className="mt-4 space-y-3">
            {orders.map((order, index) => {
              const StatusIcon = statusIcons[order.status as keyof typeof statusIcons];
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            order.type === 'buy' ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
                          }`}>
                            {order.type.toUpperCase()}
                          </span>
                          <span className="text-sm text-muted-foreground">#{order.id}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                          statusColors[order.status as keyof typeof statusColors]
                        }`}>
                          <StatusIcon className="h-3 w-3" />
                          {t(`p2p.${order.status}`)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <CurrencyBadge type="nova" amount={order.amount} size="md" />
                          <p className="text-sm text-muted-foreground mt-1">
                            @ ${order.price} = ${order.total.toFixed(2)}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          View <ChevronRight className="h-4 w-4 ms-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </TabsContent>
        </Tabs>

        {/* Create Order Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('p2p.createOrder')}</DialogTitle>
              <DialogDescription>
                Create a new buy or sell order for Nova
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-12">
                  {t('p2p.buy')} Nova
                </Button>
                <Button variant="outline" className="h-12">
                  {t('p2p.sell')} Nova
                </Button>
              </div>

              <div className="space-y-2">
                <Label>{t('p2p.amount')}</Label>
                <Input type="number" placeholder="100" />
              </div>

              <div className="space-y-2">
                <Label>{t('p2p.price')} (USD)</Label>
                <Input type="number" placeholder="10.50" />
              </div>

              <Button className="w-full">{t('p2p.createOrder')}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Buy Dialog */}
        <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('p2p.buy')} Nova</DialogTitle>
              <DialogDescription>
                Buy from {selectedListing?.seller.name}
              </DialogDescription>
            </DialogHeader>
            
            {selectedListing && (
              <div className="space-y-4">
                {/* Order Summary */}
                <Card className="p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">{t('p2p.orderSummary')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('p2p.price')}</span>
                      <span className="font-medium">${selectedListing.price} / Nova</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Limit</span>
                      <span>{selectedListing.minOrder} - {selectedListing.maxOrder} Nova</span>
                    </div>
                  </div>
                </Card>

                <div className="space-y-2">
                  <Label>{t('p2p.amount')} (Nova)</Label>
                  <Input 
                    type="number" 
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder={`${selectedListing.minOrder} - ${selectedListing.maxOrder}`}
                    min={selectedListing.minOrder}
                    max={selectedListing.maxOrder}
                  />
                </div>

                {buyAmount && (
                  <div className="p-3 bg-success/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">{t('p2p.total')}</p>
                    <p className="text-2xl font-bold text-success">
                      ${(parseFloat(buyAmount) * selectedListing.price).toFixed(2)}
                    </p>
                  </div>
                )}

                <Button 
                  className="w-full bg-gradient-primary"
                  disabled={!buyAmount || parseFloat(buyAmount) < selectedListing.minOrder}
                >
                  {t('p2p.buy')} {buyAmount || 0} Nova
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

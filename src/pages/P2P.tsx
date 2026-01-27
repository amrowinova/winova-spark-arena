import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, ShoppingCart, Send, ArrowLeft,
  Star, AlertCircle
} from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useTransactions, Receipt } from '@/contexts/TransactionContext';
import { ReceiptDialog } from '@/components/common/ReceiptCard';
import { useBanner } from '@/contexts/BannerContext';

import {
  P2PCountrySelector,
  P2POfferCard,
  P2POrdersList,
  P2PCreateOrderDialog,
  P2PBuyDialog,
  P2POrderCard,
  P2PPaymentCard,
  P2PActionButtons,
  P2PSystemMessage,
  P2PCompactOrderCard,
  P2POrderCompletedScreen,
  CountryConfig,
  PaymentMethod,
  P2POffer,
  P2POrderListItem,
  COUNTRIES,
  getDefaultCountry,
} from '@/components/p2p';

import { P2POrder, P2POrderStatus, P2PChat, P2PMessage, useP2P } from '@/contexts/P2PContext';

// Mock offers data based on country
const generateOffersForCountry = (country: CountryConfig): P2POffer[] => {
  const baseOffers = [
    {
      id: 'offer-1',
      user: {
        id: 'user-seller-1',
        name: 'Mohammed Ali',
        nameAr: 'محمد علي',
        avatar: '👨',
        rating: 4.9,
        completedTrades: 156,
        completionRate: 98.5,
      },
      amount: 500,
      timeLimit: 30,
    },
    {
      id: 'offer-2',
      user: {
        id: 'user-seller-2',
        name: 'Sarah Hassan',
        nameAr: 'سارة حسن',
        avatar: '👩',
        rating: 4.8,
        completedTrades: 89,
        completionRate: 97.2,
      },
      amount: 200,
      timeLimit: 15,
    },
    {
      id: 'offer-3',
      user: {
        id: 'user-seller-3',
        name: 'Ahmed Khalil',
        nameAr: 'أحمد خليل',
        avatar: '👨‍💼',
        rating: 4.7,
        completedTrades: 234,
        completionRate: 99.1,
      },
      amount: 100,
      timeLimit: 60,
    },
  ];

  return baseOffers.map(offer => ({
    ...offer,
    type: 'sell' as const,
    price: country.novaRate,
    currency: country.currency,
    currencySymbol: country.currencySymbol,
    paymentMethods: country.paymentMethods,
    country,
  }));
};

// Convert P2POrder to P2POrderListItem
const orderToListItem = (order: P2POrder, currentUserId: string): P2POrderListItem => {
  const isBuyer = order.buyer.id === currentUserId;
  const counterparty = isBuyer ? order.seller : order.buyer;
  
  return {
    id: order.id,
    type: order.type,
    amount: order.amount,
    price: order.price,
    total: order.total,
    currency: order.currency,
    currencySymbol: order.currencySymbol,
    status: order.status,
    counterparty: {
      name: counterparty.name,
      nameAr: counterparty.nameAr,
      avatar: counterparty.avatar,
    },
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
  };
};

export default function P2PPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useUser();
  const { createTransaction } = useTransactions();
  const { 
    chats, 
    sendMessage, 
    hasOpenOrder,
    canCreateOrder,
    isBlockedFromOrders,
    getCancellationsIn24h,
    rateOrder,
    hasRatedOrder
  } = useP2P();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar';

  // State
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(getDefaultCountry());
  const [selectedTab, setSelectedTab] = useState<'buy' | 'sell' | 'orders'>('buy');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<P2POffer | null>(null);
  const [message, setMessage] = useState('');
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [activeChatView, setActiveChatView] = useState<P2PChat | null>(null);
  const [activeChatOrder, setActiveChatOrder] = useState<P2POrder | null>(null);
  const [showCompletedScreen, setShowCompletedScreen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate offers based on selected country
  const offers = generateOffersForCountry(selectedCountry);

  // Get all orders from chats
  const allOrders: P2POrder[] = chats.flatMap(chat => chat.orders);
  const orderListItems = allOrders.map(order => orderToListItem(order, user.id));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatView?.messages]);

  // Update order when chat changes
  useEffect(() => {
    if (activeChatView && activeChatOrder) {
      const updatedOrder = activeChatView.orders.find(o => o.id === activeChatOrder.id);
      if (updatedOrder && updatedOrder.status !== activeChatOrder.status) {
        setActiveChatOrder(updatedOrder);
        // Show completed screen when order is completed
        if (updatedOrder.status === 'completed') {
          setShowCompletedScreen(true);
        }
      }
    }
  }, [activeChatView, activeChatOrder]);

  const handleBuyFromOffer = (offer: P2POffer) => {
    // Check if user can create order
    const check = canCreateOrder();
    if (!check.allowed) {
      showError(check.reason || (isRTL ? 'لا يمكنك إنشاء طلب جديد' : 'Cannot create new order'));
      return;
    }
    
    setSelectedOffer(offer);
    setBuyDialogOpen(true);
  };

  const handleConfirmBuy = (amount: number, timeLimit: number) => {
    if (!selectedOffer) return;
    
    showSuccess(isRTL ? 'تم إنشاء الطلب!' : 'Order created!');
    setBuyDialogOpen(false);
    setSelectedOffer(null);
    setSelectedTab('orders');
  };

  const handleCreateOrder = (orderData: {
    type: 'buy' | 'sell';
    amount: number;
    timeLimit: number;
    paymentMethod: PaymentMethod;
    paymentDetails?: string;
  }) => {
    showSuccess(isRTL ? 'تم إنشاء الطلب!' : 'Order created!');
    setSelectedTab('orders');
  };

  const handleOpenCreateDialog = () => {
    // Check if user can create order
    const check = canCreateOrder();
    if (!check.allowed) {
      showError(check.reason || (isRTL ? 'لا يمكنك إنشاء طلب جديد' : 'Cannot create new order'));
      return;
    }
    setCreateDialogOpen(true);
  };

  const handleOpenChat = (orderId: string) => {
    // Find the chat containing this order
    const chat = chats.find(c => c.orders.some(o => o.id === orderId));
    const order = chat?.orders.find(o => o.id === orderId);
    
    if (chat && order) {
      setActiveChatView(chat);
      setActiveChatOrder(order);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() || !activeChatView) return;
    sendMessage(activeChatView.id, message);
    setMessage('');
  };

  const handleOrderCompleted = () => {
    setShowCompletedScreen(true);
  };

  const handleRateOrder = (isPositive: boolean) => {
    if (activeChatOrder) {
      rateOrder(activeChatOrder.id, isPositive);
      showSuccess(isRTL ? 'شكراً لتقييمك!' : 'Thanks for your rating!');
    }
  };

  const handleCloseCompletedScreen = () => {
    setShowCompletedScreen(false);
    setActiveChatView(null);
    setActiveChatOrder(null);
  };

  const handleViewOrderDetails = () => {
    if (activeChatOrder) {
      setShowCompletedScreen(true);
    }
  };

  // Order Completed Screen
  if (showCompletedScreen && activeChatOrder) {
    return (
      <P2POrderCompletedScreen
        order={activeChatOrder}
        currentUserId={user.id}
        onRate={handleRateOrder}
        onClose={handleCloseCompletedScreen}
        hasRated={hasRatedOrder(activeChatOrder.id)}
      />
    );
  }

  // P2P Chat View
  if (activeChatView && activeChatOrder) {
    const isBuyer = activeChatOrder.buyer.id === user.id;
    const counterparty = isBuyer ? activeChatOrder.seller : activeChatOrder.buyer;
    const isCompleted = activeChatOrder.status === 'completed';
    const isCancelled = activeChatOrder.status === 'cancelled';

    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3 shrink-0">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setActiveChatView(null);
              setActiveChatOrder(null);
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
              {counterparty.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {isRTL ? counterparty.nameAr : counterparty.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Star className="h-3 w-3 text-warning fill-warning" />
                <span>{(counterparty.rating * 20).toFixed(0)}%</span>
                <span>•</span>
                <span>#{activeChatOrder.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Card (Pinned at top) - Show compact for completed */}
        <div className="shrink-0 border-b border-border p-3">
          {isCompleted ? (
            <P2PCompactOrderCard 
              order={activeChatOrder}
              onViewDetails={handleViewOrderDetails}
            />
          ) : (
            <>
              <P2POrderCard 
                order={activeChatOrder} 
                isActive={true}
              />
              
              {/* Payment Details */}
              {activeChatOrder.paymentDetails && (
                <div className="mt-3">
                  <P2PPaymentCard 
                    paymentDetails={activeChatOrder.paymentDetails}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {activeChatView.messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
              >
                {msg.isSystem && msg.systemMessage ? (
                  <P2PSystemMessage 
                    message={msg.systemMessage}
                  />
                ) : (
                  <div className={`max-w-[85%]`}>
                    <div className={`px-4 py-2 rounded-2xl ${
                      msg.isMine 
                        ? 'bg-primary text-primary-foreground rounded-br-sm' 
                        : 'bg-muted rounded-bl-sm'
                    }`}>
                      {!msg.isMine && (
                        <p className="text-xs font-medium mb-1 opacity-70">
                          {msg.senderName}
                        </p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <p className={`text-[10px] text-muted-foreground mt-1 ${msg.isMine ? 'text-end' : ''}`}>
                      {msg.time}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Action Buttons based on status/role */}
        {!isCompleted && !isCancelled && (
          <P2PActionButtons 
            order={activeChatOrder}
            currentUserId={user.id}
            isSupport={false}
            onOrderCompleted={handleOrderCompleted}
          />
        )}

        {/* Message Input */}
        {!isCompleted && !isCancelled && (
          <div className="p-4 border-t border-border bg-card safe-bottom">
            <div className="flex items-center gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button size="icon" onClick={handleSendMessage} disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <ReceiptDialog
          receipt={selectedReceipt}
          open={receiptDialogOpen}
          onClose={() => setReceiptDialogOpen(false)}
        />
      </div>
    );
  }

  // Main P2P Page
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={t('p2p.title')} />
      <main className="flex-1 px-4 py-4 pb-20 space-y-4">
        {/* Blocked Warning */}
        {isBlockedFromOrders() && (
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  {isRTL ? 'محظور من إنشاء طلبات' : 'Blocked from creating orders'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isRTL 
                    ? 'تجاوزت حد الإلغاءات (3 في 24 ساعة). يرفع الحظر تلقائياً.'
                    : 'You exceeded the cancellation limit (3 in 24h). Block lifts automatically.'
                  }
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Open Order Warning */}
        {hasOpenOrder() && !isBlockedFromOrders() && (
          <Card className="p-4 bg-warning/10 border-warning/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning">
                  {isRTL ? 'لديك طلب مفتوح' : 'You have an open order'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isRTL 
                    ? 'أكمل الطلب الحالي أو ألغه قبل إنشاء طلب جديد.'
                    : 'Complete or cancel your current order before creating a new one.'
                  }
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Country Selector */}
        <P2PCountrySelector
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
          className="w-full"
        />

        {/* Price Info Card */}
        <Card className="p-3 bg-gradient-to-r from-nova/10 to-nova/5 border-nova/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {isRTL ? 'سعر Nova الرسمي' : 'Official Nova Price'}
            </span>
            <span className="font-bold text-nova">
              И 1 = {selectedCountry.currencySymbol} {selectedCountry.novaRate.toFixed(2)}
            </span>
          </div>
        </Card>

        {/* Main Tabs */}
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as typeof selectedTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="buy" className="gap-1">
              {isRTL ? 'شراء' : 'Buy'}
            </TabsTrigger>
            <TabsTrigger value="sell" className="gap-1">
              {isRTL ? 'بيع' : 'Sell'}
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1">
              {isRTL ? 'طلباتي' : 'Orders'}
              {orderListItems.filter(o => !['completed', 'cancelled'].includes(o.status)).length > 0 && (
                <Badge variant="secondary" className="ms-1 h-5 min-w-5 px-1 text-[10px]">
                  {orderListItems.filter(o => !['completed', 'cancelled'].includes(o.status)).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Buy Tab - Offers List */}
          <TabsContent value="buy" className="mt-4 space-y-3">
            <AnimatePresence mode="popLayout">
              {offers.map((offer, index) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <P2POfferCard
                    offer={offer}
                    onAction={handleBuyFromOffer}
                    actionType="buy"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </TabsContent>

          {/* Sell Tab */}
          <TabsContent value="sell" className="mt-4">
            <Card className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold mb-2">
                {isRTL ? 'بيع Nova الخاص بك' : 'Sell Your Nova'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isRTL 
                  ? 'أنشئ طلب بيع وسيتم حجز Nova في الضمان'
                  : 'Create a sell order and Nova will be locked in escrow'
                }
              </p>
              <Button 
                onClick={handleOpenCreateDialog} 
                className="gap-2"
                disabled={!canCreateOrder().allowed}
              >
                <Plus className="h-4 w-4" />
                {isRTL ? 'إنشاء طلب بيع' : 'Create Sell Order'}
              </Button>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-4">
            <P2POrdersList
              orders={orderListItems}
              onOpenChat={handleOpenChat}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs */}
      <P2PCreateOrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        country={selectedCountry}
        onCreateOrder={handleCreateOrder}
      />

      <P2PBuyDialog
        open={buyDialogOpen}
        onOpenChange={setBuyDialogOpen}
        offer={selectedOffer}
        onConfirm={handleConfirmBuy}
      />
      
      <BottomNav />
    </div>
  );
}

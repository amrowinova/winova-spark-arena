import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, ShoppingCart, Send, ArrowLeft,
  Star, AlertCircle, Loader2, Info
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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
import { useP2PMarketplace, MarketplaceOrder } from '@/hooks/useP2PMarketplace';
import { useP2PDatabase } from '@/hooks/useP2PDatabase';

import {
  p2pParticipantFromOfferUser,
  p2pParticipantFromUser,
  p2pPaymentDetailsFromOffer,
  p2pPaymentDetailsFromPaymentMethod,
  p2pPaymentDetailsFromSavedMethod,
  p2pPlaceholderParticipant,
} from '@/lib/p2pMockBuilders';

import {
  P2PCountrySelector,
  P2POfferCard,
  P2POrdersList,
  P2PCreateOrderDialog,
  P2PBuyDialog,
  P2PSellDialog,
  P2POrderCard,
  P2PPaymentCard,
  P2PSystemMessage,
  P2PCompactOrderCard,
  P2POrderCompletedScreen,
  P2PWaitingReleaseCard,
  P2PMarketplaceCard,
  CountryConfig,
  PaymentMethod,
  P2POffer,
  P2POrderListItem,
  SavedPaymentMethod,
  useP2PCountries,
} from '@/components/p2p';

import { P2POrder, P2POrderStatus, P2PChat, P2PMessage, useP2P } from '@/contexts/P2PContext';
import { P2PRoleBadge, P2PParticipantWithRole } from '@/components/p2p/P2PRoleBadge';
import { P2PStatusActions } from '@/components/p2p/P2PStatusActions';
import { P2PChatInput } from '@/components/p2p/P2PChatInput';
import { getP2PRoleInfoFromOrder } from '@/lib/p2pRoleUtils';

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

function P2PContent() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useUser();
  const { user: authUser } = useAuth();
  const { createTransaction } = useTransactions();
  
  // CRITICAL: Use auth UUID for P2P role comparisons, NOT profile.id
  // user.id = profile table PK, authUser.id = auth.users UUID
  // P2P participants store auth UUID, so we must compare with that
  const currentAuthUserId = authUser?.id || user.id;
  const { 
    chats, 
    sendMessage, 
    hasOpenOrder,
    canCreateOrder,
    isBlockedFromOrders,
    getCancellationsIn24h,
    rateOrder,
    hasRatedOrder,
    createOrder,
    deleteOrder,
    isCreatingOrder,
  } = useP2P();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar';

  // Get countries with live rates from app_settings
  const countries = useP2PCountries();

  // Default to user's profile country, fallback to first country
  const userCountryConfig = countries.find(c => c.name === user.country) || countries[0];

  // State - initialize with user's country
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig | null>(null);
  const [selectedTab, setSelectedTab] = useState<'buy' | 'sell' | 'orders'>('buy');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createOrderType, setCreateOrderType] = useState<'buy' | 'sell'>('buy');
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<P2POffer | null>(null);
  const [selectedMarketplaceOrder, setSelectedMarketplaceOrder] = useState<MarketplaceOrder | null>(null);
  const [message, setMessage] = useState('');
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [activeChatView, setActiveChatView] = useState<P2PChat | null>(null);
  const [activeChatOrder, setActiveChatOrder] = useState<P2POrder | null>(null);
  const [showCompletedScreen, setShowCompletedScreen] = useState(false);
  const [isExecutingOrder, setIsExecutingOrder] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use the live-rate country (selectedCountry or user's profile country)
  const currentCountry = selectedCountry || userCountryConfig;

  // Fetch real marketplace orders from database
  const { 
    buyOrders: marketplaceBuyOrders,    // Users want to buy Nova (you sell to them)
    sellOrders: marketplaceSellOrders,  // Users want to sell Nova (you buy from them)
    isLoading: isMarketplaceLoading,
    refetch: refetchMarketplace 
  } = useP2PMarketplace(currentCountry?.name);

  // Get database functions
  const db = useP2PDatabase();

  // Get all orders from chats
  const allOrders: P2POrder[] = chats.flatMap(chat => chat.orders);
  const orderListItems = allOrders.map(order => orderToListItem(order, currentAuthUserId));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatView?.messages]);

  // Sync activeChatView messages directly from db.messages when they update
  useEffect(() => {
    if (activeChatOrder && activeChatView) {
      const orderMessages = db.messages[activeChatOrder.id] || [];
      if (orderMessages.length > 0 && orderMessages.length !== activeChatView.messages.length) {
        // Convert DB messages to UI messages
        const uiMessages: P2PMessage[] = orderMessages.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          senderName: m.is_system_message ? 'System' : 'User',
          content: m.content,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMine: m.sender_id === currentAuthUserId,
          isSystem: m.is_system_message,
          systemMessage: m.is_system_message ? {
            id: m.id,
            type: m.message_type as any,
            content: m.content,
            contentAr: m.content_ar || m.content,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            orderId: m.order_id,
          } : undefined,
        }));
        
        setActiveChatView(prev => prev ? { ...prev, messages: uiMessages } : null);
      }
    }
  }, [db.messages, activeChatOrder?.id, activeChatView?.messages.length, currentAuthUserId]);

  // Sync activeChatView and activeChatOrder with chats state
  useEffect(() => {
    if (activeChatView) {
      // Find updated chat from chats
      const updatedChat = chats.find(c => c.id === activeChatView.id);
      if (updatedChat) {
        // Always sync the chat view to get latest messages
        if (updatedChat.messages.length !== activeChatView.messages.length) {
          setActiveChatView(updatedChat);
        }
        
        // Sync the order status
        if (activeChatOrder) {
          const updatedOrder = updatedChat.orders.find(o => o.id === activeChatOrder.id);
          if (updatedOrder && updatedOrder.status !== activeChatOrder.status) {
            setActiveChatOrder(updatedOrder);
            // Show completed screen when order is completed
            if (updatedOrder.status === 'completed') {
              setShowCompletedScreen(true);
            }
          }
        }
      }
    }
  }, [chats, activeChatView?.id, activeChatOrder?.id]);

  // Handle executing a marketplace order (match with existing order)
  const handleExecuteOrder = async (order: MarketplaceOrder) => {

    // Check if user can create/execute order
    const check = canCreateOrder();
    if (!check.allowed) {
      showError(check.reason || (isRTL ? 'لا يمكنك تنفيذ طلب جديد' : 'Cannot execute new order'));
      return;
    }

    setIsExecutingOrder(true);
    try {
      const result = await db.executeOrder(order.id);
      if (result.success) {
        showSuccess(isRTL ? 'تم تأكيد الطلب! جاري فتح المحادثة...' : 'Order matched! Opening chat...');
        
        await db.fetchOrders();
        refetchMarketplace();
        setSelectedTab('orders');
        
        setTimeout(() => {
          handleOpenChat(order.id);
        }, 500);
      } else {
        showError(result.error || (isRTL ? 'الطلب غير متاح أو تم تنفيذه من قبل شخص آخر' : 'Order unavailable or already taken by someone else'));
      }
    } catch (err) {
      console.error('Error executing order:', err);
      showError(isRTL ? 'حدث خطأ أثناء تنفيذ الطلب' : 'Error executing order');
    } finally {
      setIsExecutingOrder(false);
    }
  };

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

  const handleSellToOffer = (offer: P2POffer) => {
    // Check if user can create order
    const check = canCreateOrder();
    if (!check.allowed) {
      showError(check.reason || (isRTL ? 'لا يمكنك إنشاء طلب جديد' : 'Cannot create new order'));
      return;
    }
    
    setSelectedOffer(offer);
    setSellDialogOpen(true);
  };

  const handleConfirmBuy = async (amount: number, timeLimit: number) => {
    if (!selectedOffer) return;

    const buyer = p2pParticipantFromUser(user);
    const seller = p2pParticipantFromOfferUser(selectedOffer);
    const paymentDetails = p2pPaymentDetailsFromOffer(selectedOffer);

    const created = await createOrder({
      type: 'buy',
      amount,
      price: selectedOffer.price,
      total: amount * selectedOffer.price,
      currency: selectedOffer.currency,
      currencySymbol: selectedOffer.currencySymbol,
      seller,
      buyer,
      paymentDetails,
    });

    if (!created) {
      showError(isRTL ? 'فشل إنشاء الطلب. تحقق من رصيدك وحاول مرة أخرى.' : 'Order creation failed. Check your balance and try again.');
      return;
    }

    showSuccess(isRTL ? 'تم إنشاء الطلب!' : 'Order created!');
    setBuyDialogOpen(false);
    setSelectedOffer(null);
    setSelectedTab('orders');
  };

  const handleConfirmSell = async (amount: number, selectedPaymentMethod: SavedPaymentMethod) => {
    if (!selectedOffer) return;

    const seller = p2pParticipantFromUser(user);
    const buyer = p2pParticipantFromOfferUser(selectedOffer);
    const paymentDetails = p2pPaymentDetailsFromSavedMethod(selectedPaymentMethod);

    const created = await createOrder({
      type: 'sell',
      amount,
      price: selectedOffer.price,
      total: amount * selectedOffer.price,
      currency: selectedOffer.currency,
      currencySymbol: selectedOffer.currencySymbol,
      seller,
      buyer,
      paymentDetails,
    });

    if (!created) {
      showError(isRTL ? 'فشل إنشاء الطلب. تحقق من رصيدك وحاول مرة أخرى.' : 'Order creation failed. Check your balance and try again.');
      return;
    }

    showSuccess(isRTL ? 'تم إنشاء طلب البيع!' : 'Sell order created!');
    setSellDialogOpen(false);
    setSelectedOffer(null);
    setSelectedTab('orders');
  };

  const handleCreateOrder = async (orderData: {
    type: 'buy' | 'sell';
    amount: number;
    timeLimit: number;
    paymentMethod: PaymentMethod;
    savedPaymentMethod?: import('@/components/p2p').SavedPaymentMethod;
  }) => {
    const me = p2pParticipantFromUser(user);
    const counterpartyCountryName = currentCountry.name;

    const buyer =
      orderData.type === 'buy' ? me : p2pPlaceholderParticipant('buyer', counterpartyCountryName);
    const seller =
      orderData.type === 'sell' ? me : p2pPlaceholderParticipant('seller', counterpartyCountryName);

    const paymentAccountHolder =
      orderData.type === 'buy' ? (isRTL ? seller.nameAr : seller.name) : (isRTL ? me.nameAr : me.name);

    const paymentDetails = orderData.savedPaymentMethod
      ? p2pPaymentDetailsFromSavedMethod(orderData.savedPaymentMethod)
      : p2pPaymentDetailsFromPaymentMethod(orderData.paymentMethod, paymentAccountHolder);

    const created = await createOrder({
      type: orderData.type,
      amount: orderData.amount,
      price: currentCountry.novaRate,
      total: orderData.amount * currentCountry.novaRate,
      currency: currentCountry.currency,
      currencySymbol: currentCountry.currencySymbol,
      seller,
      buyer,
      paymentDetails,
    });

    if (!created) {
      showError(isRTL ? 'فشل إنشاء الطلب. تحقق من رصيدك وحاول مرة أخرى.' : 'Order creation failed. Check your balance and try again.');
      return;
    }

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
    // First try to find from P2PContext chats
    const chat = chats.find(c => c.orders.some(o => o.id === orderId));
    const order = chat?.orders.find(o => o.id === orderId);
    
    if (chat && order) {
      setActiveChatView(chat);
      setActiveChatOrder(order);
      // Fetch messages for this order
      db.fetchMessagesForOrder(orderId);
      return;
    }
    
    // If not found in context, try to find from db.orders directly
    // This handles the case right after execute when context hasn't updated yet
    const dbOrder = db.orders.find(o => o.id === orderId);
    if (dbOrder) {
      const participants = db.getParticipants(dbOrder);
      
      // Create a temporary chat view
      const tempBuyer: typeof participants.buyer = participants.buyer;
      const tempSeller: typeof participants.seller = participants.seller;
      
      const currency = { code: 'SAR', symbol: 'ر.س' }; // Default
      
      const tempOrder: P2POrder = {
        id: dbOrder.id,
        type: dbOrder.order_type,
        amount: Number(dbOrder.nova_amount),
        price: Number(dbOrder.exchange_rate),
        total: Number(dbOrder.local_amount),
        currency: currency.code,
        currencySymbol: currency.symbol,
        seller: tempSeller,
        buyer: tempBuyer,
        status: dbOrder.ui_status as P2POrderStatus,
        createdAt: new Date(dbOrder.created_at),
        expiresAt: dbOrder.matched_at 
          ? new Date(new Date(dbOrder.matched_at).getTime() + dbOrder.time_limit_minutes * 60 * 1000)
          : new Date(Date.now() + 60 * 60 * 1000),
        paymentDetails: {
          bankName: 'Bank Transfer',
          accountNumber: '****',
          accountHolder: tempSeller.name,
          isLocked: true,
        },
        disputeReason: dbOrder.cancellation_reason || undefined,
        supportJoined: dbOrder.status === 'disputed',
      };
      
      const tempChat: P2PChat = {
        id: `p2p-${orderId}`,
        participantIds: [tempBuyer.id, tempSeller.id],
        buyer: tempBuyer,
        seller: tempSeller,
        orders: [tempOrder],
        messages: [],
        createdAt: new Date(dbOrder.created_at),
        lastMessageTime: new Date(dbOrder.updated_at),
        unreadCount: 0,
        supportPresent: false,
      };
      
      setActiveChatView(tempChat);
      setActiveChatOrder(tempOrder);
      db.fetchMessagesForOrder(orderId);
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
        currentUserId={currentAuthUserId}
        onRate={handleRateOrder}
        onClose={handleCloseCompletedScreen}
        hasRated={hasRatedOrder(activeChatOrder.id)}
      />
    );
  }

  // P2P Chat View
  if (activeChatView && activeChatOrder) {
    // Get role info using unified utility
    const roleInfo = getP2PRoleInfoFromOrder(activeChatOrder, currentAuthUserId);
    const counterparty = roleInfo.isBuyer ? activeChatOrder.seller : activeChatOrder.buyer;
    const counterpartyRole = roleInfo.isBuyer ? 'seller' : 'buyer';
    
    const isCompleted = activeChatOrder.status === 'completed';
    const isCancelled = activeChatOrder.status === 'cancelled';
    const isReleased = activeChatOrder.status === 'released';

    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Header with Role Badges */}
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
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">
                  {isRTL ? counterparty.nameAr : counterparty.name}
                </p>
                {/* Counterparty role badge */}
                <P2PRoleBadge role={counterpartyRole} size="sm" />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Star className="h-3 w-3 text-warning fill-warning" />
                <span>{(counterparty.rating * 20).toFixed(0)}%</span>
                <span>•</span>
                <span>#{activeChatOrder.id.slice(0, 8)}</span>
              </div>
            </div>
            {/* My role badge */}
            <P2PRoleBadge role={roleInfo.myRole} isYou size="sm" />
          </div>
        </div>

        {/* Order Card (Pinned at top) - Show compact for completed */}
        <div className="shrink-0 border-b border-border p-3 space-y-3">
          {isCompleted ? (
            <P2PCompactOrderCard 
              order={activeChatOrder}
              onViewDetails={handleViewOrderDetails}
            />
          ) : (
            <>
              <P2POrderCard 
                order={activeChatOrder} 
                currentUserId={currentAuthUserId}
                isActive={true}
                onDeleteOrder={deleteOrder}
              />

              {/* Context Info Card — pinned above messages */}
              <Card className="p-3 bg-info/5 border-info/20">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
                  <p className="text-xs text-info">
                    {roleInfo.isBuyer
                      ? (isRTL
                        ? `ستدفع ${activeChatOrder.total.toFixed(2)} ${activeChatOrder.currencySymbol} وستتلقى И${activeChatOrder.amount.toFixed(0)} Nova من ${isRTL ? activeChatOrder.seller.nameAr : activeChatOrder.seller.name}`
                        : `You will pay ${activeChatOrder.currencySymbol} ${activeChatOrder.total.toFixed(2)} and receive И${activeChatOrder.amount.toFixed(0)} Nova from ${activeChatOrder.seller.name}`)
                      : (isRTL
                        ? `سيدفع ${isRTL ? activeChatOrder.buyer.nameAr : activeChatOrder.buyer.name} لك ${activeChatOrder.total.toFixed(2)} ${activeChatOrder.currencySymbol} مقابل И${activeChatOrder.amount.toFixed(0)} Nova`
                        : `${activeChatOrder.buyer.name} will pay you ${activeChatOrder.currencySymbol} ${activeChatOrder.total.toFixed(2)} for И${activeChatOrder.amount.toFixed(0)} Nova`)
                    }
                  </p>
                </div>
              </Card>
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

        {/* Action Buttons based on status/role - Using unified component */}
        {!isCompleted && !isCancelled && !isReleased && (
          <P2PStatusActions 
            order={activeChatOrder}
            currentUserId={currentAuthUserId}
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
          selectedCountry={currentCountry}
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
              И 1 = {currentCountry.currencySymbol} {currentCountry.novaRate.toFixed(2)}
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

          {/* Buy Tab - Real marketplace orders (users selling Nova, you can buy) */}
          <TabsContent value="buy" className="mt-4 space-y-3">
            {/* Create Buy Order Button - Always visible */}
            <Button 
              className="w-full bg-success hover:bg-success/90 text-success-foreground gap-2"
              onClick={() => {
                const check = canCreateOrder();
                if (!check.allowed) {
                  showError(check.reason || (isRTL ? 'لا يمكنك إنشاء طلب جديد' : 'Cannot create new order'));
                  return;
                }
                setCreateOrderType('buy');
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {isRTL ? 'إنشاء طلب شراء' : 'Create Buy Order'}
            </Button>

            {isMarketplaceLoading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'جاري تحميل العروض...' : 'Loading offers...'}
                </p>
              </div>
            ) : marketplaceSellOrders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground mb-2">
                  {isRTL ? 'لا توجد عروض بيع متاحة حالياً' : 'No sell offers available'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'يمكنك إنشاء طلب شراء وانتظار البائعين' : 'You can create a buy order and wait for sellers'}
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {marketplaceSellOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <P2PMarketplaceCard
                      order={order}
                      onExecute={handleExecuteOrder}
                      actionType="buy"
                      isExecuting={isExecutingOrder}
                      isCountryMatch={order.country === user.country}
                      isOwnOrder={order.isOwnOrder}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </TabsContent>

          {/* Sell Tab - Real marketplace orders (users buying Nova, you can sell) */}
          <TabsContent value="sell" className="mt-4 space-y-3">
            {/* Create Sell Order Button - Always visible */}
            <Button 
              className="w-full gap-2"
              onClick={() => {
                const check = canCreateOrder();
                if (!check.allowed) {
                  showError(check.reason || (isRTL ? 'لا يمكنك إنشاء طلب جديد' : 'Cannot create new order'));
                  return;
                }
                setCreateOrderType('sell');
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {isRTL ? 'إنشاء طلب بيع' : 'Create Sell Order'}
            </Button>

            {isMarketplaceLoading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'جاري تحميل الطلبات...' : 'Loading requests...'}
                </p>
              </div>
            ) : marketplaceBuyOrders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Send className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground mb-2">
                  {isRTL ? 'لا توجد طلبات شراء متاحة حالياً' : 'No buy requests available'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'يمكنك إنشاء طلب بيع وانتظار المشترين' : 'You can create a sell order and wait for buyers'}
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {marketplaceBuyOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <P2PMarketplaceCard
                      order={order}
                      onExecute={handleExecuteOrder}
                      actionType="sell"
                      isExecuting={isExecutingOrder}
                      isCountryMatch={order.country === user.country}
                      isOwnOrder={order.isOwnOrder}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </TabsContent>


          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-4">
            <P2POrdersList
              orders={orderListItems}
              onOpenChat={handleOpenChat}
              onDeleteOrder={async (orderId) => {
                const result = await deleteOrder(orderId);
                return result.success;
              }}
              currentUserId={user?.id}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs */}
      <P2PCreateOrderDialog
        open={createDialogOpen}
        onOpenChange={(open) => !isCreatingOrder && setCreateDialogOpen(open)}
        country={currentCountry}
        initialOrderType={createOrderType}
        onCreateOrder={handleCreateOrder}
        isSubmitting={isCreatingOrder}
      />

      <P2PBuyDialog
        open={buyDialogOpen}
        onOpenChange={(open) => !isCreatingOrder && setBuyDialogOpen(open)}
        offer={selectedOffer}
        onConfirm={handleConfirmBuy}
        isSubmitting={isCreatingOrder}
      />

      <P2PSellDialog
        open={sellDialogOpen}
        onOpenChange={(open) => !isCreatingOrder && setSellDialogOpen(open)}
        offer={selectedOffer}
        onConfirm={handleConfirmSell}
        isSubmitting={isCreatingOrder}
      />
      
      <BottomNav />
    </div>
  );
}

export default function P2PPage() {
  return <P2PContent />;
}

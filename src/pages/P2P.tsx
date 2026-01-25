import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, Plus, Clock, CheckCircle, AlertCircle, 
  ChevronRight, Send, ArrowLeft, Copy, Timer, X
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CurrencyBadge } from '@/components/common/CurrencyBadge';
import { ReceiptDialog } from '@/components/common/ReceiptCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useTransactions, getPricing, Receipt } from '@/contexts/TransactionContext';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { toast } from 'sonner';

type OrderStatus = 'open' | 'accepted' | 'paid' | 'released' | 'disputed' | 'cancelled';

interface P2POrder {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  currency: string;
  seller: { id: string; name: string; username: string; avatar: string; rating: number; country: string };
  buyer?: { id: string; name: string; username: string; avatar: string; rating: number; country: string };
  status: OrderStatus;
  createdAt: Date;
  expiresAt: Date;
  paymentDetails?: string;
  messages: P2PMessage[];
  receipt?: Receipt;
}

interface P2PMessage {
  id: string;
  sender: string;
  senderId: string;
  content: string;
  time: string;
  isMine: boolean;
  isSystem?: boolean;
  systemType?: 'status' | 'payment' | 'release';
}

// Mock P2P orders
const initialOrders: P2POrder[] = [
  {
    id: 'P2P-1234',
    type: 'buy',
    amount: 100,
    price: 3.75,
    total: 375,
    currency: 'SAR',
    seller: { id: '2', name: 'خالد محمد', username: 'khalid_m', avatar: '👨', rating: 4.8, country: 'Saudi Arabia' },
    buyer: { id: '1', name: 'أحمد', username: 'ahmed_sa', avatar: '👤', rating: 4.9, country: 'Saudi Arabia' },
    status: 'paid',
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    paymentDetails: 'بنك الراجحي - SA0000000000000000000',
    messages: [
      { id: 'pm1', sender: 'System', senderId: 'system', content: 'تم قبول الطلب', time: '10:00 AM', isMine: false, isSystem: true, systemType: 'status' },
      { id: 'pm2', sender: 'خالد محمد', senderId: '2', content: 'مرحباً، حوّل على الحساب البنكي', time: '10:05 AM', isMine: false },
      { id: 'pm3', sender: 'أنت', senderId: '1', content: 'تم التحويل', time: '10:15 AM', isMine: true },
      { id: 'pm4', sender: 'System', senderId: 'system', content: 'تم تأكيد الدفع من المشتري', time: '10:16 AM', isMine: false, isSystem: true, systemType: 'payment' },
    ],
  },
  {
    id: 'P2P-1235',
    type: 'sell',
    amount: 50,
    price: 3.70,
    total: 185,
    currency: 'SAR',
    seller: { id: '1', name: 'أحمد', username: 'ahmed_sa', avatar: '👤', rating: 4.9, country: 'Saudi Arabia' },
    status: 'open',
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
    messages: [],
  },
];

// Available listings
const listings: P2POrder[] = [
  {
    id: 'L-001',
    type: 'sell',
    seller: { id: '3', name: 'محمد كريم', username: 'mohammed_k', avatar: '👨', rating: 4.9, country: 'Saudi Arabia' },
    amount: 500,
    price: 3.75,
    total: 1875,
    currency: 'SAR',
    status: 'open',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    messages: [],
  },
  {
    id: 'L-002',
    type: 'sell',
    seller: { id: '4', name: 'ليلى حسن', username: 'layla_h', avatar: '👩', rating: 4.8, country: 'Egypt' },
    amount: 300,
    price: 30.90,
    total: 9270,
    currency: 'EGP',
    status: 'open',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    messages: [],
  },
];

const statusLabels: Record<OrderStatus, { en: string; ar: string; color: string }> = {
  open: { en: 'Open', ar: 'مفتوح', color: 'bg-primary/20 text-primary' },
  accepted: { en: 'Accepted', ar: 'مقبول', color: 'bg-warning/20 text-warning' },
  paid: { en: 'Paid', ar: 'تم الدفع', color: 'bg-accent/20 text-accent' },
  released: { en: 'Released', ar: 'تم الإصدار', color: 'bg-success/20 text-success' },
  disputed: { en: 'Disputed', ar: 'متنازع', color: 'bg-destructive/20 text-destructive' },
  cancelled: { en: 'Cancelled', ar: 'ملغي', color: 'bg-muted text-muted-foreground' },
};

export default function P2PPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user, addNova, spendNova } = useUser();
  const { createTransaction } = useTransactions();
  
  const [selectedTab, setSelectedTab] = useState('buy');
  const [orders, setOrders] = useState<P2POrder[]>(initialOrders);
  const [activeOrder, setActiveOrder] = useState<P2POrder | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<P2POrder | null>(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [message, setMessage] = useState('');
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  
  // Create order form
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('sell');
  const [orderAmount, setOrderAmount] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeOrder?.messages]);

  const pricing = getPricing(user.country);

  const handleBuyFromListing = (listing: P2POrder) => {
    setSelectedListing(listing);
    setBuyDialogOpen(true);
  };

  const handleConfirmBuy = () => {
    if (!selectedListing || !buyAmount) return;
    
    const amount = parseFloat(buyAmount);
    const newOrder: P2POrder = {
      ...selectedListing,
      id: `P2P-${Date.now()}`,
      amount,
      total: amount * selectedListing.price,
      buyer: { 
        id: user.id, 
        name: user.name, 
        username: `${user.name.toLowerCase()}_user`, 
        avatar: '👤', 
        rating: 4.9, 
        country: user.country 
      },
      status: 'accepted',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      messages: [
        {
          id: 'sys-1',
          sender: 'System',
          senderId: 'system',
          content: language === 'ar' ? 'تم إنشاء الطلب وقبوله' : 'Order created and accepted',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMine: false,
          isSystem: true,
          systemType: 'status',
        },
      ],
    };

    setOrders(prev => [newOrder, ...prev]);
    setActiveOrder(newOrder);
    setBuyDialogOpen(false);
    setBuyAmount('');
    setSelectedListing(null);
    
    toast.success(language === 'ar' ? 'تم إنشاء الطلب!' : 'Order created!');
  };

  const handleCreateOrder = () => {
    if (!orderAmount || !orderPrice) return;
    
    const amount = parseFloat(orderAmount);
    const price = parseFloat(orderPrice);
    
    if (orderType === 'sell' && amount > user.novaBalance) {
      toast.error(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      return;
    }

    const newOrder: P2POrder = {
      id: `P2P-${Date.now()}`,
      type: orderType,
      amount,
      price,
      total: amount * price,
      currency: pricing.currency,
      seller: orderType === 'sell' 
        ? { id: user.id, name: user.name, username: `${user.name.toLowerCase()}_user`, avatar: '👤', rating: 4.9, country: user.country }
        : { id: '', name: '', username: '', avatar: '', rating: 0, country: '' },
      status: 'open',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      paymentDetails: orderType === 'sell' ? paymentDetails : undefined,
      messages: [],
    };

    setOrders(prev => [newOrder, ...prev]);
    setCreateDialogOpen(false);
    setOrderAmount('');
    setOrderPrice('');
    setPaymentDetails('');
    
    toast.success(language === 'ar' ? 'تم إنشاء الطلب!' : 'Order created!');
  };

  const handleSendMessage = () => {
    if (!message.trim() || !activeOrder) return;
    
    const newMessage: P2PMessage = {
      id: `msg-${Date.now()}`,
      sender: user.name,
      senderId: user.id,
      content: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
    };

    setOrders(prev => 
      prev.map(o => 
        o.id === activeOrder.id 
          ? { ...o, messages: [...o.messages, newMessage] }
          : o
      )
    );
    
    setActiveOrder(prev => 
      prev ? { ...prev, messages: [...prev.messages, newMessage] } : prev
    );
    
    setMessage('');
  };

  const handleConfirmPayment = () => {
    if (!activeOrder) return;

    const sysMessage: P2PMessage = {
      id: `sys-${Date.now()}`,
      sender: 'System',
      senderId: 'system',
      content: language === 'ar' ? 'تم تأكيد الدفع من المشتري' : 'Payment confirmed by buyer',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: false,
      isSystem: true,
      systemType: 'payment',
    };

    setOrders(prev => 
      prev.map(o => 
        o.id === activeOrder.id 
          ? { ...o, status: 'paid' as OrderStatus, messages: [...o.messages, sysMessage] }
          : o
      )
    );
    
    setActiveOrder(prev => 
      prev ? { ...prev, status: 'paid', messages: [...prev.messages, sysMessage] } : prev
    );

    toast.success(language === 'ar' ? 'تم تأكيد الدفع' : 'Payment confirmed');
  };

  const handleRelease = () => {
    if (!activeOrder) return;

    // Create receipt
    const receipt = createTransaction({
      type: activeOrder.type === 'buy' ? 'p2p_buy' : 'p2p_sell',
      status: 'completed',
      amount: activeOrder.amount,
      currency: 'nova',
      sender: {
        id: activeOrder.seller.id,
        name: activeOrder.seller.name,
        username: activeOrder.seller.username,
        country: activeOrder.seller.country,
      },
      receiver: activeOrder.buyer ? {
        id: activeOrder.buyer.id,
        name: activeOrder.buyer.name,
        username: activeOrder.buyer.username,
        country: activeOrder.buyer.country,
      } : undefined,
      reason: language === 'ar' 
        ? `صفقة P2P #${activeOrder.id}`
        : `P2P Trade #${activeOrder.id}`,
      p2pOrderId: activeOrder.id,
    });

    // Update balance
    if (activeOrder.type === 'buy' && activeOrder.buyer?.id === user.id) {
      addNova(activeOrder.amount);
    }

    const sysMessage: P2PMessage = {
      id: `sys-${Date.now()}`,
      sender: 'System',
      senderId: 'system',
      content: language === 'ar' 
        ? `✅ تم إصدار ${activeOrder.amount.toFixed(3)} Nova بنجاح!`
        : `✅ Released ${activeOrder.amount.toFixed(3)} Nova successfully!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: false,
      isSystem: true,
      systemType: 'release',
    };

    setOrders(prev => 
      prev.map(o => 
        o.id === activeOrder.id 
          ? { ...o, status: 'released' as OrderStatus, messages: [...o.messages, sysMessage], receipt }
          : o
      )
    );
    
    setActiveOrder(prev => 
      prev ? { ...prev, status: 'released', messages: [...prev.messages, sysMessage], receipt } : prev
    );

    setSelectedReceipt(receipt);
    setReceiptDialogOpen(true);

    toast.success(language === 'ar' ? 'تم إصدار Nova بنجاح!' : 'Nova released successfully!');
  };

  // Active Order Chat View
  if (activeOrder) {
    const isBuyer = activeOrder.buyer?.id === user.id;
    const isSeller = activeOrder.seller.id === user.id;

    return (
      <AppLayout title={`P2P #${activeOrder.id}`} showNav={false}>
        <div className="flex flex-col h-[calc(100vh-60px)]">
          {/* Header */}
          <div className="px-4 py-2 border-b border-border bg-card flex items-center gap-3 shrink-0">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setActiveOrder(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <p className="font-medium">
                {activeOrder.type === 'buy' ? (language === 'ar' ? 'شراء' : 'Buy') : (language === 'ar' ? 'بيع' : 'Sell')} Nova
              </p>
              <p className="text-xs text-muted-foreground">#{activeOrder.id}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabels[activeOrder.status].color}`}>
              {language === 'ar' ? statusLabels[activeOrder.status].ar : statusLabels[activeOrder.status].en}
            </span>
          </div>

          {/* Order Card (Fixed at top) */}
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <div className="grid grid-cols-3 gap-3 text-center mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Nova</p>
                <p className="font-bold text-lg text-nova">
                  {activeOrder.amount.toFixed(3)} ✦
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'السعر' : 'Price'}</p>
                <p className="font-bold">{pricing.symbol} {activeOrder.price}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}</p>
                <p className="font-bold text-success">{pricing.symbol} {activeOrder.total.toFixed(2)}</p>
              </div>
            </div>

            {/* Timer */}
            {activeOrder.status !== 'released' && activeOrder.status !== 'cancelled' && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <Timer className="h-4 w-4 text-warning" />
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'الوقت المتبقي:' : 'Time remaining:'}
                </span>
                <CountdownTimer targetDate={activeOrder.expiresAt} size="sm" showLabels={false} />
              </div>
            )}

            {/* Payment Details */}
            {activeOrder.paymentDetails && activeOrder.status !== 'released' && (
              <div className="mt-3 p-2 bg-card rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'بيانات الدفع' : 'Payment Details'}
                    </p>
                    <p className="text-sm font-mono">{activeOrder.paymentDetails}</p>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(activeOrder.paymentDetails || '');
                      toast.success(language === 'ar' ? 'تم النسخ' : 'Copied');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {activeOrder.messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%]`}>
                    {msg.isSystem ? (
                      <div className={`px-4 py-3 rounded-xl border ${
                        msg.systemType === 'release' 
                          ? 'bg-success/10 border-success/30 text-success'
                          : msg.systemType === 'payment'
                            ? 'bg-nova/10 border-nova/30 text-nova'
                            : 'bg-primary/10 border-primary/30 text-primary'
                      }`}>
                        <p className="text-sm font-medium">{msg.content}</p>
                      </div>
                    ) : (
                      <div className={`px-4 py-2 rounded-2xl ${
                        msg.isMine 
                          ? 'bg-primary text-primary-foreground rounded-br-sm' 
                          : 'bg-muted rounded-bl-sm'
                      }`}>
                        {!msg.isMine && (
                          <p className="text-xs font-medium mb-1 opacity-70">{msg.sender}</p>
                        )}
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    )}
                    <p className={`text-[10px] text-muted-foreground mt-1 ${msg.isMine ? 'text-end' : ''}`}>
                      {msg.time}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Actions & Input */}
          <div className="p-4 border-t border-border bg-card safe-bottom space-y-3">
            {/* Action Buttons based on status */}
            {activeOrder.status === 'accepted' && isBuyer && (
              <Button 
                className="w-full bg-gradient-nova text-nova-foreground"
                onClick={handleConfirmPayment}
              >
                <CheckCircle className="h-4 w-4 me-2" />
                {language === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment'}
              </Button>
            )}

            {activeOrder.status === 'paid' && isSeller && (
              <Button 
                className="w-full bg-success text-success-foreground"
                onClick={handleRelease}
              >
                <CheckCircle className="h-4 w-4 me-2" />
                {language === 'ar' ? 'إصدار Nova' : 'Release Nova'}
              </Button>
            )}

            {activeOrder.status === 'released' && activeOrder.receipt && (
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => {
                  setSelectedReceipt(activeOrder.receipt!);
                  setReceiptDialogOpen(true);
                }}
              >
                {language === 'ar' ? 'عرض الإيصال' : 'View Receipt'}
              </Button>
            )}

            {/* Message Input */}
            {activeOrder.status !== 'released' && activeOrder.status !== 'cancelled' && (
              <div className="flex items-center gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={language === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button size="icon" onClick={handleSendMessage} disabled={!message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <ReceiptDialog
          receipt={selectedReceipt}
          open={receiptDialogOpen}
          onClose={() => setReceiptDialogOpen(false)}
        />
      </AppLayout>
    );
  }

  // Main P2P Page
  return (
    <AppLayout title={t('p2p.title')}>
      <div className="px-4 py-4 space-y-5">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{t('p2p.title')}</h1>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {language === 'ar' ? 'إنشاء طلب' : 'Create Order'}
          </Button>
        </div>

        {/* Price Info */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {language === 'ar' ? 'سعر Nova الرسمي' : 'Official Nova Price'}
            </span>
            <span className="font-bold text-primary">
              1 ✦ = {pricing.symbol} {pricing.novaRate.toFixed(2)} {pricing.currency}
            </span>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="buy">
              {language === 'ar' ? 'شراء Nova' : 'Buy Nova'}
            </TabsTrigger>
            <TabsTrigger value="sell">
              {language === 'ar' ? 'بيع Nova' : 'Sell Nova'}
            </TabsTrigger>
            <TabsTrigger value="orders">
              {language === 'ar' ? 'طلباتي' : 'My Orders'}
            </TabsTrigger>
          </TabsList>

          {/* Buy Tab */}
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
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                        {listing.seller.avatar}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{listing.seller.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>⭐ {listing.seller.rating}</span>
                          <span>•</span>
                          <span>{listing.seller.country}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{language === 'ar' ? 'السعر' : 'Price'}</p>
                        <p className="text-lg font-bold text-success">
                          {getPricing(listing.seller.country).symbol} {listing.price}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{language === 'ar' ? 'متاح' : 'Available'}</p>
                        <p className="text-lg font-bold">
                          {listing.amount} <span className="text-nova">✦</span>
                        </p>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-success text-success-foreground"
                      onClick={() => handleBuyFromListing(listing)}
                    >
                      {language === 'ar' ? 'شراء Nova' : 'Buy Nova'}
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
              <p className="text-muted-foreground mb-4">
                {language === 'ar' ? 'أنشئ طلب بيع لعرض Nova الخاص بك' : 'Create a sell order to list your Nova'}
              </p>
              <Button onClick={() => { setOrderType('sell'); setCreateDialogOpen(true); }}>
                <Plus className="h-4 w-4 me-2" />
                {language === 'ar' ? 'إنشاء طلب بيع' : 'Create Sell Order'}
              </Button>
            </Card>
          </TabsContent>

          {/* My Orders Tab */}
          <TabsContent value="orders" className="mt-4 space-y-3">
            {orders.length === 0 ? (
              <Card className="p-8 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'لا توجد طلبات' : 'No orders'}
                </p>
              </Card>
            ) : (
              orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setActiveOrder(order)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            order.type === 'buy' ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
                          }`}>
                            {order.type === 'buy' ? (language === 'ar' ? 'شراء' : 'BUY') : (language === 'ar' ? 'بيع' : 'SELL')}
                          </span>
                          <span className="text-sm text-muted-foreground">#{order.id}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabels[order.status].color}`}>
                          {language === 'ar' ? statusLabels[order.status].ar : statusLabels[order.status].en}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-lg text-nova">
                            {order.amount.toFixed(3)} ✦
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {pricing.symbol} {order.total.toFixed(2)}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Create Order Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === 'ar' ? 'إنشاء طلب' : 'Create Order'}
              </DialogTitle>
              <DialogDescription>
                {language === 'ar' ? 'أنشئ طلب شراء أو بيع Nova' : 'Create a buy or sell order for Nova'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={orderType === 'buy' ? 'default' : 'outline'} 
                  className="h-12"
                  onClick={() => setOrderType('buy')}
                >
                  {language === 'ar' ? 'شراء Nova' : 'Buy Nova'}
                </Button>
                <Button 
                  variant={orderType === 'sell' ? 'default' : 'outline'} 
                  className="h-12"
                  onClick={() => setOrderType('sell')}
                >
                  {language === 'ar' ? 'بيع Nova' : 'Sell Nova'}
                </Button>
              </div>

              {orderType === 'sell' && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'رصيدك:' : 'Your balance:'} <span className="font-bold text-nova">{user.novaBalance.toFixed(3)} ✦</span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الكمية' : 'Amount'}</Label>
                <Input 
                  type="number" 
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  placeholder="100" 
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'السعر لكل Nova' : 'Price per Nova'} ({pricing.currency})</Label>
                <Input 
                  type="number" 
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(e.target.value)}
                  placeholder={pricing.novaRate.toString()} 
                />
              </div>

              {orderType === 'sell' && (
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'بيانات الدفع' : 'Payment Details'}</Label>
                  <Input 
                    value={paymentDetails}
                    onChange={(e) => setPaymentDetails(e.target.value)}
                    placeholder={language === 'ar' ? 'رقم الحساب البنكي...' : 'Bank account number...'}
                  />
                </div>
              )}

              {orderAmount && orderPrice && (
                <div className="p-3 bg-success/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}</p>
                  <p className="text-2xl font-bold text-success">
                    {pricing.symbol} {(parseFloat(orderAmount) * parseFloat(orderPrice)).toFixed(2)}
                  </p>
                </div>
              )}

              <Button 
                className="w-full"
                onClick={handleCreateOrder}
                disabled={!orderAmount || !orderPrice || (orderType === 'sell' && parseFloat(orderAmount) > user.novaBalance)}
              >
                {language === 'ar' ? 'إنشاء الطلب' : 'Create Order'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Buy Dialog */}
        <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'شراء Nova' : 'Buy Nova'}</DialogTitle>
              <DialogDescription>
                {language === 'ar' ? 'شراء من' : 'Buy from'} {selectedListing?.seller.name}
              </DialogDescription>
            </DialogHeader>
            
            {selectedListing && (
              <div className="space-y-4">
                <Card className="p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">{language === 'ar' ? 'تفاصيل الطلب' : 'Order Details'}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'السعر' : 'Price'}</span>
                      <span className="font-medium">
                        {getPricing(selectedListing.seller.country).symbol} {selectedListing.price} / Nova
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'ar' ? 'متاح' : 'Available'}</span>
                      <span>{selectedListing.amount} Nova</span>
                    </div>
                  </div>
                </Card>

                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الكمية' : 'Amount'} (Nova)</Label>
                  <Input 
                    type="number" 
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder={`1 - ${selectedListing.amount}`}
                    max={selectedListing.amount}
                  />
                </div>

                {buyAmount && (
                  <div className="p-3 bg-success/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'ستدفع' : 'You will pay'}</p>
                    <p className="text-2xl font-bold text-success">
                      {getPricing(selectedListing.seller.country).symbol} {(parseFloat(buyAmount) * selectedListing.price).toFixed(2)}
                    </p>
                  </div>
                )}

                <Button 
                  className="w-full bg-success text-success-foreground"
                  disabled={!buyAmount || parseFloat(buyAmount) > selectedListing.amount || parseFloat(buyAmount) <= 0}
                  onClick={handleConfirmBuy}
                >
                  {language === 'ar' ? 'شراء' : 'Buy'} {buyAmount || 0} Nova
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <ReceiptDialog
          receipt={selectedReceipt}
          open={receiptDialogOpen}
          onClose={() => setReceiptDialogOpen(false)}
        />
      </div>
    </AppLayout>
  );
}

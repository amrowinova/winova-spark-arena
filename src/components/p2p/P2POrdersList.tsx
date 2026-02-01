import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ChevronRight,
  Timer,
  Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { CountdownTimer } from '@/components/common/CountdownTimer';

export type OrderStatusFilter = 'active' | 'completed' | 'cancelled' | 'dispute';

export interface P2POrderListItem {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  currency: string;
  currencySymbol: string;
  status: 'created' | 'waiting_payment' | 'paid' | 'released' | 'completed' | 'dispute' | 'cancelled' | 'expired';
  counterparty: {
    name: string;
    nameAr: string;
    avatar: string;
  };
  createdAt: Date;
  expiresAt: Date;
}

const statusConfig: Record<P2POrderListItem['status'], { 
  en: string; 
  ar: string; 
  color: string;
  icon: React.ElementType;
}> = {
  created: { 
    en: 'Open in Market', 
    ar: 'مفتوح في السوق', 
    color: 'bg-info/20 text-info',
    icon: Clock,
  },
  waiting_payment: { 
    en: 'Awaiting Payment', 
    ar: 'بانتظار الدفع', 
    color: 'bg-warning/20 text-warning',
    icon: Timer,
  },
  paid: { 
    en: 'Paid', 
    ar: 'مدفوع', 
    color: 'bg-nova/20 text-nova',
    icon: CheckCircle2,
  },
  released: { 
    en: 'Released', 
    ar: 'تم التحرير', 
    color: 'bg-success/20 text-success',
    icon: CheckCircle2,
  },
  completed: { 
    en: 'Completed', 
    ar: 'مكتمل', 
    color: 'bg-success/20 text-success',
    icon: CheckCircle2,
  },
  dispute: { 
    en: 'Support Review', 
    ar: 'مراجعة الدعم', 
    color: 'bg-destructive/20 text-destructive',
    icon: AlertTriangle,
  },
  cancelled: { 
    en: 'Cancelled', 
    ar: 'ملغي', 
    color: 'bg-muted text-muted-foreground',
    icon: XCircle,
  },
  expired: { 
    en: 'Expired', 
    ar: 'منتهي', 
    color: 'bg-muted text-muted-foreground',
    icon: XCircle,
  },
};

const filterToStatuses: Record<OrderStatusFilter, P2POrderListItem['status'][]> = {
  active: ['created', 'waiting_payment', 'paid'],
  completed: ['released', 'completed'],
  cancelled: ['cancelled', 'expired'],
  dispute: ['dispute'],
};

interface P2POrdersListProps {
  orders: P2POrderListItem[];
  onOpenChat: (orderId: string) => void;
  onDeleteOrder?: (orderId: string) => boolean | Promise<boolean>;
  onCancelOrder?: (orderId: string, reason: string) => void;
  currentUserId?: string;
}

export function P2POrdersList({ orders, onOpenChat, onDeleteOrder, onCancelOrder, currentUserId }: P2POrdersListProps) {
  const { language } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<OrderStatusFilter>('active');
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const isRTL = language === 'ar';

  const filteredOrders = orders.filter(order => 
    filterToStatuses[activeFilter].includes(order.status)
  );

  const getOrderCount = (filter: OrderStatusFilter) => {
    return orders.filter(o => filterToStatuses[filter].includes(o.status)).length;
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as OrderStatusFilter)}>
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger value="active" className="text-xs py-2 px-1">
            {isRTL ? 'نشط' : 'Active'}
            {getOrderCount('active') > 0 && (
              <Badge variant="secondary" className="ms-1 h-5 min-w-5 px-1 text-[10px]">
                {getOrderCount('active')}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs py-2 px-1">
            {isRTL ? 'مكتمل' : 'Completed'}
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs py-2 px-1">
            {isRTL ? 'ملغي' : 'Cancelled'}
          </TabsTrigger>
          <TabsTrigger value="dispute" className="text-xs py-2 px-1">
            {isRTL ? 'نزاع' : 'Dispute'}
            {getOrderCount('dispute') > 0 && (
              <Badge variant="destructive" className="ms-1 h-5 min-w-5 px-1 text-[10px]">
                {getOrderCount('dispute')}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="mt-4">
          <AnimatePresence mode="popLayout">
            {filteredOrders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  {activeFilter === 'active' && <Clock className="h-8 w-8 text-muted-foreground/50" />}
                  {activeFilter === 'completed' && <CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />}
                  {activeFilter === 'cancelled' && <XCircle className="h-8 w-8 text-muted-foreground/50" />}
                  {activeFilter === 'dispute' && <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />}
                </div>
                <p className="text-muted-foreground">
                  {isRTL ? 'لا توجد طلبات' : 'No orders'}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order, index) => {
                  const config = statusConfig[order.status];
                  const StatusIcon = config.icon;
                  const isActive = filterToStatuses['active'].includes(order.status);

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={cn(
                        "overflow-hidden transition-colors",
                        order.status === 'dispute' && "border-destructive/50"
                      )}>
                        <CardContent className="p-4">
                          {/* Header Row */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline"
                                className={cn(
                                  "font-semibold",
                                  order.type === 'buy' 
                                    ? "border-success/50 text-success" 
                                    : "border-primary/50 text-primary"
                                )}
                              >
                                {order.type === 'buy' 
                                  ? (isRTL ? 'شراء' : 'BUY') 
                                  : (isRTL ? 'بيع' : 'SELL')
                                }
                              </Badge>
                              <span className="text-xs font-mono text-muted-foreground">
                                #{order.id}
                              </span>
                            </div>
                            <Badge className={cn("gap-1", config.color)}>
                              <StatusIcon className="h-3 w-3" />
                              {isRTL ? config.ar : config.en}
                            </Badge>
                          </div>

                          {/* Content Row */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                              {order.counterparty.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {isRTL ? order.counterparty.nameAr : order.counterparty.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                <span className="text-nova font-bold">И {order.amount}</span>
                                <span className="mx-1">•</span>
                                <span className="mx-1">•</span>
                                <span className="text-success font-semibold">
                                  {order.currencySymbol} {order.total.toFixed(2)}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Timer for active MATCHED orders ONLY - not for 'created' */}
                          {isActive && order.status !== 'created' && new Date() < order.expiresAt && (
                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg mb-3">
                              <Timer className="h-4 w-4 text-warning" />
                              <span className="text-xs text-muted-foreground">
                                {isRTL ? 'الوقت المتبقي:' : 'Time left:'}
                              </span>
                              <CountdownTimer 
                                targetDate={order.expiresAt} 
                                size="sm" 
                                showLabels={false} 
                              />
                            </div>
                          )}

                          {/* Open in market notice - NO timer */}
                          {order.status === 'created' && (
                            <div className="flex items-center gap-2 p-2 bg-info/10 rounded-lg border border-info/20 mb-3">
                              <Clock className="h-4 w-4 text-info" />
                              <span className="text-xs text-info">
                                {isRTL ? '📢 معروض في السوق – بانتظار طرف آخر' : '📢 In market – Waiting for counterparty'}
                              </span>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            {/* Delete button for OPEN orders (creator only) */}
                            {order.status === 'created' && onDeleteOrder && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="gap-2 flex-1"
                                disabled={deletingOrderId === order.id}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setDeletingOrderId(order.id);
                                  await onDeleteOrder(order.id);
                                  setDeletingOrderId(null);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                {isRTL ? 'حذف' : 'Delete'}
                              </Button>
                            )}

                            {/* Open Chat button - ONLY for matched orders (not 'created') */}
                            {order.status !== 'created' && (
                              <Button 
                                variant="outline" 
                                className="flex-1 gap-2"
                                onClick={() => onOpenChat(order.id)}
                              >
                                <MessageSquare className="h-4 w-4" />
                                {isRTL ? 'فتح المحادثة' : 'Open Chat'}
                                <ChevronRight className="h-4 w-4 ms-auto" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}

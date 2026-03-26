import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, MessageSquare, AlertTriangle, FileText, Clock, User, ArrowRight, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
  data: any;
  loading: boolean;
}

export function OrderInspector({ open, onClose, data, loading }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { user } = useAuth();
  const [actionLoading, setActionLoading] = useState('');

  if (!open) return null;

  const order = data?.order;
  const ledger = data?.ledger || [];
  const messages = data?.messages || [];
  const disputes = data?.disputes || [];
  const audits = data?.audits || [];
  const profileMap = data?.profileMap || {};
  const walletMap = data?.walletMap || {};

  const getName = (uid: string) => profileMap[uid] || uid?.slice(0, 8);

  const handleAdminAction = async (action: string) => {
    if (!order || !user) return;
    setActionLoading(action);

    try {
      if (action === 'force_cancel') {
        const { error } = await supabase.rpc('p2p_cancel_order', {
          p_order_id: order.id,
          p_user_id: user.id,
          p_reason: 'Admin force cancel',
        });
        if (error) throw error;
        toast.success('Order force cancelled');
      } else if (action === 'force_release') {
        const { error } = await supabase.rpc('p2p_release_escrow', {
          p_order_id: order.id,
          p_user_id: user.id,
        });
        if (error) throw error;
        toast.success('Escrow released');
      } else if (action === 'freeze_creator') {
        const { data: fr, error: ferr } = await supabase.rpc('admin_freeze_wallet', {
          p_target_user_id: order.creator_id,
          p_reason: `Admin freeze from P2P tower: order ${order.id.slice(0, 8)}`,
        });
        if (ferr || !fr?.success) throw ferr ?? new Error(fr?.error ?? 'Freeze failed');
        toast.success('Creator wallet frozen');
      } else if (action === 'freeze_executor' && order.executor_id) {
        const { data: fr, error: ferr } = await supabase.rpc('admin_freeze_wallet', {
          p_target_user_id: order.executor_id,
          p_reason: `Admin freeze from P2P tower: order ${order.id.slice(0, 8)}`,
        });
        if (ferr || !fr?.success) throw ferr ?? new Error(fr?.error ?? 'Freeze failed');
        toast.success('Executor wallet frozen');
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        action: `admin_p2p_${action}`,
        entity_type: 'p2p_order',
        entity_id: order.id,
        performed_by: user.id,
        metadata: { order_status: order.status, action },
      });
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading('');
    }
  };

  // Build timeline events
  const timeline: { time: string; label: string; icon: any; color: string }[] = [];
  if (order) {
    timeline.push({ time: order.created_at, label: `Order created (${order.order_type})`, icon: FileText, color: 'text-blue-500' });
    if (order.matched_at) timeline.push({ time: order.matched_at, label: `Matched with ${getName(order.executor_id)}`, icon: ArrowRight, color: 'text-green-500' });
  }
  audits.forEach((a: any) => {
    timeline.push({ time: a.created_at, label: `${a.action}`, icon: FileText, color: 'text-muted-foreground' });
  });
  disputes.forEach((d: any) => {
    timeline.push({ time: d.created_at, label: `${d.action_type} by ${getName(d.staff_id)}`, icon: AlertTriangle, color: 'text-destructive' });
  });
  if (order?.completed_at) timeline.push({ time: order.completed_at, label: 'Completed', icon: Unlock, color: 'text-green-500' });
  timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-sm font-mono flex items-center gap-2">
            {isAr ? 'فحص الطلب' : 'Order Inspector'}
            {order && <Badge variant="outline">{order.id.slice(0, 12)}</Badge>}
          </SheetTitle>
        </SheetHeader>

        {loading || !order ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <ScrollArea className="h-[calc(100vh-60px)]">
            <div className="p-4 space-y-4">
              {/* Order Summary */}
              <Card className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Type:</span> <Badge className="text-[10px]">{order.order_type?.toUpperCase()}</Badge></div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="text-[10px]">{order.status}</Badge></div>
                  <div><span className="text-muted-foreground">Country:</span> {order.country}</div>
                  <div><span className="text-muted-foreground">Nova:</span> <span className="font-mono">{order.nova_amount}</span></div>
                  <div><span className="text-muted-foreground">Fiat:</span> <span className="font-mono">{order.local_amount}</span></div>
                  <div><span className="text-muted-foreground">Rate:</span> <span className="font-mono">{order.exchange_rate}</span></div>
                  <div><span className="text-muted-foreground">Creator:</span> {getName(order.creator_id)}</div>
                  <div><span className="text-muted-foreground">Executor:</span> {order.executor_id ? getName(order.executor_id) : '—'}</div>
                  <div><span className="text-muted-foreground">Timer:</span> {order.time_limit_minutes}min</div>
                  <div><span className="text-muted-foreground">Extensions:</span> {order.extension_count || 0}</div>
                </div>
                {order.cancellation_reason && (
                  <div className="text-xs text-destructive bg-destructive/10 rounded p-2">
                    <strong>{isAr ? 'سبب الإلغاء:' : 'Cancel reason:'}</strong> {order.cancellation_reason}
                  </div>
                )}
              </Card>

              {/* Wallet Snapshots */}
              <Card className="p-3">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> {isAr ? 'أرصدة المحافظ' : 'Wallet Balances'}
                </h4>
                <div className="space-y-2">
                  {[order.creator_id, order.executor_id].filter(Boolean).map((uid: string) => {
                    const w = walletMap[uid];
                    return w ? (
                      <div key={uid} className="flex items-center justify-between text-xs bg-muted/50 rounded p-2">
                        <span className="font-medium">{getName(uid)}</span>
                        <div className="flex gap-3">
                          <span>Nova: <strong className="font-mono">{w.nova_balance}</strong></span>
                          <span>Locked: <strong className="font-mono">{w.locked_nova_balance}</strong></span>
                          {w.is_frozen && <Badge variant="destructive" className="text-[10px]">FROZEN</Badge>}
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              </Card>

              {/* Timeline */}
              <Card className="p-3">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {isAr ? 'الجدول الزمني' : 'Lifecycle Timeline'}
                </h4>
                <div className="space-y-2">
                  {timeline.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <t.icon className={`w-3.5 h-3.5 mt-0.5 ${t.color} shrink-0`} />
                      <div>
                        <span className="text-muted-foreground font-mono">
                          {new Date(t.time).toLocaleString(isAr ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="ms-2">{t.label}</span>
                      </div>
                    </div>
                  ))}
                  {timeline.length === 0 && <p className="text-xs text-muted-foreground">No events</p>}
                </div>
              </Card>

              {/* Ledger */}
              <Card className="p-3">
                <h4 className="text-xs font-semibold mb-2">{isAr ? 'سجل المحاسبة' : 'Ledger Entries'}</h4>
                {ledger.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No ledger entries</p>
                ) : (
                  <div className="space-y-1">
                    {ledger.map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between text-xs bg-muted/30 rounded p-2">
                        <div>
                          <Badge variant="outline" className="text-[10px] me-1">{l.entry_type}</Badge>
                          <span className="text-muted-foreground">{l.description || l.reference_type}</span>
                        </div>
                        <div className="font-mono text-end">
                          <div className={l.amount > 0 ? 'text-green-600' : 'text-destructive'}>{l.amount > 0 ? '+' : ''}{l.amount} {l.currency}</div>
                          <div className="text-muted-foreground text-[10px]">{l.balance_before} → {l.balance_after}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Chat Messages */}
              <Card className="p-3">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" /> {isAr ? 'الرسائل' : 'Chat Messages'} ({messages.length})
                </h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {messages.map((m: any) => (
                    <div key={m.id} className={`text-xs rounded p-2 ${m.is_system_message ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted/30'}`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium">{m.is_system_message ? '⚡ System' : getName(m.sender_id)}</span>
                        <span className="text-muted-foreground text-[10px]">
                          {new Date(m.created_at).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{isAr && m.content_ar ? m.content_ar : m.content}</p>
                    </div>
                  ))}
                  {messages.length === 0 && <p className="text-xs text-muted-foreground">No messages</p>}
                </div>
              </Card>

              {/* Dispute Actions */}
              {disputes.length > 0 && (
                <Card className="p-3 border-destructive/30">
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1 text-destructive">
                    <AlertTriangle className="w-3.5 h-3.5" /> {isAr ? 'إجراءات النزاع' : 'Dispute Actions'}
                  </h4>
                  <div className="space-y-1">
                    {disputes.map((d: any) => (
                      <div key={d.id} className="text-xs bg-destructive/5 rounded p-2">
                        <div className="flex justify-between">
                          <Badge variant="destructive" className="text-[10px]">{d.action_type}</Badge>
                          <span className="text-muted-foreground text-[10px]">
                            {new Date(d.created_at).toLocaleString()}
                          </span>
                        </div>
                        {d.note && <p className="mt-1 text-muted-foreground">{d.note}</p>}
                        <p className="text-[10px] text-muted-foreground">Staff: {getName(d.staff_id)} | {d.previous_status} → {d.new_status}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Separator />

              {/* Admin Actions */}
              <Card className="p-3">
                <h4 className="text-xs font-semibold mb-2">{isAr ? 'إجراءات المدير' : 'Admin Actions'}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                    disabled={['completed', 'cancelled'].includes(order.status) || !!actionLoading}
                    onClick={() => handleAdminAction('force_cancel')}
                  >
                    {actionLoading === 'force_cancel' ? <Loader2 className="w-3 h-3 animate-spin me-1" /> : null}
                    {isAr ? 'إلغاء إجباري' : 'Force Cancel'}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs"
                    disabled={!['payment_sent', 'disputed'].includes(order.status) || !!actionLoading}
                    onClick={() => handleAdminAction('force_release')}
                  >
                    {actionLoading === 'force_release' ? <Loader2 className="w-3 h-3 animate-spin me-1" /> : null}
                    {isAr ? 'تحرير إجباري' : 'Force Release'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-destructive/30 text-destructive"
                    disabled={!!actionLoading}
                    onClick={() => handleAdminAction('freeze_creator')}
                  >
                    {actionLoading === 'freeze_creator' ? <Loader2 className="w-3 h-3 animate-spin me-1" /> : null}
                    {isAr ? 'تجميد المنشئ' : 'Freeze Creator'}
                  </Button>
                  {order.executor_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-destructive/30 text-destructive"
                      disabled={!!actionLoading}
                      onClick={() => handleAdminAction('freeze_executor')}
                    >
                      {actionLoading === 'freeze_executor' ? <Loader2 className="w-3 h-3 animate-spin me-1" /> : null}
                      {isAr ? 'تجميد المنفذ' : 'Freeze Executor'}
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}

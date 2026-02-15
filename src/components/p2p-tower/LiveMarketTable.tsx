import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, ArrowUpDown } from 'lucide-react';
import type { P2POrderRow } from '@/hooks/useP2PControlTower';

interface Props {
  orders: P2POrderRow[];
  loading: boolean;
  onInspect: (orderId: string) => void;
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-600',
  awaiting_payment: 'bg-amber-500/10 text-amber-600',
  payment_sent: 'bg-orange-500/10 text-orange-600',
  disputed: 'bg-destructive/10 text-destructive',
  completed: 'bg-green-500/10 text-green-600',
  cancelled: 'bg-muted text-muted-foreground',
};

function TimeLeft({ expiresAt, status }: { expiresAt: string | null; status: string }) {
  if (!expiresAt || !['awaiting_payment', 'payment_sent'].includes(status)) return <span className="text-muted-foreground">—</span>;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return <Badge variant="destructive" className="text-[10px]">EXPIRED</Badge>;
  const min = Math.floor(diff / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  const color = min < 5 ? 'text-destructive' : min < 10 ? 'text-amber-500' : 'text-foreground';
  return <span className={`text-xs font-mono ${color}`}>{min}:{sec.toString().padStart(2, '0')}</span>;
}

export function LiveMarketTable({ orders, loading, onInspect }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [sortKey, setSortKey] = useState<'created_at' | 'nova_amount' | 'status'>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...orders].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    else if (sortKey === 'nova_amount') cmp = a.nova_amount - b.nova_amount;
    else cmp = a.status.localeCompare(b.status);
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">{isAr ? 'السوق المباشر' : 'Live Market'}</h3>
        <Badge variant="outline" className="text-xs">{orders.length} {isAr ? 'طلب' : 'orders'}</Badge>
      </div>
      <ScrollArea className="max-h-[500px]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{isAr ? 'الرمز' : 'ID'}</th>
                <th className="px-3 py-2 text-start font-medium">{isAr ? 'البلد' : 'Country'}</th>
                <th className="px-3 py-2 text-start font-medium">{isAr ? 'النوع' : 'Type'}</th>
                <th className="px-3 py-2 text-start font-medium">{isAr ? 'المنشئ' : 'Creator'}</th>
                <th className="px-3 py-2 text-start font-medium">{isAr ? 'المنفذ' : 'Executor'}</th>
                <th className="px-3 py-2 text-start font-medium cursor-pointer" onClick={() => toggleSort('nova_amount')}>
                  <span className="flex items-center gap-1">Nova <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="px-3 py-2 text-start font-medium">{isAr ? 'المحلي' : 'Fiat'}</th>
                <th className="px-3 py-2 text-start font-medium">{isAr ? 'السعر' : 'Price'}</th>
                <th className="px-3 py-2 text-start font-medium cursor-pointer" onClick={() => toggleSort('status')}>
                  <span className="flex items-center gap-1">{isAr ? 'الحالة' : 'Status'} <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="px-3 py-2 text-start font-medium cursor-pointer" onClick={() => toggleSort('created_at')}>
                  <span className="flex items-center gap-1">{isAr ? 'الإنشاء' : 'Created'} <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="px-3 py-2 text-start font-medium">{isAr ? 'المطابقة' : 'Matched'}</th>
                <th className="px-3 py-2 text-start font-medium">{isAr ? 'المتبقي' : 'Time Left'}</th>
                <th className="px-3 py-2 text-start font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 13 }).map((_, j) => (
                      <td key={j} className="px-3 py-2"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr><td colSpan={13} className="px-3 py-8 text-center text-muted-foreground">{isAr ? 'لا توجد طلبات' : 'No orders found'}</td></tr>
              ) : sorted.map(o => (
                <tr key={o.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onInspect(o.id)}>
                  <td className="px-3 py-2 font-mono">{o.id.slice(0, 8)}</td>
                  <td className="px-3 py-2">{o.country || '—'}</td>
                  <td className="px-3 py-2">
                    <Badge variant={o.order_type === 'sell' ? 'destructive' : 'default'} className="text-[10px]">
                      {o.order_type?.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 truncate max-w-[100px]">{o.creator_name}</td>
                  <td className="px-3 py-2 truncate max-w-[100px]">{o.executor_name || '—'}</td>
                  <td className="px-3 py-2 font-mono">{o.nova_amount}</td>
                  <td className="px-3 py-2 font-mono">{o.local_amount}</td>
                  <td className="px-3 py-2 font-mono">{o.exchange_rate}</td>
                  <td className="px-3 py-2">
                    <Badge className={`text-[10px] ${statusColors[o.status] || ''}`}>{o.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(o.created_at).toLocaleString(isAr ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-3 py-2 text-muted-foreground">{o.matched_at ? new Date(o.matched_at).toLocaleString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-3 py-2"><TimeLeft expiresAt={o.expires_at} status={o.status} /></td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onInspect(o.id); }}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </Card>
  );
}

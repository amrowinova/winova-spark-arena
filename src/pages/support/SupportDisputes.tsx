import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  AlertTriangle, 
  User,
  CheckCircle,
  Gavel,
  UserCheck,
  ArrowUpCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

type FilterTab = 'all' | 'unassigned' | 'mine' | 'escalated';

interface P2PDispute {
  id: string;
  order_type: 'buy' | 'sell';
  status: string;
  nova_amount: number;
  local_amount: number;
  country: string;
  created_at: string;
  creator_id: string;
  executor_id: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  creator_name: string;
  creator_avatar: string | null;
  executor_name: string | null;
  executor_avatar: string | null;
  assigned_name: string | null;
  is_escalated: boolean;
}

export default function SupportDisputes() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const [disputes, setDisputes] = useState<P2PDispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setIsLoading(true);

    const { data: orders, error } = await supabase
      .from('p2p_orders')
      .select('*')
      .in('status', ['disputed', 'completed', 'cancelled'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching disputes:', error);
      setIsLoading(false);
      return;
    }

    // Gather all user IDs we need profiles for
    const userIds = new Set<string>();
    (orders || []).forEach(o => {
      userIds.add(o.creator_id);
      if (o.executor_id) userIds.add(o.executor_id);
      if (o.assigned_to) userIds.add(o.assigned_to);
    });

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, avatar_url')
      .in('user_id', Array.from(userIds));

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, p])
    );

    // Check which orders have been escalated (via audit log)
    const orderIds = (orders || []).map(o => o.id);
    const { data: escalations } = await supabase
      .from('p2p_dispute_actions')
      .select('order_id')
      .in('order_id', orderIds)
      .eq('action_type', 'escalate');

    const escalatedSet = new Set((escalations || []).map(e => e.order_id));

    const disputesWithProfiles: P2PDispute[] = (orders || []).map(order => ({
      id: order.id,
      order_type: order.order_type,
      status: order.status,
      nova_amount: order.nova_amount,
      local_amount: order.local_amount,
      country: order.country,
      created_at: order.created_at,
      creator_id: order.creator_id,
      executor_id: order.executor_id,
      assigned_to: order.assigned_to ?? null,
      assigned_at: order.assigned_at ?? null,
      creator_name: profileMap.get(order.creator_id)?.name || 'Unknown',
      creator_avatar: profileMap.get(order.creator_id)?.avatar_url ?? null,
      executor_name: order.executor_id ? (profileMap.get(order.executor_id)?.name ?? null) : null,
      executor_avatar: order.executor_id ? (profileMap.get(order.executor_id)?.avatar_url ?? null) : null,
      assigned_name: order.assigned_to ? (profileMap.get(order.assigned_to)?.name ?? null) : null,
      is_escalated: escalatedSet.has(order.id),
    }));

    setDisputes(disputesWithProfiles);
    setIsLoading(false);
  };

  const activeDisputes = disputes.filter(d => d.status === 'disputed');

  // Apply filter tab
  const tabFiltered = disputes.filter(d => {
    switch (activeFilter) {
      case 'unassigned': return d.status === 'disputed' && !d.assigned_to;
      case 'mine': return d.assigned_to === user?.id;
      case 'escalated': return d.is_escalated && d.status === 'disputed';
      default: return true;
    }
  });

  const filteredDisputes = tabFiltered.filter(d =>
    d.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.executor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unassignedCount = disputes.filter(d => d.status === 'disputed' && !d.assigned_to).length;
  const mineCount = disputes.filter(d => d.assigned_to === user?.id).length;
  const escalatedCount = disputes.filter(d => d.is_escalated && d.status === 'disputed').length;

  const filters: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: isRTL ? 'الكل' : 'All', count: disputes.length },
    { key: 'unassigned', label: isRTL ? 'غير مُعيّن' : 'Unassigned', count: unassignedCount },
    { key: 'mine', label: isRTL ? 'قضاياي' : 'Mine', count: mineCount },
    { key: 'escalated', label: isRTL ? 'مُصعّد' : 'Escalated', count: escalatedCount },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader 
        title={isRTL ? 'نزاعات P2P' : 'P2P Disputes'}
      />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map(f => (
            <Button
              key={f.key}
              variant={activeFilter === f.key ? 'default' : 'outline'}
              size="sm"
              className="shrink-0"
              onClick={() => setActiveFilter(f.key)}
            >
              {f.key === 'unassigned' && <AlertTriangle className="w-3.5 h-3.5 me-1" />}
              {f.key === 'mine' && <UserCheck className="w-3.5 h-3.5 me-1" />}
              {f.key === 'escalated' && <ArrowUpCircle className="w-3.5 h-3.5 me-1" />}
              {f.label}
              <Badge variant="secondary" className="ms-1.5 text-[10px] px-1.5 py-0 h-4">
                {f.count}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isRTL ? 'بحث بالاسم أو رقم الطلب...' : 'Search by name or order ID...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>

        {/* Stats */}
        <Card className="p-4 bg-destructive/10 border-destructive/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold text-destructive">{activeDisputes.length}</p>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'نزاعات نشطة تنتظر الحل' : 'Active disputes pending resolution'}
              </p>
            </div>
          </div>
        </Card>

        {/* Disputes List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {isRTL ? 'جارٍ التحميل...' : 'Loading...'}
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-primary/30" />
            <p className="text-muted-foreground">
              {isRTL ? 'لا توجد نزاعات 🎉' : 'No disputes found 🎉'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDisputes.map((dispute) => (
              <Card
                key={dispute.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/support/disputes/${dispute.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={dispute.creator_avatar || undefined} />
                      <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{dispute.creator_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {dispute.order_type === 'buy' ? (isRTL ? 'مشتري' : 'Buyer') : (isRTL ? 'بائع' : 'Seller')}
                      </p>
                    </div>
                  </div>

                  <div className="text-center">
                    <Badge variant={dispute.status === 'disputed' ? 'destructive' : 'secondary'} className="mb-1">
                      {dispute.status === 'disputed' ? (
                        <><AlertTriangle className="w-3 h-3 me-1" />{isRTL ? 'نزاع' : 'Dispute'}</>
                      ) : (
                        <><Gavel className="w-3 h-3 me-1" />{dispute.status === 'completed' ? (isRTL ? 'مكتمل' : 'Resolved') : (isRTL ? 'ملغي' : 'Cancelled')}</>
                      )}
                    </Badge>
                    <p className="text-xs font-medium">{dispute.nova_amount} И</p>
                  </div>

                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <div className="min-w-0 text-end">
                      <p className="text-sm font-medium truncate">{dispute.executor_name || '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {dispute.order_type === 'buy' ? (isRTL ? 'بائع' : 'Seller') : (isRTL ? 'مشتري' : 'Buyer')}
                      </p>
                    </div>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={dispute.executor_avatar || undefined} />
                      <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">
                      #{dispute.id.slice(0, 8)}
                    </span>
                    {dispute.assigned_name ? (
                      <Badge variant="outline" className="text-[10px] py-0 h-4">
                        <UserCheck className="w-3 h-3 me-0.5" />
                        {dispute.assigned_name}
                      </Badge>
                    ) : dispute.status === 'disputed' ? (
                      <Badge variant="destructive" className="text-[10px] py-0 h-4">
                        {isRTL ? 'غير مُعيّن' : 'Unassigned'}
                      </Badge>
                    ) : null}
                    {dispute.is_escalated && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4 border-orange-500 text-orange-500">
                        <ArrowUpCircle className="w-3 h-3 me-0.5" />
                        {isRTL ? 'مُصعّد' : 'Escalated'}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(dispute.created_at), {
                      addSuffix: true,
                      locale: isRTL ? ar : enUS,
                    })}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

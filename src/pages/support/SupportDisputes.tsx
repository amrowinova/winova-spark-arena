import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  AlertTriangle, 
  User,
  CheckCircle,
  Gavel,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

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
  creator_name: string;
  creator_avatar: string | null;
  executor_name: string | null;
  executor_avatar: string | null;
}

export default function SupportDisputes() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const [disputes, setDisputes] = useState<P2PDispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

    const disputesWithProfiles = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('user_id', order.creator_id)
          .single();

        let executorProfile = null;
        if (order.executor_id) {
          const { data } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('user_id', order.executor_id)
            .single();
          executorProfile = data;
        }

        return {
          id: order.id,
          order_type: order.order_type,
          status: order.status,
          nova_amount: order.nova_amount,
          local_amount: order.local_amount,
          country: order.country,
          created_at: order.created_at,
          creator_id: order.creator_id,
          executor_id: order.executor_id,
          creator_name: creatorProfile?.name || 'Unknown',
          creator_avatar: creatorProfile?.avatar_url,
          executor_name: executorProfile?.name,
          executor_avatar: executorProfile?.avatar_url,
        } as P2PDispute;
      })
    );

    setDisputes(disputesWithProfiles);
    setIsLoading(false);
  };

  const activeDisputes = disputes.filter(d => d.status === 'disputed');

  const filteredDisputes = disputes.filter(d =>
    d.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.executor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader 
        title={isRTL ? 'نزاعات P2P' : 'P2P Disputes'}
      />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
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
                  <span className="text-xs text-muted-foreground font-mono">
                    #{dispute.id.slice(0, 8)}
                  </span>
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

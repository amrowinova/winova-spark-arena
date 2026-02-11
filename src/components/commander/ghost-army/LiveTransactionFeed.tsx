import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRightLeft, Gift, Trophy, Clock } from 'lucide-react';

interface LedgerEntry {
  id: string;
  user_id: string;
  entry_type: string;
  currency: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
  username?: string;
}

export function LiveTransactionFeed({ isAr }: { isAr: boolean }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('wallet_ledger')
      .select('id, user_id, entry_type, currency, amount, balance_before, balance_after, description, created_at')
      .like('description', '%GHOST_ECONOMY%')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data && data.length > 0) {
      // Fetch usernames for the user_ids
      const userIds = [...new Set(data.map(e => e.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      const usernameMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
      const enriched = data.map(e => ({ ...e, username: usernameMap.get(e.user_id) || 'unknown' }));
      setEntries(enriched);
    } else {
      setEntries([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEntries();
    // Subscribe to realtime updates on wallet_ledger
    const channel = supabase
      .channel('ghost-economy-feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'wallet_ledger',
      }, (payload) => {
        const entry = payload.new as any;
        if (entry?.description?.includes('GHOST_ECONOMY')) {
          setEntries(prev => [{ ...entry, username: entry.user_id?.slice(0, 8) }, ...prev].slice(0, 100));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getIcon = (type: string) => {
    if (type === 'p2p_escrow_release' || type === 'p2p_escrow_lock') return <ArrowRightLeft className="h-3 w-3" />;
    if (type === 'transfer_sent' || type === 'transfer_received') return <Gift className="h-3 w-3" />;
    if (type === 'contest_entry') return <Trophy className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  const getColor = (type: string) => {
    if (type.includes('credit') || type.includes('received') || type.includes('release')) return 'text-primary';
    if (type.includes('debit') || type.includes('sent') || type.includes('lock') || type.includes('entry')) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground animate-pulse">{isAr ? 'جارٍ تحميل البث...' : 'Loading live feed...'}</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {isAr ? 'لا توجد معاملات بعد. شغّل "الاقتصاد الذاتي" لبدء الحركة.' : 'No transactions yet. Run "Autonomous Economy" to start activity.'}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs font-medium">{isAr ? 'بث مباشر' : 'LIVE FEED'} — {entries.length} {isAr ? 'معاملة' : 'transactions'}</span>
      </div>
      <ScrollArea className="h-72">
        <div className="space-y-1">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 p-1.5 rounded border bg-card text-[10px]">
              <span className={getColor(entry.entry_type)}>{getIcon(entry.entry_type)}</span>
              <span className="font-mono text-muted-foreground w-16 shrink-0">{formatTime(entry.created_at)}</span>
              <span className="font-medium truncate max-w-[80px]">{entry.username}</span>
              <Badge variant={entry.amount > 0 ? 'default' : 'secondary'} className="text-[9px] h-4 px-1">
                {entry.amount > 0 ? '+' : ''}{entry.amount}И
              </Badge>
              <span className="text-muted-foreground truncate flex-1">{entry.entry_type.replace(/_/g, ' ')}</span>
              <span className="text-muted-foreground font-mono shrink-0">
                {entry.balance_before}→{entry.balance_after}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

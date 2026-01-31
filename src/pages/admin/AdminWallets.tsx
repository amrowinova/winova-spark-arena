import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Wallet,
  User,
  TrendingUp,
  TrendingDown,
  Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WalletWithProfile {
  id: string;
  user_id: string;
  nova_balance: number;
  aura_balance: number;
  locked_nova_balance: number;
  user_name: string;
  user_avatar: string | null;
  username: string;
}

export default function AdminWallets() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [wallets, setWallets] = useState<WalletWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'nova' | 'aura'>('nova');

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    setIsLoading(true);

    const { data: walletsData, error } = await supabase
      .from('wallets')
      .select('*')
      .order('nova_balance', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching wallets:', error);
      setIsLoading(false);
      return;
    }

    // Join with profiles
    const walletsWithProfiles = await Promise.all(
      (walletsData || []).map(async (wallet) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, avatar_url, username')
          .eq('user_id', wallet.user_id)
          .single();

        return {
          id: wallet.id,
          user_id: wallet.user_id,
          nova_balance: wallet.nova_balance,
          aura_balance: wallet.aura_balance,
          locked_nova_balance: wallet.locked_nova_balance,
          user_name: profile?.name || 'Unknown',
          user_avatar: profile?.avatar_url,
          username: profile?.username || 'unknown',
        } as WalletWithProfile;
      })
    );

    setWallets(walletsWithProfiles);
    setIsLoading(false);
  };

  const filteredWallets = wallets
    .filter(w =>
      w.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'nova') return b.nova_balance - a.nova_balance;
      return b.aura_balance - a.aura_balance;
    });

  const totalNova = wallets.reduce((sum, w) => sum + w.nova_balance, 0);
  const totalAura = wallets.reduce((sum, w) => sum + w.aura_balance, 0);
  const totalLocked = wallets.reduce((sum, w) => sum + w.locked_nova_balance, 0);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader 
        title={isRTL ? 'إدارة المحافظ' : 'Wallet Management'}
      />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center bg-amber-500/5 border-amber-500/20">
            <p className="text-lg font-bold text-amber-600">{formatNumber(totalNova)}</p>
            <p className="text-[10px] text-muted-foreground">Total Nova</p>
          </Card>
          <Card className="p-3 text-center bg-purple-500/5 border-purple-500/20">
            <p className="text-lg font-bold text-purple-600">{formatNumber(totalAura)}</p>
            <p className="text-[10px] text-muted-foreground">Total Aura</p>
          </Card>
          <Card className="p-3 text-center bg-red-500/5 border-red-500/20">
            <p className="text-lg font-bold text-red-600">{formatNumber(totalLocked)}</p>
            <p className="text-[10px] text-muted-foreground">Locked</p>
          </Card>
        </div>

        {/* Search & Sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? 'بحث بالاسم...' : 'Search by name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>
          <div className="flex gap-1">
            <Badge 
              variant={sortBy === 'nova' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSortBy('nova')}
            >
              Nova
            </Badge>
            <Badge 
              variant={sortBy === 'aura' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSortBy('aura')}
            >
              Aura
            </Badge>
          </div>
        </div>

        {/* Wallets List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {isRTL ? 'جارٍ التحميل...' : 'Loading...'}
          </div>
        ) : filteredWallets.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {isRTL ? 'لا توجد محافظ' : 'No wallets found'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredWallets.map((wallet, index) => (
              <Card key={wallet.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={wallet.user_avatar || undefined} />
                      <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                    </Avatar>
                    {index < 3 && (
                      <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{wallet.user_name}</p>
                    <p className="text-xs text-muted-foreground">@{wallet.username}</p>
                  </div>
                  
                  <div className="text-end">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-sm font-bold text-amber-600">
                        {formatNumber(wallet.nova_balance)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">И</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-xs text-purple-600">
                        {formatNumber(wallet.aura_balance)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">✦</span>
                    </div>
                    {wallet.locked_nova_balance > 0 && (
                      <div className="flex items-center gap-1 justify-end text-red-500">
                        <Lock className="w-3 h-3" />
                        <span className="text-[10px]">{formatNumber(wallet.locked_nova_balance)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

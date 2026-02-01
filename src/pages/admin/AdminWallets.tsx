import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Wallet,
  User,
  Lock,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AddNovaDialog } from '@/components/admin/AddNovaDialog';
import { formatNovaWithLocal } from '@/lib/novaExchangeRates';

interface WalletWithProfile {
  id: string;
  user_id: string;
  nova_balance: number;
  aura_balance: number;
  locked_nova_balance: number;
  user_name: string;
  user_avatar: string | null;
  username: string;
  country: string;
}

export default function AdminWallets() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [wallets, setWallets] = useState<WalletWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'nova' | 'aura'>('nova');
  const [selectedWallet, setSelectedWallet] = useState<WalletWithProfile | null>(null);
  const [isNovaDialogOpen, setIsNovaDialogOpen] = useState(false);

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
          .select('name, avatar_url, username, country, wallet_country')
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
          country: profile?.wallet_country || profile?.country || 'Egypt',
        } as WalletWithProfile;
      })
    );

    setWallets(walletsWithProfiles);
    setIsLoading(false);
  };

  const handleManageNova = (wallet: WalletWithProfile) => {
    setSelectedWallet(wallet);
    setIsNovaDialogOpen(true);
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
        {/* Exchange Rate Banner */}
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">И</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'السعر الأساسي' : 'Base Rate'}
                </p>
                <p className="font-semibold">
                  И 1 = 10 {isRTL ? 'ج.م' : 'EGP'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {isRTL ? 'سعر ثابت' : 'Fixed Rate'}
            </Badge>
          </div>
        </Card>

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
          <Card className="p-3 text-center bg-destructive/5 border-destructive/20">
            <p className="text-lg font-bold text-destructive">{formatNumber(totalLocked)}</p>
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
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </Card>
            ))}
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
            {filteredWallets.map((wallet, index) => {
              const localDisplay = formatNovaWithLocal(wallet.nova_balance, wallet.country, isRTL);
              
              return (
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
                      <p className="text-[10px] text-muted-foreground">
                        ≈ {localDisplay.local}
                      </p>
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs text-purple-600">
                          {formatNumber(wallet.aura_balance)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">✦</span>
                      </div>
                      {wallet.locked_nova_balance > 0 && (
                        <div className="flex items-center gap-1 justify-end text-destructive">
                          <Lock className="w-3 h-3" />
                          <span className="text-[10px]">{formatNumber(wallet.locked_nova_balance)}</span>
                        </div>
                      )}
                    </div>

                    {/* Manage Nova Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => handleManageNova(wallet)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Nova Dialog */}
      <AddNovaDialog
        open={isNovaDialogOpen}
        onOpenChange={setIsNovaDialogOpen}
        user={selectedWallet}
        onSuccess={fetchWallets}
      />
    </div>
  );
}

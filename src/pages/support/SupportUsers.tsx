import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  User,
  Mail,
  Calendar,
  Wallet,
  Shield,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  country: string;
  rank: string;
  created_at: string;
  // Extended info
  nova_balance?: number;
  aura_balance?: number;
  role?: string;
}

export default function SupportUsers() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching users:', error);
      setIsLoading(false);
      return;
    }

    setUsers(profiles || []);
    setIsLoading(false);
  };

  const fetchUserDetails = async (userId: string) => {
    // Fetch wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('nova_balance, aura_balance')
      .eq('user_id', userId)
      .single();

    // Fetch role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    return {
      nova_balance: wallet?.nova_balance || 0,
      aura_balance: wallet?.aura_balance || 0,
      role: roleData?.role || 'user',
    };
  };

  const handleSelectUser = async (user: UserProfile) => {
    const details = await fetchUserDetails(user.user_id);
    setSelectedUser({ ...user, ...details });
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRankBadge = (rank: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      subscriber: { variant: 'outline', label: isRTL ? 'مشترك' : 'Subscriber' },
      marketer: { variant: 'secondary', label: isRTL ? 'مسوق' : 'Marketer' },
      leader: { variant: 'default', label: isRTL ? 'قائد' : 'Leader' },
      manager: { variant: 'default', label: isRTL ? 'مدير' : 'Manager' },
      president: { variant: 'default', label: isRTL ? 'رئيس' : 'President' },
    };
    const config = variants[rank] || variants.subscriber;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader 
        title={isRTL ? 'المستخدمين' : 'Users'}
      />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isRTL ? 'بحث بالاسم أو اسم المستخدم...' : 'Search by name or username...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>

        {/* Stats */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'مستخدم مسجل' : 'Registered users'}
              </p>
            </div>
          </div>
        </Card>

        {/* Users List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {isRTL ? 'جارٍ التحميل...' : 'Loading...'}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {isRTL ? 'لا يوجد مستخدمين' : 'No users found'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <Card
                key={user.id}
                className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSelectUser(user)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{user.name}</p>
                      {getRankBadge(user.rank)}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.username} • {user.country}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* User Detail Sheet */}
      <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          {selectedUser && (
            <>
              <SheetHeader className="text-center pb-4">
                <Avatar className="w-20 h-20 mx-auto mb-3">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback><User className="w-10 h-10" /></AvatarFallback>
                </Avatar>
                <SheetTitle>{selectedUser.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                <div className="flex justify-center gap-2 mt-2">
                  {getRankBadge(selectedUser.rank)}
                  {selectedUser.role && selectedUser.role !== 'user' && (
                    <Badge variant="destructive">
                      <Shield className="w-3 h-3 me-1" />
                      {selectedUser.role}
                    </Badge>
                  )}
                </div>
              </SheetHeader>

              <div className="space-y-4 mt-4">
                {/* Wallet Info */}
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Wallet className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{isRTL ? 'المحفظة' : 'Wallet'}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xl font-bold">{selectedUser.nova_balance?.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">NOVA</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-xl font-bold">{selectedUser.aura_balance?.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">AURA</p>
                    </div>
                  </div>
                </Card>

                {/* Account Info */}
                <Card className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{selectedUser.user_id.slice(0, 16)}...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {isRTL ? 'انضم في ' : 'Joined '}
                      {format(new Date(selectedUser.created_at), 'PPP', {
                        locale: isRTL ? ar : enUS,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{selectedUser.country}</span>
                  </div>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

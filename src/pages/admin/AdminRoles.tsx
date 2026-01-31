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
  Shield,
  Crown,
  UserCog,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { UserRoleManager } from '@/components/admin/UserRoleManager';

interface UserWithRoles {
  id: string;
  user_id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  roles: string[];
}

export default function AdminRoles() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);

    // Fetch profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, user_id, name, username, avatar_url')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching users:', error);
      setIsLoading(false);
      return;
    }

    // Fetch all roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');

    // Map roles to users
    const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => {
      const userRoles = rolesData
        ?.filter(r => r.user_id === profile.user_id)
        .map(r => r.role) || ['user'];
      return { ...profile, roles: userRoles };
    });

    setUsers(usersWithRoles);
    setIsLoading(false);
  };

  const handleSelectUser = (user: UserWithRoles) => {
    setSelectedUser(user);
  };

  const handleRolesChange = async () => {
    if (!selectedUser) return;
    
    // Refresh roles for selected user
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', selectedUser.user_id);

    const updatedRoles = rolesData?.map(r => r.role) || ['user'];
    
    setSelectedUser(prev => prev ? { ...prev, roles: updatedRoles } : null);
    setUsers(prev => prev.map(u => 
      u.user_id === selectedUser.user_id 
        ? { ...u, roles: updatedRoles }
        : u
    ));
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: admins first, then support, then moderators, then regular users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const order = ['admin', 'support', 'moderator', 'user'];
    const aMax = Math.min(...a.roles.map(r => order.indexOf(r)).filter(i => i >= 0));
    const bMax = Math.min(...b.roles.map(r => order.indexOf(r)).filter(i => i >= 0));
    return aMax - bMax;
  });

  const getRoleBadges = (roles: string[]) => {
    const roleConfig: Record<string, { icon: React.ElementType; color: string; label: string; labelAr: string }> = {
      admin: { icon: Crown, color: 'bg-destructive/10 text-destructive', label: 'Admin', labelAr: 'مدير' },
      support: { icon: Shield, color: 'bg-primary/10 text-primary', label: 'Support', labelAr: 'دعم' },
      moderator: { icon: UserCog, color: 'bg-warning/10 text-warning', label: 'Mod', labelAr: 'مشرف' },
    };

    return roles
      .filter(r => r !== 'user')
      .map(role => {
        const config = roleConfig[role];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <Badge key={role} variant="outline" className={`text-[10px] ${config.color}`}>
            <Icon className="w-2.5 h-2.5 me-0.5" />
            {isRTL ? config.labelAr : config.label}
          </Badge>
        );
      });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader 
        title={isRTL ? 'إدارة الأدوار' : 'Role Management'}
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
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center">
            <Crown className="w-5 h-5 mx-auto mb-1 text-destructive" />
            <p className="text-lg font-bold">
              {users.filter(u => u.roles.includes('admin')).length}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isRTL ? 'مدراء' : 'Admins'}
            </p>
          </Card>
          <Card className="p-3 text-center">
            <Shield className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">
              {users.filter(u => u.roles.includes('support')).length}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isRTL ? 'دعم فني' : 'Support'}
            </p>
          </Card>
          <Card className="p-3 text-center">
            <UserCog className="w-5 h-5 mx-auto mb-1 text-warning" />
            <p className="text-lg font-bold">
              {users.filter(u => u.roles.includes('moderator')).length}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isRTL ? 'مشرفين' : 'Mods'}
            </p>
          </Card>
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {isRTL ? 'جارٍ التحميل...' : 'Loading...'}
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {isRTL ? 'لا يوجد مستخدمين' : 'No users found'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedUsers.map((user) => (
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{user.name}</p>
                      {getRoleBadges(user.roles)}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* User Role Management Sheet */}
      <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
          {selectedUser && (
            <>
              <SheetHeader className="text-center pb-4">
                <Avatar className="w-16 h-16 mx-auto mb-2">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback><User className="w-8 h-8" /></AvatarFallback>
                </Avatar>
                <SheetTitle>{selectedUser.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
              </SheetHeader>

              <div className="mt-4">
                <UserRoleManager
                  userId={selectedUser.user_id}
                  currentRoles={selectedUser.roles}
                  onRolesChange={handleRolesChange}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

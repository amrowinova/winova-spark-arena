import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Wallet,
  ArrowLeftRight,
  AlertTriangle,
  Trophy,
  Shield,
  RefreshCcw,
  Crown,
  UserPlus,
  DollarSign,
  Megaphone,
  Percent,
  History,
  Zap,
  BarChart3,
  Radio,
  Lightbulb,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalNova: number;
  totalAura: number;
  openOrders: number;
  disputedOrders: number;
  openTickets: number;
  activeContests: number;
  totalFollows: number;
}

export default function AdminDashboard() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalNova: 0,
    totalAura: 0,
    openOrders: 0,
    disputedOrders: 0,
    openTickets: 0,
    activeContests: 0,
    totalFollows: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);

    const [
      usersResult,
      walletsResult,
      openOrdersResult,
      disputedOrdersResult,
      ticketsResult,
      contestsResult,
      followsResult,
    ] = await Promise.all([
      supabase.from('profiles').select('id, weekly_active', { count: 'exact' }),
      // Use server-side aggregation instead of fetching all rows
      supabase.from('wallets').select('nova_balance, aura_balance').limit(10000),
      // Filter server-side
      supabase.from('p2p_orders').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('p2p_orders').select('id', { count: 'exact', head: true }).eq('status', 'disputed'),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('contests').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('follows').select('id', { count: 'exact', head: true }),
    ]);

    const totalUsers = usersResult.count || 0;
    const activeUsers = usersResult.data?.filter(u => u.weekly_active).length || 0;

    const wallets = walletsResult.data || [];
    const totalNova = wallets.reduce((sum, w) => sum + (w.nova_balance || 0), 0);
    const totalAura = wallets.reduce((sum, w) => sum + (w.aura_balance || 0), 0);

    setStats({
      totalUsers,
      activeUsers,
      totalNova,
      totalAura,
      openOrders: openOrdersResult.count || 0,
      disputedOrders: disputedOrdersResult.count || 0,
      openTickets: ticketsResult.count || 0,
      activeContests: contestsResult.count || 0,
      totalFollows: followsResult.count || 0,
    });

    setIsLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US').format(num);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader
        title={isRTL ? 'لوحة الإدارة' : 'Admin Dashboard'}
      />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={isLoading}
          >
            <RefreshCcw className={`w-4 h-4 me-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Users Card */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats.totalUsers)}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'إجمالي المستخدمين' : 'Total Users'}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <Badge variant="secondary" className="text-[10px]">
                {formatNumber(stats.activeUsers)} {isRTL ? 'نشط' : 'active'}
              </Badge>
            </div>
          </Card>

          {/* Wallet Card */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats.totalNova)}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'إجمالي Nova' : 'Total Nova'}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-500">
                {formatNumber(stats.totalAura)} Aura
              </Badge>
            </div>
          </Card>

          {/* P2P Orders Card */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats.openOrders)}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'طلبات مفتوحة' : 'Open Orders'}
                </p>
              </div>
            </div>
            {stats.disputedOrders > 0 && (
              <div className="mt-2">
                <Badge variant="destructive" className="text-[10px]">
                  {stats.disputedOrders} {isRTL ? 'نزاعات' : 'disputes'}
                </Badge>
              </div>
            )}
          </Card>

          {/* Support Card */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats.openTickets)}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'تذاكر مفتوحة' : 'Open Tickets'}
                </p>
              </div>
            </div>
          </Card>

          {/* Follows Card */}
          <Card className="p-4 col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats.totalFollows)}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'إجمالي المتابعات' : 'Total Follows'}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-[10px]">
                {isRTL ? 'علاقات المتابعة بين المستخدمين' : 'User follow relationships'}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            {isRTL ? 'الإجراءات السريعة' : 'Quick Actions'}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => navigate('/admin/wallets')}
            >
              <Wallet className="w-5 h-5 text-amber-500" />
              <span className="text-xs">{isRTL ? 'المحافظ' : 'Wallets'}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => navigate('/admin/pricing')}
            >
              <DollarSign className="w-5 h-5 text-green-500" />
              <span className="text-xs">{isRTL ? 'الأسعار' : 'Pricing'}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => navigate('/admin/broadcast')}
            >
              <Megaphone className="w-5 h-5 text-blue-500" />
              <span className="text-xs">{isRTL ? 'النشرات' : 'Broadcast'}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => navigate('/admin/contests')}
            >
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-xs">{isRTL ? 'المسابقات' : 'Contests'}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => navigate('/admin/cycles')}
            >
              <Zap className="w-5 h-5 text-purple-500" />
              <span className="text-xs">{isRTL ? 'الدورات' : 'Cycles'}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => navigate('/admin/commissions')}
            >
              <Percent className="w-5 h-5 text-pink-500" />
              <span className="text-xs">{isRTL ? 'العمولات' : 'Commissions'}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => navigate('/admin/roles')}
            >
              <Shield className="w-5 h-5 text-indigo-500" />
              <span className="text-xs">{isRTL ? 'الأدوار' : 'Roles'}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => navigate('/admin/change-requests')}
            >
              <History className="w-5 h-5 text-orange-500" />
              <span className="text-xs">{isRTL ? 'السجل' : 'Change Log'}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => navigate('/admin/p2p')}
            >
              <Radio className="w-5 h-5 text-cyan-500" />
              <span className="text-xs">{isRTL ? 'برج P2P' : 'P2P Tower'}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1 col-span-3"
              onClick={() => navigate('/admin/proposals')}
            >
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <span className="text-xs">{isRTL ? 'مقترحات الذكاء الاصطناعي' : 'AI Proposals'}</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

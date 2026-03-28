import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Users, TrendingUp, DollarSign, Trophy, Store, ArrowLeftRight, Heart,
  Calendar, RefreshCw, Download, Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface AnalyticsData {
  userGrowth: any[];
  donations: any[];
  contests: any[];
  agentEarnings: any[];
  p2pVolume: any[];
  families: any[];
  summary: {
    total_users: number;
    active_users: number;
    total_donations: number;
    total_p2p_volume: number;
    total_contests: number;
    active_agents: number;
    supported_families: number;
    total_agent_earnings: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AdminAnalytics() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [
        userGrowthResult,
        donationsResult,
        contestsResult,
        agentEarningsResult,
        p2pVolumeResult,
        familiesResult,
        summaryResult
      ] = await Promise.all([
        supabase.rpc('analytics_user_growth', { p_period: period }),
        supabase.rpc('analytics_donations', { p_period: period }),
        supabase.rpc('analytics_contests', { p_period: period }),
        supabase.rpc('analytics_agent_earnings', { p_period: period }),
        supabase.rpc('analytics_p2p_volume', { p_period: period }),
        supabase.rpc('analytics_families', { p_period: period }),
        supabase.rpc('analytics_summary', { p_period: period })
      ]);

      setData({
        userGrowth: userGrowthResult.data || [],
        donations: donationsResult.data || [],
        contests: contestsResult.data || [],
        agentEarnings: agentEarningsResult.data || [],
        p2pVolume: p2pVolumeResult.data || [],
        families: familiesResult.data || [],
        summary: summaryResult.data || {}
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US').format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, isRTL ? 'dd/MM' : 'MM/dd', { locale: isRTL ? ar : enUS });
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue" }: any) => (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-${color}-100`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
      </div>
    </Card>
  );

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <InnerPageHeader title={isRTL ? 'التحليلات' : 'Analytics'} />
        <main className="p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <InnerPageHeader title={isRTL ? 'التحليلات' : 'Analytics'} />
      
      <main className="p-6 space-y-6">
        {/* Header with Period Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isRTL ? 'لوحة التحليلات' : 'Analytics Dashboard'}</h1>
            <p className="text-muted-foreground">
              {isRTL ? 'إحصائيات حية ومفصلة عن أداء المنصة' : 'Live and detailed platform performance statistics'}
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                {isRTL ? 'آخر تحديث:' : 'Last updated:'} {format(lastUpdated, 'HH:mm:ss')}
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{isRTL ? 'آخر 7 أيام' : 'Last 7 days'}</SelectItem>
                <SelectItem value="30d">{isRTL ? 'آخر 30 يوم' : 'Last 30 days'}</SelectItem>
                <SelectItem value="1y">{isRTL ? 'هذا العام' : 'This year'}</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            title={isRTL ? 'المستخدمون الجدد' : 'New Users'}
            value={formatNumber(data.summary.total_users)}
            subtitle={`${formatNumber(data.summary.active_users)} ${isRTL ? 'نشطين' : 'active'}`}
            color="blue"
          />
          <StatCard
            icon={Heart}
            title={isRTL ? 'إجمالي التبرعات' : 'Total Donations'}
            value={formatCurrency(data.summary.total_donations)}
            subtitle={`${data.summary.supported_families} ${isRTL ? 'عائلة' : 'families'}`}
            color="green"
          />
          <StatCard
            icon={ArrowLeftRight}
            title={isRTL ? 'حجم التداول P2P' : 'P2P Volume'}
            value={formatCurrency(data.summary.total_p2p_volume)}
            subtitle={isRTL ? 'Nova tokens' : 'Nova tokens'}
            color="purple"
          />
          <StatCard
            icon={Store}
            title={isRTL ? 'أرباح الوكلاء' : 'Agent Earnings'}
            value={formatCurrency(data.summary.total_agent_earnings)}
            subtitle={`${data.summary.active_agents} ${isRTL ? 'وكيل نشط' : 'active agents'}`}
            color="orange"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {isRTL ? 'نمو المستخدمين' : 'User Growth'}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => formatDate(value as string)}
                  formatter={(value: any) => [formatNumber(value), isRTL ? 'مستخدمون جدد' : 'New Users']}
                />
                <Area 
                  type="monotone" 
                  dataKey="new_users" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Donation Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {isRTL ? 'التبرعات اليومية' : 'Daily Donations'}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.donations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => formatDate(value as string)}
                  formatter={(value: any, name: string) => [
                    name === 'total_amount' ? formatCurrency(value) : formatNumber(value),
                    name === 'total_amount' ? (isRTL ? 'المبلغ' : 'Amount') : (isRTL ? 'التبرعات' : 'Donations')
                  ]}
                />
                <Bar dataKey="total_amount" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* P2P Volume Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {isRTL ? 'حجم تداول P2P' : 'P2P Trading Volume'}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.p2pVolume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => formatDate(value as string)}
                  formatter={(value: any) => [formatCurrency(value), isRTL ? 'حجم التداول' : 'Volume']}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_volume" 
                  stroke="#FF8042" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Agent Earnings Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {isRTL ? 'أرباح الوكلاء' : 'Agent Earnings'}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.agentEarnings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => formatDate(value as string)}
                  formatter={(value: any) => [formatCurrency(value), isRTL ? 'الأرباح' : 'Earnings']}
                />
                <Area 
                  type="monotone" 
                  dataKey="total_earnings" 
                  stroke="#FFBB28" 
                  fill="#FFBB28" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? 'المسابقات النشطة' : 'Active Contests'}</p>
                <p className="text-xl font-bold">{formatNumber(data.summary.total_contests)}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Store className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? 'الوكلاء النشطين' : 'Active Agents'}</p>
                <p className="text-xl font-bold">{formatNumber(data.summary.active_agents)}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? 'العائلات المدعومة' : 'Supported Families'}</p>
                <p className="text-xl font-bold">{formatNumber(data.summary.supported_families)}</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

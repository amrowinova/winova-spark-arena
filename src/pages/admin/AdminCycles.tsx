import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCcw,
  Crown,
  Calendar,
  TrendingUp,
  Globe,
  Star,
  Trophy,
  Users,
  ChevronRight,
  Zap,
  BarChart3,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCycleProgress } from '@/hooks/useCycleProgress';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface PresidentInfo {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  country: string | null;
  rank: string | null;
  cycle_points: number;
}

interface CycleRecord {
  id: string;
  cycle_number: number;
  start_date: string;
  end_date: string;
  status: string;
  total_days: number;
  total_weeks: number;
  created_at: string;
}

interface CountryLeader {
  country: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  total_points: number;
}

export default function AdminCycles() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const cycle = useCycleProgress();

  const [cycles, setCycles] = useState<CycleRecord[]>([]);
  const [countryLeaders, setCountryLeaders] = useState<CountryLeader[]>([]);
  const [topUsers, setTopUsers] = useState<PresidentInfo[]>([]);
  const [isLoadingCycles, setIsLoadingCycles] = useState(true);
  const [isLoadingLeaders, setIsLoadingLeaders] = useState(true);

  const fetchCycles = async () => {
    setIsLoadingCycles(true);
    const { data } = await supabase
      .from('spotlight_cycles')
      .select('*')
      .order('cycle_number', { ascending: false })
      .limit(10);
    if (data) setCycles(data as CycleRecord[]);
    setIsLoadingCycles(false);
  };

  const fetchLeaders = async () => {
    setIsLoadingLeaders(true);

    if (!cycle.cycleId) {
      setIsLoadingLeaders(false);
      return;
    }

    // Get top users by cycle points
    const { data: pointsData } = await supabase
      .from('spotlight_user_points')
      .select('user_id, daily_points')
      .eq('cycle_id', cycle.cycleId);

    if (!pointsData || pointsData.length === 0) {
      setIsLoadingLeaders(false);
      return;
    }

    // Aggregate points per user
    const userPointsMap: Record<string, number> = {};
    pointsData.forEach(p => {
      userPointsMap[p.user_id] = (userPointsMap[p.user_id] || 0) + p.daily_points;
    });

    // Sort and get top 20
    const topUserIds = Object.entries(userPointsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, country, rank')
      .in('id', topUserIds);

    if (profiles) {
      const enriched: PresidentInfo[] = topUserIds.map(uid => {
        const profile = profiles.find(p => p.id === uid);
        return {
          user_id: uid,
          full_name: profile?.full_name || null,
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
          country: profile?.country || null,
          rank: profile?.rank || null,
          cycle_points: userPointsMap[uid] || 0,
        };
      });
      setTopUsers(enriched);

      // Group by country - take top per country
      const byCountry: Record<string, CountryLeader> = {};
      enriched.forEach(u => {
        if (!u.country) return;
        if (!byCountry[u.country] || u.cycle_points > byCountry[u.country].total_points) {
          byCountry[u.country] = {
            country: u.country,
            user_id: u.user_id,
            full_name: u.full_name,
            username: u.username,
            avatar_url: u.avatar_url,
            total_points: u.cycle_points,
          };
        }
      });
      setCountryLeaders(Object.values(byCountry).sort((a, b) => b.total_points - a.total_points));
    }

    setIsLoadingLeaders(false);
  };

  useEffect(() => { fetchCycles(); }, []);
  useEffect(() => { if (cycle.cycleId) fetchLeaders(); }, [cycle.cycleId]);

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: isRTL ? arSA : undefined });
  };

  const getRankBadgeColor = (rank: string | null) => {
    switch (rank) {
      case 'president': return 'bg-yellow-500/20 text-yellow-600';
      case 'manager': return 'bg-purple-500/20 text-purple-600';
      case 'leader': return 'bg-blue-500/20 text-blue-600';
      case 'marketer': return 'bg-green-500/20 text-green-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRankLabelAr = (rank: string | null) => {
    switch (rank) {
      case 'president': return 'رئيس';
      case 'manager': return 'مدير';
      case 'leader': return 'قائد';
      case 'marketer': return 'مسوّق';
      case 'subscriber': return 'مشترك';
      default: return rank || '—';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader title={isRTL ? 'إدارة الدورات والرئاسة' : 'Cycles & Presidency'} />

      <div className="flex-1 p-4 overflow-y-auto pb-20">
        <Tabs defaultValue="current">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="current" className="flex-1 text-xs">
              <TrendingUp className="w-3 h-3 me-1" />
              {isRTL ? 'الدورة الحالية' : 'Current Cycle'}
            </TabsTrigger>
            <TabsTrigger value="presidents" className="flex-1 text-xs">
              <Crown className="w-3 h-3 me-1" />
              {isRTL ? 'الرؤساء' : 'Presidents'}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-xs">
              <Calendar className="w-3 h-3 me-1" />
              {isRTL ? 'السجل' : 'History'}
            </TabsTrigger>
          </TabsList>

          {/* Current Cycle Tab */}
          <TabsContent value="current" className="space-y-4">
            {cycle.loading ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : !cycle.cycleId ? (
              <Card className="p-8 text-center">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  {isRTL ? 'لا توجد دورة نشطة حالياً' : 'No active cycle currently'}
                </p>
              </Card>
            ) : (
              <>
                {/* Cycle Info Card */}
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold">
                          {isRTL ? `الدورة ${cycle.cycleNumber}` : `Cycle ${cycle.cycleNumber}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(cycle.startDate)} → {formatDate(cycle.endDate)}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-600 text-xs">
                      {isRTL ? 'نشط' : 'Active'}
                    </Badge>
                  </div>

                  <Progress value={cycle.progressPercentage} className="h-2 mb-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {isRTL
                        ? `اليوم ${cycle.currentDay} من ${cycle.totalDays}`
                        : `Day ${cycle.currentDay} of ${cycle.totalDays}`}
                    </span>
                    <span>
                      {isRTL
                        ? `الأسبوع ${cycle.currentWeek} من ${cycle.totalWeeks}`
                        : `Week ${cycle.currentWeek} of ${cycle.totalWeeks}`}
                    </span>
                    <span>{cycle.progressPercentage.toFixed(1)}%</span>
                  </div>
                </Card>

                {/* How presidency works */}
                <Card className="p-4 bg-amber-500/5 border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <Crown className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-amber-600">
                        {isRTL ? 'آلية الرئاسة' : 'Presidency Mechanism'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isRTL
                          ? 'رئيس كل دولة هو صاحب أعلى نقاط دورة. النقاط تُحسب من: الاشتراكات، النشاط اليومي، المسابقات، والإحالات. الرئاسة تلقائية وتتحدث يومياً.'
                          : 'Each country\'s president is the user with the highest cycle points. Points come from: subscriptions, daily activity, contests, and referrals. Presidency is automatic and updates daily.'}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Top 10 Users */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm flex items-center gap-1">
                      <BarChart3 className="w-4 h-4" />
                      {isRTL ? 'أعلى 10 مستخدمين' : 'Top 10 Users'}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={fetchLeaders} disabled={isLoadingLeaders}>
                      <RefreshCcw className={`w-3 h-3 ${isLoadingLeaders ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  {isLoadingLeaders ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topUsers.slice(0, 10).map((user, idx) => (
                        <Card key={user.user_id} className="p-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              idx === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                              idx === 1 ? 'bg-gray-400/20 text-gray-500' :
                              idx === 2 ? 'bg-amber-700/20 text-amber-700' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {idx + 1}
                            </div>
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user.avatar_url || ''} />
                              <AvatarFallback className="text-xs">{user.full_name?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{user.full_name || user.username}</p>
                              <div className="flex items-center gap-1">
                                {user.country && (
                                  <span className="text-[10px] text-muted-foreground">{user.country}</span>
                                )}
                                {user.rank && (
                                  <Badge className={`text-[10px] ${getRankBadgeColor(user.rank)}`}>
                                    {isRTL ? getRankLabelAr(user.rank) : user.rank}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-sm text-primary">{user.cycle_points.toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground">{isRTL ? 'نقطة' : 'pts'}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* Presidents by Country Tab */}
          <TabsContent value="presidents" className="space-y-3">
            <Card className="p-3 bg-blue-500/5 border-blue-500/20">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-muted-foreground">
                  {isRTL
                    ? 'صاحب أعلى نقاط دورة في كل دولة يصبح رئيسها تلقائياً'
                    : 'The user with the highest cycle points per country becomes its president automatically'}
                </p>
              </div>
            </Card>

            {isLoadingLeaders ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : countryLeaders.length === 0 ? (
              <Card className="p-8 text-center">
                <Crown className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  {isRTL ? 'لا توجد بيانات للدورة الحالية' : 'No data for current cycle'}
                </p>
              </Card>
            ) : (
              countryLeaders.map((leader, idx) => (
                <Card key={leader.country} className={`p-3 ${idx === 0 ? 'border-yellow-500/30 bg-yellow-500/5' : ''}`}>
                  <div className="flex items-center gap-3">
                    {idx === 0 && <Crown className="w-4 h-4 text-yellow-500 shrink-0" />}
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarImage src={leader.avatar_url || ''} />
                      <AvatarFallback className="text-xs">{leader.full_name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{leader.full_name || leader.username}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Globe className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{leader.country}</span>
                        <Badge className="text-[10px] bg-yellow-500/20 text-yellow-600">
                          {isRTL ? 'رئيس' : 'President'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary">{leader.total_points.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{isRTL ? 'نقطة' : 'pts'}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-3">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={fetchCycles} disabled={isLoadingCycles}>
                <RefreshCcw className={`w-4 h-4 me-1 ${isLoadingCycles ? 'animate-spin' : ''}`} />
                {isRTL ? 'تحديث' : 'Refresh'}
              </Button>
            </div>

            {isLoadingCycles ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
              </div>
            ) : cycles.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  {isRTL ? 'لا توجد دورات مسجلة' : 'No cycles recorded'}
                </p>
              </Card>
            ) : (
              cycles.map(c => (
                <Card key={c.id} className={`p-4 ${c.status === 'active' ? 'border-green-500/30 bg-green-500/5' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold">
                          {isRTL ? `الدورة ${c.cycle_number}` : `Cycle ${c.cycle_number}`}
                        </p>
                        <Badge className={
                          c.status === 'active' ? 'bg-green-500/20 text-green-600 text-[10px]' :
                          c.status === 'completed' ? 'bg-blue-500/20 text-blue-600 text-[10px]' :
                          'bg-muted text-muted-foreground text-[10px]'
                        }>
                          {c.status === 'active' ? (isRTL ? 'نشط' : 'Active') :
                           c.status === 'completed' ? (isRTL ? 'منتهي' : 'Completed') :
                           c.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(c.start_date)} → {formatDate(c.end_date)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.total_days} {isRTL ? 'يوم' : 'days'} • {c.total_weeks} {isRTL ? 'أسبوع' : 'weeks'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

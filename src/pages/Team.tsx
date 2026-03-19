import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FixedSizeList as List } from 'react-window';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { UserIdentityCard } from '@/components/team/UserIdentityCard';
import { ActivityCard } from '@/components/team/ActivityCard';
import { PromotionCard } from '@/components/team/PromotionCard';
import { WarningCard } from '@/components/team/WarningCard';
import { ReferralCodeCard } from '@/components/team/ReferralCodeCard';
import { TeamRankingCard } from '@/components/team/TeamRankingCard';
import { TeamLevelBreakdown } from '@/components/team/TeamLevelBreakdown';
import { DirectLeaderCard } from '@/components/team/DirectLeaderCard';
import { TeamEarningsSummaryCard } from '@/components/team/TeamEarningsSummaryCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeamHierarchy } from '@/hooks/useTeamHierarchy';
import { useTeamStats } from '@/hooks/useTeamStats';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, ChevronRight, Loader2, UserCheck, UserX, Search, X } from 'lucide-react';
import type { TeamMemberData } from '@/hooks/useTeamHierarchy';

type ViewLevel = 'overview' | 'direct' | 'indirect';
type FilterType = 'all' | 'active' | 'inactive';

// ── Team Member Card ──────────────────────────────────────────────────────────
function TeamMemberCard({
  member,
  isRTL,
  onViewTeam,
}: {
  member: TeamMemberData;
  isRTL: boolean;
  onViewTeam?: () => void;
}) {
  return (
    <Card className="p-3 mx-0">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={member.avatar_url || ''} />
          <AvatarFallback className="bg-muted">
            {member.name?.charAt(0) || '👤'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{member.name}</p>
            {member.weekly_active ? (
              <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30 shrink-0">
                <UserCheck className="h-3 w-3 mr-0.5" />
                {isRTL ? 'نشط' : 'Active'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground shrink-0">
                <UserX className="h-3 w-3 mr-0.5" />
                {isRTL ? 'غير نشط' : 'Inactive'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">@{member.username}</p>
          <p className="text-xs text-muted-foreground">
            {isRTL ? 'الرتبة:' : 'Rank:'} {member.rank} | {isRTL ? 'أسابيع نشطة:' : 'Active weeks:'} {member.active_weeks}/14
          </p>
        </div>

        {member.direct_count > 0 && onViewTeam && (
          <Button variant="ghost" size="sm" onClick={onViewTeam} className="gap-1 shrink-0">
            <Users className="h-4 w-4" />
            <span className="text-xs">{member.direct_count}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}

// ── Search + Filter Bar ───────────────────────────────────────────────────────
function SearchFilterBar({
  isRTL,
  search,
  filter,
  onSearch,
  onFilter,
}: {
  isRTL: boolean;
  search: string;
  filter: FilterType;
  onSearch: (v: string) => void;
  onFilter: (f: FilterType) => void;
}) {
  return (
    <div className="space-y-2 mb-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 pr-9"
          placeholder={isRTL ? 'ابحث عن عضو...' : 'Search member...'}
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => onSearch('')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {(['all', 'active', 'inactive'] as FilterType[]).map(f => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            className="text-xs h-7 px-3"
            onClick={() => onFilter(f)}
          >
            {f === 'all'
              ? isRTL ? 'الكل' : 'All'
              : f === 'active'
              ? isRTL ? 'نشط' : 'Active'
              : isRTL ? 'غير نشط' : 'Inactive'}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ── Virtualized Member List ───────────────────────────────────────────────────
const ITEM_HEIGHT = 76;

function VirtualMemberList({
  members,
  isRTL,
  onViewTeam,
  height,
}: {
  members: TeamMemberData[];
  isRTL: boolean;
  onViewTeam?: (id: string) => void;
  height: number;
}) {
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const member = members[index];
      return (
        <div style={{ ...style, paddingBottom: 8, paddingLeft: 16, paddingRight: 16 }}>
          <TeamMemberCard
            member={member}
            isRTL={isRTL}
            onViewTeam={
              member.direct_count > 0 && onViewTeam
                ? () => onViewTeam(member.member_id)
                : undefined
            }
          />
        </div>
      );
    },
    [members, isRTL, onViewTeam]
  );

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'لا يوجد أعضاء' : 'No members found'}
        </p>
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={members.length}
      itemSize={ITEM_HEIGHT}
      width="100%"
    >
      {Row}
    </List>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
function TeamContent() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [viewLevel, setViewLevel] = useState<ViewLevel>('overview');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const { directMembers, getIndirectByParent, loading: hierarchyLoading } = useTeamHierarchy(5);
  const { directCount, indirectCount, activeDirectCount, loading: statsLoading } = useTeamStats();

  const loading = hierarchyLoading || statsLoading;
  const inactiveCount = directCount - activeDirectCount;

  // Filtered + searched direct members
  const filteredMembers = useMemo(() => {
    let list = directMembers;
    if (filter === 'active') list = list.filter(m => m.weekly_active);
    if (filter === 'inactive') list = list.filter(m => !m.weekly_active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        m => m.name.toLowerCase().includes(q) || m.username.toLowerCase().includes(q)
      );
    }
    return list;
  }, [directMembers, filter, search]);

  const listHeight = Math.min(
    filteredMembers.length * ITEM_HEIGHT,
    typeof window !== 'undefined' ? window.innerHeight * 0.6 : 480
  );

  const handleViewIndirect = (memberId: string) => {
    setSelectedMemberId(memberId);
    setViewLevel('indirect');
  };

  const handleBack = () => {
    if (viewLevel === 'indirect') {
      setViewLevel('direct');
      setSelectedMemberId(null);
    } else {
      setViewLevel('overview');
    }
  };

  // ── Indirect view ──────────────────────────────────────────────────────────
  if (viewLevel === 'indirect' && selectedMemberId) {
    const selectedMember = directMembers.find(m => m.member_id === selectedMemberId);
    const memberTeam = getIndirectByParent(selectedMemberId);

    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader
          title={isRTL ? `فريق ${selectedMember?.name || ''}` : `${selectedMember?.name || ''}'s Team`}
          onBack={handleBack}
        />
        <main className="flex-1 px-4 py-4">
          <VirtualMemberList
            members={memberTeam}
            isRTL={isRTL}
            height={listHeight || 400}
          />
        </main>
      </div>
    );
  }

  // ── Direct view ────────────────────────────────────────────────────────────
  if (viewLevel === 'direct') {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={isRTL ? 'الفريق المباشر' : 'Direct Team'} onBack={handleBack} />
        <main className="flex-1 px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <SearchFilterBar
                isRTL={isRTL}
                search={search}
                filter={filter}
                onSearch={setSearch}
                onFilter={setFilter}
              />
              <p className="text-xs text-muted-foreground mb-2 px-1">
                {isRTL
                  ? `${filteredMembers.length} من ${directMembers.length} عضو`
                  : `${filteredMembers.length} of ${directMembers.length} members`}
              </p>
              <VirtualMemberList
                members={filteredMembers}
                isRTL={isRTL}
                onViewTeam={handleViewIndirect}
                height={listHeight || 400}
              />
            </>
          )}
        </main>
      </div>
    );
  }

  // ── Overview with Tabs ─────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={t('team.title')} />
      <main className="flex-1 px-4 py-4 pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="overview" className="text-xs">
              {isRTL ? 'نظرة عامة' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="direct" className="text-xs">
              {isRTL ? 'المباشر' : 'Direct'}
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs">
              {isRTL ? 'الإحصائيات' : 'Stats'}
            </TabsTrigger>
            <TabsTrigger value="referral" className="text-xs">
              {isRTL ? 'الإحالة' : 'Referral'}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            <DirectLeaderCard />
            <UserIdentityCard />

            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {isRTL ? 'حجم الفريق' : 'Team Size'}
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Card
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setViewLevel('direct')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-primary">{directCount}</p>
                        <p className="text-xs text-muted-foreground">{isRTL ? 'مباشر' : 'Direct'}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>

                  <Card className="p-3">
                    <p className="text-2xl font-bold text-muted-foreground">{indirectCount}</p>
                    <p className="text-xs text-muted-foreground">{isRTL ? 'غير مباشر' : 'Indirect'}</p>
                  </Card>
                </div>
              )}

              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{isRTL ? 'إجمالي الفريق' : 'Total Team'}</span>
                  <span className="font-bold">{directCount + indirectCount}</span>
                </div>
              </div>
            </Card>

            <ActivityCard />
            <PromotionCard />
            <WarningCard inactiveCount={inactiveCount} directTeamCount={directCount} />
          </TabsContent>

          {/* Direct Tab with Search + Filter + Virtual List */}
          <TabsContent value="direct" className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <SearchFilterBar
                  isRTL={isRTL}
                  search={search}
                  filter={filter}
                  onSearch={setSearch}
                  onFilter={setFilter}
                />
                <p className="text-xs text-muted-foreground mb-2 px-1">
                  {isRTL
                    ? `${filteredMembers.length} من ${directMembers.length} عضو`
                    : `${filteredMembers.length} of ${directMembers.length} members`}
                </p>
                <VirtualMemberList
                  members={filteredMembers}
                  isRTL={isRTL}
                  onViewTeam={id => {
                    setSelectedMemberId(id);
                    setViewLevel('indirect');
                  }}
                  height={listHeight || 400}
                />
              </>
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4 mt-0">
            {/* Earnings summary — the main reason people open this tab */}
            <TeamEarningsSummaryCard />
            <TeamRankingCard />
            <TeamLevelBreakdown />
            <ActivityCard />
          </TabsContent>

          {/* Referral Tab */}
          <TabsContent value="referral" className="space-y-4 mt-0">
            <ReferralCodeCard />

            <Card className="p-4">
              <h3 className="font-semibold mb-3">
                {isRTL ? 'كيف تعمل الإحالة؟' : 'How Referral Works?'}
              </h3>

              <div className="space-y-3">
                {[
                  {
                    step: 1,
                    en: { title: 'Share Your Code', desc: 'Send your referral code to friends' },
                    ar: { title: 'شارك كودك', desc: 'أرسل كود الإحالة لأصدقائك' },
                    color: 'primary',
                  },
                  {
                    step: 2,
                    en: { title: 'They Join WINOVA', desc: 'They use your code when signing up' },
                    ar: { title: 'ينضمون إلى WINOVA', desc: 'يستخدمون كودك عند التسجيل' },
                    color: 'primary',
                  },
                  {
                    step: 3,
                    en: { title: 'Earn Points & Rewards', desc: 'The more active your team, the more you earn' },
                    ar: { title: 'تكسب نقاط ومكافآت', desc: 'كلما كان فريقك نشيطاً، زادت مكافآتك' },
                    color: 'success',
                  },
                ].map(({ step, en, ar, color }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full bg-${color}/10 flex items-center justify-center text-xs font-bold text-${color} shrink-0`}>
                      {step}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{isRTL ? ar.title : en.title}</p>
                      <p className="text-xs text-muted-foreground">{isRTL ? ar.desc : en.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
}

export default function TeamPage() {
  return <TeamContent />;
}

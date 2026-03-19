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
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, ChevronRight, Loader2, UserCheck, UserX, Search, X } from 'lucide-react';
import type { TeamMemberData } from '@/hooks/useTeamHierarchy';

type ViewLevel = 'overview' | 'direct' | 'indirect';
type FilterType = 'all' | 'active' | 'inactive';

// ── Consistent row height — must match actual card height including gap ────────
const ITEM_HEIGHT = 96; // p-3 card ≈ 88px + 8px gap

// ── Team Member Card ───────────────────────────────────────────────────────────
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
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={member.avatar_url || ''} alt={member.name} />
          <AvatarFallback className="bg-muted text-sm font-medium">
            {member.name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
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
          <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
          <p className="text-xs text-muted-foreground">
            {isRTL ? `الرتبة: ${member.rank} | أسابيع: ${member.active_weeks}/14` : `Rank: ${member.rank} | Weeks: ${member.active_weeks}/14`}
          </p>
        </div>

        {member.direct_count > 0 && onViewTeam && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewTeam}
            className="gap-1 shrink-0"
            aria-label={isRTL ? `عرض فريق ${member.name}` : `View ${member.name}'s team`}
          >
            <Users className="h-4 w-4" />
            <span className="text-xs">{member.direct_count}</span>
            <ChevronRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        )}
      </div>
    </Card>
  );
}

// ── Search + Filter Bar ────────────────────────────────────────────────────────
function SearchFilterBar({
  isRTL,
  search,
  filter,
  total,
  filtered,
  onSearch,
  onFilter,
}: {
  isRTL: boolean;
  search: string;
  filter: FilterType;
  total: number;
  filtered: number;
  onSearch: (v: string) => void;
  onFilter: (f: FilterType) => void;
}) {
  return (
    <div className="space-y-2 mb-3">
      {/* RTL-aware search input */}
      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`} />
        <Input
          dir={isRTL ? 'rtl' : 'ltr'}
          className={isRTL ? 'pr-9 pl-9' : 'pl-9 pr-9'}
          placeholder={isRTL ? 'ابحث بالاسم أو اسم المستخدم...' : 'Search by name or username...'}
          value={search}
          onChange={e => onSearch(e.target.value)}
          aria-label={isRTL ? 'بحث عن عضو' : 'Search member'}
        />
        {search && (
          <button
            className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors ${isRTL ? 'left-3' : 'right-3'}`}
            onClick={() => onSearch('')}
            aria-label={isRTL ? 'مسح البحث' : 'Clear search'}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter buttons + result count */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
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
        <p className="text-xs text-muted-foreground shrink-0">
          {isRTL ? `${filtered} / ${total}` : `${filtered} / ${total}`}
        </p>
      </div>
    </div>
  );
}

// ── Virtualized Member List ────────────────────────────────────────────────────
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
      <div className="text-center py-16">
        <Users className="h-14 w-14 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          {isRTL ? 'لا يوجد أعضاء مطابقون' : 'No matching members'}
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

// ── Member List Skeleton ───────────────────────────────────────────────────────
function MemberListSkeleton() {
  return (
    <div className="space-y-2 px-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
function TeamContent() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [viewLevel, setViewLevel] = useState<ViewLevel>('overview');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Separate search state for tab view vs full-screen view
  const [tabSearch, setTabSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<FilterType>('all');
  const [fullSearch, setFullSearch] = useState('');
  const [fullFilter, setFullFilter] = useState<FilterType>('all');

  const { directMembers, getIndirectByParent, loading: hierarchyLoading } = useTeamHierarchy(5);
  const { directCount, indirectCount, activeDirectCount, loading: statsLoading } = useTeamStats();

  const loading = hierarchyLoading || statsLoading;
  const inactiveCount = directCount - activeDirectCount;

  // Available viewport height for list (minus header + search bar + padding)
  const listHeight =
    typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.58) : 440;

  // Filtered lists — separate for tab and full-screen view
  const applyFilter = (members: TeamMemberData[], search: string, filter: FilterType) => {
    let list = members;
    if (filter === 'active') list = list.filter(m => m.weekly_active);
    if (filter === 'inactive') list = list.filter(m => !m.weekly_active);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        m =>
          m.name.toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const tabFiltered = useMemo(
    () => applyFilter(directMembers, tabSearch, tabFilter),
    [directMembers, tabSearch, tabFilter]
  );

  const fullFiltered = useMemo(
    () => applyFilter(directMembers, fullSearch, fullFilter),
    [directMembers, fullSearch, fullFilter]
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

  // ── Indirect (sub-team) view ───────────────────────────────────────────────
  if (viewLevel === 'indirect' && selectedMemberId) {
    const selectedMember = directMembers.find(m => m.member_id === selectedMemberId);
    const memberTeam = getIndirectByParent(selectedMemberId);

    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader
          title={
            isRTL
              ? `فريق ${selectedMember?.name || ''}`
              : `${selectedMember?.name || ''}'s Team`
          }
          onBack={handleBack}
        />
        <main className="flex-1 py-4">
          <VirtualMemberList
            members={memberTeam}
            isRTL={isRTL}
            height={listHeight}
          />
        </main>
      </div>
    );
  }

  // ── Full-screen Direct view (from Overview card click) ────────────────────
  if (viewLevel === 'direct') {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader
          title={isRTL ? 'الفريق المباشر' : 'Direct Team'}
          onBack={handleBack}
        />
        <main className="flex-1 px-4 pt-4">
          {loading ? (
            <MemberListSkeleton />
          ) : (
            <>
              <SearchFilterBar
                isRTL={isRTL}
                search={fullSearch}
                filter={fullFilter}
                total={directMembers.length}
                filtered={fullFiltered.length}
                onSearch={setFullSearch}
                onFilter={setFullFilter}
              />
              <VirtualMemberList
                members={fullFiltered}
                isRTL={isRTL}
                onViewTeam={handleViewIndirect}
                height={listHeight}
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

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            <DirectLeaderCard />
            <UserIdentityCard />

            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {isRTL ? 'حجم الفريق' : 'Team Size'}
              </h3>

              {loading ? (
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Card
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors border-primary/20"
                    onClick={() => setViewLevel('direct')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-primary">{directCount}</p>
                        <p className="text-xs text-muted-foreground">{isRTL ? 'مباشر' : 'Direct'}</p>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-muted-foreground ${isRTL ? 'rotate-180' : ''}`} />
                    </div>
                  </Card>

                  <Card className="p-3">
                    <p className="text-2xl font-bold text-muted-foreground">{indirectCount}</p>
                    <p className="text-xs text-muted-foreground">{isRTL ? 'غير مباشر' : 'Indirect'}</p>
                  </Card>
                </div>
              )}

              {!loading && (
                <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{isRTL ? 'إجمالي الفريق' : 'Total Team'}</span>
                  <span className="font-bold">{directCount + indirectCount}</span>
                </div>
              )}
            </Card>

            <ActivityCard />
            <PromotionCard />
            <WarningCard inactiveCount={inactiveCount} directTeamCount={directCount} />
          </TabsContent>

          {/* ── Direct tab ── */}
          <TabsContent value="direct" className="mt-0">
            {loading ? (
              <MemberListSkeleton />
            ) : (
              <>
                <SearchFilterBar
                  isRTL={isRTL}
                  search={tabSearch}
                  filter={tabFilter}
                  total={directMembers.length}
                  filtered={tabFiltered.length}
                  onSearch={setTabSearch}
                  onFilter={setTabFilter}
                />
                <VirtualMemberList
                  members={tabFiltered}
                  isRTL={isRTL}
                  onViewTeam={handleViewIndirect}
                  height={listHeight}
                />
              </>
            )}
          </TabsContent>

          {/* ── Stats tab ── */}
          <TabsContent value="stats" className="space-y-4 mt-0">
            <TeamEarningsSummaryCard />
            <TeamRankingCard />
            <TeamLevelBreakdown />
            <ActivityCard />
          </TabsContent>

          {/* ── Referral tab ── */}
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
                  },
                  {
                    step: 2,
                    en: { title: 'They Join WINOVA', desc: 'They use your code when signing up' },
                    ar: { title: 'ينضمون إلى WINOVA', desc: 'يستخدمون كودك عند التسجيل' },
                  },
                  {
                    step: 3,
                    en: { title: 'Earn Points & Rewards', desc: 'The more active your team, the more you earn' },
                    ar: { title: 'تكسب نقاط ومكافآت', desc: 'كلما كان فريقك نشيطاً، زادت مكافآتك' },
                  },
                ].map(({ step, en, ar }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
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

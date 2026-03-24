import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { OnboardingTip } from '@/components/ui/OnboardingTip';
import { UserIdentityCard } from '@/components/team/UserIdentityCard';
import { ActivityCard } from '@/components/team/ActivityCard';
import { PromotionCard } from '@/components/team/PromotionCard';
import { WarningCard } from '@/components/team/WarningCard';
import { ReferralCodeCard } from '@/components/team/ReferralCodeCard';
import { TeamRankingCard } from '@/components/team/TeamRankingCard';
import { TeamLevelBreakdown } from '@/components/team/TeamLevelBreakdown';
import { DirectLeaderCard } from '@/components/team/DirectLeaderCard';
import { TeamEarningsSummaryCard } from '@/components/team/TeamEarningsSummaryCard';
import { MemberDetailPanel } from '@/components/team/MemberDetailPanel';
import { SupervisorChangeSheet } from '@/components/team/SupervisorChangeSheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeamHierarchy } from '@/hooks/useTeamHierarchy';
import { useTeamStats } from '@/hooks/useTeamStats';
import { useUser } from '@/contexts/UserContext';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, ChevronRight, UserCheck, UserX,
  Search, X, Star, ArrowRight, AlertTriangle,
} from 'lucide-react';
import type { TeamMemberData } from '@/hooks/useTeamHierarchy';
import type { TeamMember } from '@/components/team/TeamMemberCard';

type FilterType = 'all' | 'active' | 'inactive';

// Breadcrumb trail for drill-down navigation
interface BreadcrumbEntry {
  memberId: string;
  name: string;
}

// ── Team Member Card ────────────────────────────────────────────────────────────
function TeamMemberCard({
  member,
  isRTL,
  onViewProfile,
  onViewTeam,
}: {
  member: TeamMemberData;
  isRTL: boolean;
  onViewProfile: () => void;
  onViewTeam?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card
      className="p-3 cursor-pointer hover:bg-muted/40 active:scale-[0.99] transition-all"
      onClick={onViewProfile}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onViewProfile()}
      aria-label={t('team.viewProfile', { name: member.name })}
    >
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
                {t('common.active')}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground shrink-0">
                <UserX className="h-3 w-3 mr-0.5" />
                {t('common.inactive')}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
          <p className="text-xs text-muted-foreground">
            {t('team.memberRankWeeks', { rank: member.rank, weeks: member.active_weeks })}
            {member.weekly_streak > 0 && (
              <span className="ms-1.5 text-orange-500 font-medium">
                {`🔥 ${member.weekly_streak}`}
              </span>
            )}
          </p>
        </div>

        {member.direct_count > 0 && onViewTeam ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={e => { e.stopPropagation(); onViewTeam(); }}
            className="gap-1 shrink-0"
            aria-label={t('team.viewTeamOf', { name: member.name })}
          >
            <Users className="h-4 w-4" />
            <span className="text-xs">{member.direct_count}</span>
            <ChevronRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
          </Button>
        ) : (
          <ChevronRight className={`h-4 w-4 text-muted-foreground/40 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
        )}
      </div>
    </Card>
  );
}

// ── Search + Filter Bar ─────────────────────────────────────────────────────────
function SearchFilterBar({
  isRTL, search, filter, total, filtered, onSearch, onFilter,
}: {
  isRTL: boolean; search: string; filter: FilterType;
  total: number; filtered: number;
  onSearch: (v: string) => void; onFilter: (f: FilterType) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 mb-3">
      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`} />
        <Input
          dir={isRTL ? 'rtl' : 'ltr'}
          className={isRTL ? 'pr-9 pl-9' : 'pl-9 pr-9'}
          placeholder={t('team.searchPlaceholder')}
          value={search}
          onChange={e => onSearch(e.target.value)}
          aria-label={t('team.searchMember')}
        />
        {search && (
          <button
            className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors ${isRTL ? 'left-3' : 'right-3'}`}
            onClick={() => onSearch('')}
            aria-label={t('common.clearSearch')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {(['all', 'active', 'inactive'] as FilterType[]).map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} className="text-xs h-7 px-3" onClick={() => onFilter(f)}>
              {f === 'all' ? t('common.all') : f === 'active' ? t('common.active') : t('common.inactive')}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground shrink-0">{filtered} / {total}</p>
      </div>
    </div>
  );
}

// ── Scrollable List ──────────────────────────────────────────────────────────────
function VirtualMemberList({
  members, isRTL, onViewProfile, onViewTeam, height,
}: {
  members: TeamMemberData[]; isRTL: boolean; height: number;
  onViewProfile: (id: string) => void;
  onViewTeam?: (id: string) => void;
}) {
  const { t } = useTranslation();
  if (members.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="h-14 w-14 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t('team.noMatchingMembers')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto" style={{ maxHeight: height }}>
      {members.map(member => (
        <TeamMemberCard
          key={member.member_id}
          member={member}
          isRTL={isRTL}
          onViewProfile={() => onViewProfile(member.member_id)}
          onViewTeam={member.direct_count > 0 && onViewTeam ? () => onViewTeam(member.member_id) : undefined}
        />
      ))}
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────────────
function MemberListSkeleton() {
  return (
    <div className="space-y-2 px-4">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
    </div>
  );
}

// ── Breadcrumb ──────────────────────────────────────────────────────────────────
function HierarchyBreadcrumb({
  trail, isRTL, onNavigate,
}: {
  trail: BreadcrumbEntry[]; isRTL: boolean; onNavigate: (index: number) => void;
}) {
  const { t } = useTranslation();
  if (trail.length === 0) return null;
  return (
    <div className={`flex items-center gap-1 px-4 py-2 text-xs text-muted-foreground overflow-x-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
      <button className="text-primary shrink-0 hover:underline" onClick={() => onNavigate(-1)}>
        {t('team.title')}
      </button>
      {trail.map((entry, i) => (
        <span key={entry.memberId} className="flex items-center gap-1 shrink-0">
          <ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
          {i < trail.length - 1 ? (
            <button className="text-primary hover:underline" onClick={() => onNavigate(i)}>
              {entry.name}
            </button>
          ) : (
            <span className="font-medium text-foreground">{entry.name}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ── applyFilter helper ──────────────────────────────────────────────────────────
function applyFilter(members: TeamMemberData[], search: string, filter: FilterType) {
  let list = members;
  if (filter === 'active')   list = list.filter(m => m.weekly_active);
  if (filter === 'inactive') list = list.filter(m => !m.weekly_active);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(m => m.name.toLowerCase().includes(q) || m.username.toLowerCase().includes(q));
  }
  return list;
}

// ── Helpers: convert TeamMemberData → TeamMember (for MemberDetailPanel) ────────
function toTeamMember(m: TeamMemberData, totalWeeks = 14): TeamMember {
  return {
    id: m.member_id,
    name: m.name,
    nameAr: m.name,
    username: m.username,
    rank: m.rank as TeamMember['rank'],
    active: m.weekly_active,
    avatar: m.avatar_url || m.name.charAt(0),
    activeWeeks: m.active_weeks,
    totalWeeks,
    directTeam: m.direct_count,
    indirectTeam: 0,
    teamSize: m.direct_count,
  };
}

// ── Main Component ──────────────────────────────────────────────────────────────
function TeamContent() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const { user } = useUser();

  // Navigation state: breadcrumb trail for hierarchical drill-down
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Member detail panel state
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Supervisor change sheet
  const [supervisorSheetOpen, setSupervisorSheetOpen] = useState(false);

  // Separate search state per view
  const [tabSearch,  setTabSearch]  = useState('');
  const [tabFilter,  setTabFilter]  = useState<FilterType>('all');
  const [fullSearch, setFullSearch] = useState('');
  const [fullFilter, setFullFilter] = useState<FilterType>('all');

  // Show full-screen Direct view (from clicking the card in overview)
  const [showFullDirect, setShowFullDirect] = useState(false);

  const { members, directMembers, getIndirectByParent, loading: hierarchyLoading } = useTeamHierarchy(5);
  const { directCount, indirectCount, activeDirectCount, loading: statsLoading, totalWeeks } = useTeamStats();

  const loading = hierarchyLoading || statsLoading;
  const inactiveCount = directCount - activeDirectCount;
  const listHeight = typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.58) : 440;

  // Warning conditions (for toast + badge)
  const userInactive = !user.weeklyActive;
  const teamActivityLow = directCount > 0 && (inactiveCount / directCount) > 0.5;
  const cycleEnding = user.currentWeek >= 12;
  const activityLow = user.activeWeeks < user.currentWeek * 0.5;
  const hasWarning = userInactive || teamActivityLow || cycleEnding || activityLow;

  // Show warning toast once on mount
  const toastShown = useRef(false);
  useEffect(() => {
    if (toastShown.current || loading || !hasWarning) return;
    toastShown.current = true;
    const title = userInactive
      ? t('team.warningInactive')
      : teamActivityLow
        ? t('team.warningInactiveMembers', { count: inactiveCount })
        : cycleEnding
          ? t('team.warningCycleEnding', { weeks: 14 - user.currentWeek })
          : t('team.warningActivityLow');
    toast({ title, variant: 'destructive' });
  }, [loading, hasWarning]);

  // Current view: root = directMembers, otherwise sub-team of last breadcrumb entry
  const currentParentId = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].memberId : null;
  const currentMembers  = currentParentId
    ? getIndirectByParent(currentParentId)
    : directMembers;

  const tabFiltered  = useMemo(() => applyFilter(directMembers, tabSearch,  tabFilter),  [directMembers, tabSearch,  tabFilter]);
  const fullFiltered = useMemo(() => applyFilter(currentMembers, fullSearch, fullFilter), [currentMembers, fullSearch, fullFilter]);

  const handleViewProfile = (memberId: string) => {
    const member = members.find(m => m.member_id === memberId);
    if (member) {
      setSelectedMember(toTeamMember(member, totalWeeks || 14));
      setPanelOpen(true);
    } else {
      navigate(`/user/${memberId}`);
    }
  };

  const handleDrillDown = (memberId: string) => {
    const member = members.find(m => m.member_id === memberId);
    if (!member) return;
    setBreadcrumb(prev => [...prev, { memberId, name: member.name }]);
  };

  const handleBreadcrumbNav = (index: number) => {
    if (index === -1) {
      // Back to root
      setBreadcrumb([]);
    } else {
      // Trim to selected level
      setBreadcrumb(prev => prev.slice(0, index + 1));
    }
    setFullSearch('');
    setFullFilter('all');
  };

  const handleBack = () => {
    if (breadcrumb.length > 0) {
      setBreadcrumb(prev => prev.slice(0, -1));
      setFullSearch('');
      setFullFilter('all');
    } else {
      setShowFullDirect(false);
    }
  };

  // ── Full-screen Direct / Sub-team view ─────────────────────────────────────
  if (showFullDirect) {
    const viewTitle = breadcrumb.length > 0
      ? t('team.subteamOf', { name: breadcrumb[breadcrumb.length - 1].name })
      : t('team.directTeam');

    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={viewTitle} onBack={handleBack} />

        <HierarchyBreadcrumb
          trail={breadcrumb}
          isRTL={isRTL}
          onNavigate={handleBreadcrumbNav}
        />

        <main className="flex-1 px-4 pt-2">
          {loading ? (
            <MemberListSkeleton />
          ) : (
            <>
              <SearchFilterBar
                isRTL={isRTL}
                search={fullSearch}
                filter={fullFilter}
                total={currentMembers.length}
                filtered={fullFiltered.length}
                onSearch={setFullSearch}
                onFilter={setFullFilter}
              />
              <VirtualMemberList
                members={fullFiltered}
                isRTL={isRTL}
                onViewProfile={handleViewProfile}
                onViewTeam={handleDrillDown}
                height={listHeight}
              />
            </>
          )}
        </main>
      </div>
    );
  }

  // ── Overview with Tabs ──────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={t('team.title')} />
      <main className="flex-1 px-4 py-4 pb-20">
        {/* Onboarding: subscriber earns 0% commission */}
        <div className="mb-3">
          <OnboardingTip tipType="team_subscriber" condition={user.rank === 'subscriber'} />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="overview" className="text-xs relative">
              {t('team.tabOverview')}
              {hasWarning && (
                <span className="absolute top-1 end-1 w-2 h-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
            <TabsTrigger value="direct"   className="text-xs">{t('team.tabDirect')}</TabsTrigger>
            <TabsTrigger value="stats"    className="text-xs">{t('team.tabStats')}</TabsTrigger>
            <TabsTrigger value="referral" className="text-xs">{t('team.tabReferral')}</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            <DirectLeaderCard />
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 text-muted-foreground"
              onClick={() => setSupervisorSheetOpen(true)}
            >
              {t('team.requestSupervisorChange')}
            </Button>
            <UserIdentityCard />

            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t('team.teamSize')}
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
                    onClick={() => { setBreadcrumb([]); setShowFullDirect(true); }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-primary">{directCount}</p>
                        <p className="text-xs text-muted-foreground">{t('team.directLabel')}</p>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-muted-foreground ${isRTL ? 'rotate-180' : ''}`} />
                    </div>
                  </Card>
                  <Card className="p-3">
                    <p className="text-2xl font-bold text-muted-foreground">{indirectCount}</p>
                    <p className="text-xs text-muted-foreground">{t('team.indirect')}</p>
                  </Card>
                </div>
              )}
              {!loading && (
                <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('team.totalTeam')}</span>
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
            {loading ? <MemberListSkeleton /> : (
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
                  onViewProfile={handleViewProfile}
                  onViewTeam={id => { setBreadcrumb([{ memberId: id, name: members.find(m => m.member_id === id)?.name || '' }]); setShowFullDirect(true); }}
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

            {/* Link to Spotlight ranking */}
            <Card
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-dashed"
              onClick={() => navigate('/spotlight')}
            >
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Star className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className={isRTL ? 'text-right' : ''}>
                    <p className="font-medium text-sm">{t('team.spotlightRanking')}</p>
                    <p className="text-xs text-muted-foreground">{t('team.spotlightRankingDesc')}</p>
                  </div>
                </div>
                <ArrowRight className={`h-5 w-5 text-muted-foreground shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
              </div>
            </Card>
          </TabsContent>

          {/* ── Referral tab ── */}
          <TabsContent value="referral" className="space-y-4 mt-0">
            <ReferralCodeCard />
            <Card className="p-4">
              <h3 className="font-semibold mb-3">{t('team.howReferralWorks')}</h3>
              <div className="space-y-3">
                {([
                  { step: 1, titleKey: 'team.referralStep1Title', descKey: 'team.referralStep1Desc' },
                  { step: 2, titleKey: 'team.referralStep2Title', descKey: 'team.referralStep2Desc' },
                  { step: 3, titleKey: 'team.referralStep3Title', descKey: 'team.referralStep3Desc' },
                ] as const).map(({ step, titleKey, descKey }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{step}</div>
                    <div>
                      <p className="text-sm font-medium">{t(titleKey)}</p>
                      <p className="text-xs text-muted-foreground">{t(descKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />

      {/* Supervisor Change Sheet */}
      <SupervisorChangeSheet
        open={supervisorSheetOpen}
        onClose={() => setSupervisorSheetOpen(false)}
      />

      {/* Member Detail Panel (bottom sheet) */}
      <MemberDetailPanel
        member={selectedMember}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onViewTeam={selectedMember && selectedMember.teamSize > 0
          ? () => {
              setPanelOpen(false);
              setBreadcrumb([{ memberId: selectedMember.id, name: selectedMember.name }]);
              setShowFullDirect(true);
            }
          : undefined}
      />
    </div>
  );
}

export default function TeamPage() {
  return <TeamContent />;
}

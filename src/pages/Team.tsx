import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { UserIdentityCard } from '@/components/team/UserIdentityCard';
import { TeamSizeCard } from '@/components/team/TeamSizeCard';
import { ActivityCard } from '@/components/team/ActivityCard';
import { PromotionCard } from '@/components/team/PromotionCard';
import { WarningCard } from '@/components/team/WarningCard';
import { DirectTeamList } from '@/components/team/DirectTeamList';
import { IndirectTeamList } from '@/components/team/IndirectTeamList';
import { TeamMember } from '@/components/team/TeamMemberCard';
import { RankSwitcher } from '@/components/team/DevRankSwitcher';
import { ReferralCodeCard } from '@/components/team/ReferralCodeCard';
import { useUser, UserRank } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users } from 'lucide-react';

type ViewLevel = 'overview' | 'direct' | 'indirect';

function TeamContent() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { user: authUser } = useAuth();
  const { language } = useLanguage();
  
  const [viewLevel, setViewLevel] = useState<ViewLevel>('overview');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [directTeamMembers, setDirectTeamMembers] = useState<TeamMember[]>([]);
  const [indirectTeamMembers, setIndirectTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Dev-only: Override rank for testing UI
  const [devRankOverride, setDevRankOverride] = useState<UserRank | null>(null);
  const displayRank = devRankOverride ?? user.rank;

  // Fetch real team members from database
  useEffect(() => {
    async function fetchTeamMembers() {
      if (!authUser) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch direct team members (level 1)
        const { data: directData, error: directError } = await supabase
          .from('team_members')
          .select(`
            member_id,
            level,
            profiles!team_members_member_id_fkey(
              id,
              name,
              username,
              avatar_url,
              rank,
              weekly_active,
              active_weeks,
              current_week
            )
          `)
          .eq('leader_id', authUser.id)
          .eq('level', 1);

        if (directError) throw directError;

        const directMembers: TeamMember[] = (directData || []).map((tm: any) => {
          const profile = tm.profiles;
          return {
            id: tm.member_id,
            name: profile?.name || 'User',
            nameAr: profile?.name || 'مستخدم',
            username: profile?.username || '',
            rank: profile?.rank || 'subscriber',
            active: profile?.weekly_active || false,
            avatar: '👤',
            activeWeeks: profile?.active_weeks || 0,
            totalWeeks: 14,
            directTeam: 0,
            indirectTeam: 0,
            teamSize: 0,
          };
        });

        setDirectTeamMembers(directMembers);
      } catch (err) {
        console.error('Error fetching team members:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTeamMembers();
  }, [authUser]);

  const activeDirectCount = directTeamMembers.filter(m => m.active).length;
  const inactiveCount = directTeamMembers.length - activeDirectCount;

  const handleViewDirect = () => {
    setViewLevel('direct');
  };

  const handleViewIndirect = (member: TeamMember) => {
    setSelectedMember(member);
    setViewLevel('indirect');
  };

  const handleBack = () => {
    if (viewLevel === 'indirect') {
      setViewLevel('direct');
      setSelectedMember(null);
    } else {
      setViewLevel('overview');
    }
  };

  // Level 3: Indirect Team View
  if (viewLevel === 'indirect' && selectedMember) {
    const memberTeam = indirectTeamMembers[selectedMember.id] || [];
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader 
          title={language === 'ar' ? `فريق ${selectedMember.nameAr}` : `${selectedMember.name}'s Team`}
          onBack={handleBack}
        />
        <main className="flex-1 px-4 py-4">
          <IndirectTeamList
            parentMember={selectedMember}
            members={memberTeam}
            onBack={handleBack}
          />
        </main>
      </div>
    );
  }

  // Level 2: Direct Team View
  if (viewLevel === 'direct') {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader 
          title={language === 'ar' ? 'الفريق المباشر' : 'Direct Team'}
          onBack={handleBack}
        />
        <main className="flex-1 px-4 py-4">
          {directTeamMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <h2 className="text-lg font-bold mb-2">
                {language === 'ar' ? 'لا يوجد أعضاء بعد' : 'No Team Members Yet'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'شارك كود الدعوة الخاص بك لبناء فريقك!'
                  : 'Share your referral code to build your team!'}
              </p>
            </div>
          ) : (
            <DirectTeamList
              members={directTeamMembers}
              onBack={handleBack}
              onViewMemberTeam={handleViewIndirect}
            />
          )}
        </main>
      </div>
    );
  }

  // Level 1: Overview (Team page is part of main nav, so use InnerPageHeader + BottomNav)
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={t('team.title')} />
      <main className="flex-1 px-4 py-4 pb-20 space-y-4">
        {/* Rank Switcher - Same as Contest Stage Toggle */}
        <RankSwitcher
          currentRank={displayRank}
          onRankChange={setDevRankOverride}
          language={language}
        />
        
        {/* User Identity Card - uses displayRank for testing */}
        <UserIdentityCard rankOverride={devRankOverride} />

        {/* Referral Code Card - with copy/share */}
        <ReferralCodeCard />

        {/* Team Size Card */}
        <TeamSizeCard 
          onDirectClick={handleViewDirect}
          rankOverride={devRankOverride}
        />

        {/* Activity Card */}
        <ActivityCard rankOverride={devRankOverride} />

        {/* Promotion Card - uses displayRank for testing */}
        <PromotionCard rankOverride={devRankOverride} />

        {/* Warning Card (dynamic) */}
        <WarningCard 
          inactiveCount={inactiveCount}
          directTeamCount={directTeamMembers.length}
        />
      </main>
      <BottomNav />
    </div>
  );
}

export default function TeamPage() {
  return <TeamContent />;
}

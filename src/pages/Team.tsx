import { useState } from 'react';
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
import { useUser, UserRank } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';

// Mock direct team members
const directTeamMembers: TeamMember[] = [
  { 
    id: '1', name: 'Sara A.', nameAr: 'سارة أ.', username: 'sara_a',
    rank: 'marketer' as UserRank, active: true, avatar: '👩', 
    activeWeeks: 5, totalWeeks: 7, directTeam: 4, indirectTeam: 8, teamSize: 12
  },
  { 
    id: '2', name: 'Mohammed K.', nameAr: 'محمد ك.', username: 'mohammed_k',
    rank: 'subscriber' as UserRank, active: true, avatar: '👨', 
    activeWeeks: 6, totalWeeks: 7, directTeam: 2, indirectTeam: 0, teamSize: 2
  },
  { 
    id: '3', name: 'Layla H.', nameAr: 'ليلى ح.', username: 'layla_h',
    rank: 'subscriber' as UserRank, active: false, avatar: '👩', 
    activeWeeks: 2, totalWeeks: 7, directTeam: 0, indirectTeam: 0, teamSize: 0
  },
  { 
    id: '4', name: 'Omar B.', nameAr: 'عمر ب.', username: 'omar_b',
    rank: 'marketer' as UserRank, active: true, avatar: '👨', 
    activeWeeks: 7, totalWeeks: 7, directTeam: 6, indirectTeam: 15, teamSize: 21
  },
  { 
    id: '5', name: 'Nora M.', nameAr: 'نورا م.', username: 'nora_m',
    rank: 'subscriber' as UserRank, active: true, avatar: '👩', 
    activeWeeks: 4, totalWeeks: 7, directTeam: 1, indirectTeam: 0, teamSize: 1
  },
];

// Mock indirect team (nested under direct members)
const getMemberTeam = (memberId: string): TeamMember[] => {
  const teams: Record<string, TeamMember[]> = {
    '1': [
      { id: '1-1', name: 'Ali M.', nameAr: 'علي م.', username: 'ali_m', rank: 'subscriber', active: true, avatar: '👨', activeWeeks: 4, totalWeeks: 7, directTeam: 0, indirectTeam: 0, teamSize: 0 },
      { id: '1-2', name: 'Fatima K.', nameAr: 'فاطمة ك.', username: 'fatima_k', rank: 'subscriber', active: true, avatar: '👩', activeWeeks: 5, totalWeeks: 7, directTeam: 0, indirectTeam: 0, teamSize: 0 },
      { id: '1-3', name: 'Hassan R.', nameAr: 'حسن ر.', username: 'hassan_r', rank: 'subscriber', active: false, avatar: '👨', activeWeeks: 2, totalWeeks: 7, directTeam: 0, indirectTeam: 0, teamSize: 0 },
      { id: '1-4', name: 'Mona S.', nameAr: 'منى س.', username: 'mona_s', rank: 'subscriber', active: true, avatar: '👩', activeWeeks: 3, totalWeeks: 7, directTeam: 0, indirectTeam: 0, teamSize: 0 },
    ],
    '2': [
      { id: '2-1', name: 'Khaled A.', nameAr: 'خالد أ.', username: 'khaled_a', rank: 'subscriber', active: true, avatar: '👨', activeWeeks: 6, totalWeeks: 7, directTeam: 0, indirectTeam: 0, teamSize: 0 },
      { id: '2-2', name: 'Rana B.', nameAr: 'رنا ب.', username: 'rana_b', rank: 'subscriber', active: false, avatar: '👩', activeWeeks: 1, totalWeeks: 7, directTeam: 0, indirectTeam: 0, teamSize: 0 },
    ],
    '4': [
      { id: '4-1', name: 'Youssef T.', nameAr: 'يوسف ت.', username: 'youssef_t', rank: 'subscriber', active: true, avatar: '👨', activeWeeks: 7, totalWeeks: 7, directTeam: 2, indirectTeam: 0, teamSize: 2 },
      { id: '4-2', name: 'Dina F.', nameAr: 'دينا ف.', username: 'dina_f', rank: 'marketer', active: true, avatar: '👩', activeWeeks: 5, totalWeeks: 7, directTeam: 3, indirectTeam: 5, teamSize: 8 },
      { id: '4-3', name: 'Amr G.', nameAr: 'عمرو ج.', username: 'amr_g', rank: 'subscriber', active: true, avatar: '👨', activeWeeks: 4, totalWeeks: 7, directTeam: 0, indirectTeam: 0, teamSize: 0 },
      { id: '4-4', name: 'Salma H.', nameAr: 'سلمى ح.', username: 'salma_h', rank: 'subscriber', active: false, avatar: '👩', activeWeeks: 2, totalWeeks: 7, directTeam: 0, indirectTeam: 0, teamSize: 0 },
      { id: '4-5', name: 'Ibrahim K.', nameAr: 'إبراهيم ك.', username: 'ibrahim_k', rank: 'subscriber', active: true, avatar: '👨', activeWeeks: 6, totalWeeks: 7, directTeam: 0, indirectTeam: 0, teamSize: 0 },
      { id: '4-6', name: 'Huda L.', nameAr: 'هدى ل.', username: 'huda_l', rank: 'subscriber', active: true, avatar: '👩', activeWeeks: 3, totalWeeks: 7, directTeam: 0, indirectTeam: 0, teamSize: 0 },
    ],
    '5': [
      { id: '5-1', name: 'Ziad N.', nameAr: 'زياد ن.', username: 'ziad_n', rank: 'subscriber', active: true, avatar: '👨', activeWeeks: 5, totalWeeks: 7, directTeam: 0, indirectTeam: 0, teamSize: 0 },
    ],
  };
  return teams[memberId] || [];
};

type ViewLevel = 'overview' | 'direct' | 'indirect';

export default function TeamPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { language } = useLanguage();
  
  const [viewLevel, setViewLevel] = useState<ViewLevel>('overview');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

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
    const memberTeam = getMemberTeam(selectedMember.id);
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
          <DirectTeamList
            members={directTeamMembers}
            onBack={handleBack}
            onViewMemberTeam={handleViewIndirect}
          />
        </main>
      </div>
    );
  }

  // Level 1: Overview (Team page is part of main nav, so use InnerPageHeader + BottomNav)
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={t('team.title')} />
      <main className="flex-1 px-4 py-4 pb-20 space-y-4">
        {/* User Identity Card */}
        <UserIdentityCard />

        {/* Team Size Card */}
        <TeamSizeCard 
          onDirectClick={handleViewDirect}
        />

        {/* Activity Card */}
        <ActivityCard 
          directTeamActiveCount={activeDirectCount}
          directTeamTotalCount={directTeamMembers.length}
        />

        {/* Promotion Card */}
        <PromotionCard activeDirectCount={activeDirectCount} />

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

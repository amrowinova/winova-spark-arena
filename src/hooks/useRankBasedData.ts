import { UserRank } from '@/contexts/UserContext';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RANK-BASED MOCK DATA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Provides appropriate mock data based on user rank level.
 * Higher ranks = larger numbers, focus shifts from individuals to network.
 * 
 * RANK SCALING LOGIC:
 * - Subscriber: Small numbers (0-10), focus on learning
 * - Marketer: Building phase (5-40), focus on direct team
 * - Leader: Managing marketers (40-120), network management
 * - Manager: Operating system (150-500), leader management
 * - President: Country-level (1000+), focus on points/percentages
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface RankBasedTeamData {
  directTeam: number;
  indirectTeam: number;
  teamSize: number;
  activeWeeks: number;
  currentWeek: number;
  totalWeeks: number;
  weeklyRank: number;
  directTeamActiveCount: number;
  directTeamTotalCount: number;
  promotionProgress: number;
  spotlightPoints: number;
  // President-specific
  activeManagers?: number;
  countryActivityPercent?: number;
}

const rankDataMap: Record<UserRank, RankBasedTeamData> = {
  // ═══════════════════════════════════════════════════════════════════════
  // 👤 SUBSCRIBER - Entry level, educational numbers
  // ═══════════════════════════════════════════════════════════════════════
  subscriber: {
    directTeam: 2,
    indirectTeam: 3,
    teamSize: 5,
    activeWeeks: 3,
    currentWeek: 7,
    totalWeeks: 14,
    weeklyRank: 847,
    directTeamActiveCount: 2,
    directTeamTotalCount: 2,
    promotionProgress: 67, // 2/3 active subscribers
    spotlightPoints: 120,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 🟢 MARKETER - Building team phase
  // ═══════════════════════════════════════════════════════════════════════
  marketer: {
    directTeam: 8,
    indirectTeam: 17,
    teamSize: 25,
    activeWeeks: 5,
    currentWeek: 7,
    totalWeeks: 14,
    weeklyRank: 156,
    directTeamActiveCount: 6,
    directTeamTotalCount: 8,
    promotionProgress: 60, // 6/10 marketers
    spotlightPoints: 580,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ⭐ LEADER - Managing marketers
  // ═══════════════════════════════════════════════════════════════════════
  leader: {
    directTeam: 12,
    indirectTeam: 68,
    teamSize: 80,
    activeWeeks: 6,
    currentWeek: 7,
    totalWeeks: 14,
    weeklyRank: 47,
    directTeamActiveCount: 10,
    directTeamTotalCount: 12,
    promotionProgress: 70, // 7/10 leaders
    spotlightPoints: 1850,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 💎 MANAGER - Operating full system
  // ═══════════════════════════════════════════════════════════════════════
  manager: {
    directTeam: 8,
    indirectTeam: 272,
    teamSize: 280,
    activeWeeks: 6,
    currentWeek: 7,
    totalWeeks: 14,
    weeklyRank: 12,
    directTeamActiveCount: 7,
    directTeamTotalCount: 8,
    promotionProgress: 75, // Strong progress
    spotlightPoints: 4250,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 👑 PRESIDENT - Country-level management
  // ═══════════════════════════════════════════════════════════════════════
  president: {
    directTeam: 18,
    indirectTeam: 1482,
    teamSize: 1500,
    activeWeeks: 6,
    currentWeek: 7,
    totalWeeks: 14,
    weeklyRank: 1, // #1 in country
    directTeamActiveCount: 16,
    directTeamTotalCount: 18,
    promotionProgress: 100, // Top rank
    spotlightPoints: 12500,
    activeManagers: 16,
    countryActivityPercent: 82,
  },
};

/**
 * Hook to get rank-appropriate mock data
 * @param rank - Current user rank (or overridden rank for dev testing)
 * @returns Mock data scaled to the rank level
 */
export function useRankBasedData(rank: UserRank): RankBasedTeamData {
  return rankDataMap[rank];
}

/**
 * Get direct team members list based on rank
 * Returns a mock list with appropriate count and activity levels
 */
export function getRankBasedDirectMembers(rank: UserRank) {
  const data = rankDataMap[rank];
  const members = [];
  
  for (let i = 1; i <= data.directTeamTotalCount; i++) {
    const isActive = i <= data.directTeamActiveCount;
    members.push({
      id: `member-${i}`,
      name: `Member ${i}`,
      nameAr: `عضو ${i}`,
      username: `member_${i}`,
      rank: rank === 'subscriber' ? 'subscriber' : 
            rank === 'marketer' ? (i <= 3 ? 'marketer' : 'subscriber') :
            rank === 'leader' ? (i <= 5 ? 'leader' : 'marketer') :
            rank === 'manager' ? (i <= 4 ? 'manager' : 'leader') :
            'manager',
      active: isActive,
      avatar: i % 2 === 0 ? '👩' : '👨',
      activeWeeks: isActive ? Math.floor(Math.random() * 3) + 4 : Math.floor(Math.random() * 2) + 1,
      totalWeeks: 7,
      directTeam: Math.floor(Math.random() * 5) + 1,
      indirectTeam: Math.floor(Math.random() * 15),
      teamSize: Math.floor(Math.random() * 20) + 1,
    });
  }
  
  return members;
}

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type UserRank = 'subscriber' | 'marketer' | 'leader' | 'manager' | 'president';
export type EngagementStatus = 'both' | 'contest' | 'vote' | 'none';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Wallet = Database['public']['Tables']['wallets']['Row'];

export interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  novaBalance: number;
  lockedNovaBalance: number;
  auraBalance: number;
  freeAuraBalance: number;
  rank: UserRank;
  teamSize: number;
  directTeam: number;
  indirectTeam: number;
  weeklyActive: boolean;
  engagementStatus: EngagementStatus;
  activityPercentage: number;
  teamActivityPercentage: number;
  spotlightPoints: number;
  referralCode: string;
  country: string;
  city: string;
  walletCountry: string;
  hasJoinedWithNova: boolean;
  activeWeeks: number;
  totalWeeks: number;
  currentWeek: number;
  weeklyStreak: number;
}

interface UserContextType {
  user: User;
  isLoading: boolean;
  isAuthenticated: boolean;
  updateUser: (updates: Partial<User>) => void;
  addNova: (amount: number) => void;
  addLockedNova: (amount: number) => void;
  releaseLockedNova: () => number;
  addAura: (amount: number) => void;
  spendNova: (amount: number) => boolean;
  spendAura: (amount: number) => boolean;
  autoConvertNovaToAura: (auraNeeded: number) => boolean;
  refetchUserData: () => Promise<void>;
}

// Default guest user (unauthenticated)
const guestUser: User = {
  id: 'guest',
  name: 'Guest',
  username: 'guest',
  novaBalance: 0,
  lockedNovaBalance: 0,
  auraBalance: 0,
  freeAuraBalance: 0,
  rank: 'subscriber',
  teamSize: 0,
  directTeam: 0,
  indirectTeam: 0,
  weeklyActive: false,
  engagementStatus: 'none',
  activityPercentage: 0,
  teamActivityPercentage: 0,
  spotlightPoints: 0,
  referralCode: '',
  country: 'Saudi Arabia',
  city: '',
  walletCountry: 'Saudi Arabia',
  hasJoinedWithNova: false,
  activeWeeks: 0,
  totalWeeks: 14,
  currentWeek: 1,
  weeklyStreak: 0,
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: authUser, session } = useAuth();
  const [user, setUser] = useState<User>(guestUser);
  const [isLoading, setIsLoading] = useState(true);

  // Track the latest fetch call to prevent stale responses from overwriting fresh ones
  const fetchCounterRef = useRef(0);

  // Fetch user data from database
  const fetchUserData = useCallback(async () => {
    if (!authUser) {
      // Reset to guest state when logged out
      setUser(guestUser);
      setIsLoading(false);
      return;
    }

    const callId = ++fetchCounterRef.current;

    try {
      setIsLoading(true);
      
      // Fetch profile and wallet in parallel
      const [profileResult, walletResult, teamResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle(),
        supabase
          .from('wallets')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle(),
        supabase
          .from('team_members')
          .select('id, level')
          .eq('leader_id', authUser.id),
      ]);

      const profile = profileResult.data as Profile | null;
      const wallet = walletResult.data as Wallet | null;
      const teamMembers = teamResult.data || [];

      // Discard if a newer fetch has already started
      if (callId !== fetchCounterRef.current) return;

      if (profile && wallet) {
        // Calculate team sizes
        const directTeam = teamMembers.filter(m => m.level === 1).length;
        const indirectTeam = teamMembers.filter(m => m.level > 1).length;
        const totalTeam = teamMembers.length;

        setUser({
          id: profile.id,
          name: profile.name,
          username: profile.username,
          avatar: profile.avatar_url || undefined,
          novaBalance: Number(wallet.nova_balance) || 0,
          lockedNovaBalance: Number(wallet.locked_nova_balance) || 0,
          auraBalance: Number(wallet.aura_balance) || 0,
          freeAuraBalance: Number(wallet.free_aura_balance) || 0,
          rank: profile.rank as UserRank,
          teamSize: totalTeam,
          directTeam,
          indirectTeam,
          weeklyActive: profile.weekly_active,
          engagementStatus: profile.engagement_status as EngagementStatus,
          activityPercentage: profile.activity_percentage,
          teamActivityPercentage: profile.team_activity_percentage,
          spotlightPoints: profile.spotlight_points,
          referralCode: profile.referral_code || '',
          country: profile.country,
          city: profile.city || '',
          walletCountry: profile.wallet_country,
          hasJoinedWithNova: profile.has_joined_with_nova,
          activeWeeks: profile.active_weeks,
          totalWeeks: 14,
          currentWeek: profile.current_week,
          weeklyStreak: (profile as Profile & { weekly_streak?: number }).weekly_streak ?? 0,
        });
      } else {
        // No profile/wallet found - user might be newly created, use defaults
        setUser({
          ...guestUser,
          id: authUser.id,
          name: authUser.user_metadata?.name || 'User',
          username: authUser.user_metadata?.username || `user_${authUser.id.slice(0, 8)}`,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // On error, reset to guest
      setUser(guestUser);
    } finally {
      // Only update loading if this is still the latest call
      if (callId === fetchCounterRef.current) {
        setIsLoading(false);
      }
    }
  }, [authUser]);

  // Refetch when auth state changes
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData, session]);

  // Listen for auth state changes to trigger refetch
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        // TOKEN_REFRESHED fires hourly — skip refetch since wallet balance is
        // kept in sync by the Realtime wallets UPDATE subscription
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setTimeout(() => {
            fetchUserData();
          }, 500);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  // Subscribe to realtime wallet changes — single authoritative subscription for balance sync.
  // useWallet hook must NOT subscribe to wallets UPDATE to avoid duplicate channels.
  useEffect(() => {
    if (!authUser) return;

    const channel = supabase
      .channel(`wallet-changes-${authUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${authUser.id}`,
        },
        (payload) => {
          const newWallet = payload.new as { nova_balance: number; locked_nova_balance: number; aura_balance: number; free_aura_balance: number };
          setUser((prev) => ({
            ...prev,
            novaBalance: Number(newWallet.nova_balance) || 0,
            lockedNovaBalance: Number(newWallet.locked_nova_balance) || 0,
            auraBalance: Number(newWallet.aura_balance) || 0,
            freeAuraBalance: Number(newWallet.free_aura_balance) || 0,
          }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authUser]);

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  const addNova = (amount: number) => {
    setUser((prev) => ({ ...prev, novaBalance: prev.novaBalance + amount }));
  };

  const addLockedNova = (amount: number) => {
    setUser((prev) => ({ ...prev, lockedNovaBalance: prev.lockedNovaBalance + amount }));
  };

  const releaseLockedNova = (): number => {
    const released = user.lockedNovaBalance;
    setUser((prev) => ({
      ...prev,
      novaBalance: prev.novaBalance + prev.lockedNovaBalance,
      lockedNovaBalance: 0,
    }));
    return released;
  };

  const addAura = (amount: number) => {
    setUser((prev) => ({ ...prev, auraBalance: prev.auraBalance + amount }));
  };

  const spendNova = (amount: number): boolean => {
    if (user.novaBalance >= amount) {
      setUser((prev) => ({ ...prev, novaBalance: prev.novaBalance - amount }));
      return true;
    }
    return false;
  };

  const spendAura = (amount: number): boolean => {
    if (user.auraBalance >= amount) {
      setUser((prev) => ({ ...prev, auraBalance: prev.auraBalance - amount }));
      return true;
    }
    return false;
  };

  const autoConvertNovaToAura = (auraNeeded: number): boolean => {
    if (user.auraBalance >= auraNeeded) {
      return spendAura(auraNeeded);
    }
    
    const auraDeficit = auraNeeded - user.auraBalance;
    
    if (user.novaBalance >= auraDeficit) {
      setUser((prev) => ({
        ...prev,
        auraBalance: 0,
        novaBalance: prev.novaBalance - auraDeficit,
      }));
      return true;
    }
    
    return false;
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      isLoading,
      isAuthenticated: !!authUser,
      updateUser, 
      addNova,
      addLockedNova,
      releaseLockedNova,
      addAura, 
      spendNova, 
      spendAura,
      autoConvertNovaToAura,
      refetchUserData: fetchUserData,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

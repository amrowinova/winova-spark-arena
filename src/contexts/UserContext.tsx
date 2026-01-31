import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRank = 'subscriber' | 'marketer' | 'leader' | 'manager' | 'president';

// Engagement status based on weekly activity
export type EngagementStatus = 'both' | 'contest' | 'vote' | 'none';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  novaBalance: number;
  auraBalance: number;
  rank: UserRank;
  teamSize: number;
  directTeam: number;
  indirectTeam: number;
  weeklyActive: boolean;
  engagementStatus: EngagementStatus; // New: tracks what user did this week
  activityPercentage: number;
  teamActivityPercentage: number;
  spotlightPoints: number;
  referralCode: string;
  country: string; // User's registered country (affects team/referrals)
  city: string;
  walletCountry: string; // Display currency country (affects wallet/receipts only)
  hasJoinedWithNova: boolean;
  activeWeeks: number;
  totalWeeks: number; // Always 14 in a cycle
  currentWeek: number; // Current week in cycle (1-14)
}

interface UserContextType {
  user: User;
  updateUser: (updates: Partial<User>) => void;
  addNova: (amount: number) => void;
  addAura: (amount: number) => void;
  spendNova: (amount: number) => boolean;
  spendAura: (amount: number) => boolean;
  // Auto-convert Nova to Aura for contests/voting (1:1 ratio)
  autoConvertNovaToAura: (auraNeeded: number) => boolean;
}

const defaultUser: User = {
  id: '1',
  name: 'Ahmed',
  username: 'ahmed_sa',
  novaBalance: 150,
  auraBalance: 320,
  rank: 'marketer',
  teamSize: 47,
  directTeam: 12,
  indirectTeam: 35,
  weeklyActive: true,
  engagementStatus: 'both', // User joined contest AND voted this week
  activityPercentage: 71, // 5 active weeks / 7 weeks passed = 71%
  teamActivityPercentage: 65,
  spotlightPoints: 1250,
  referralCode: 'WINOVA-AH7X9',
  country: 'Saudi Arabia', // Registered country (team/referrals)
  city: 'Riyadh',
  walletCountry: 'Saudi Arabia', // Display currency country
  hasJoinedWithNova: true,
  activeWeeks: 5,
  totalWeeks: 14,
  currentWeek: 7,
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(defaultUser);

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  const addNova = (amount: number) => {
    setUser((prev) => ({ ...prev, novaBalance: prev.novaBalance + amount }));
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

  // Auto-convert Nova to Aura when user doesn't have enough Aura
  // Conversion rate: 1 Nova = 1 Aura
  const autoConvertNovaToAura = (auraNeeded: number): boolean => {
    // First, check if user has enough Aura
    if (user.auraBalance >= auraNeeded) {
      return spendAura(auraNeeded);
    }
    
    // Calculate how much more Aura is needed
    const auraDeficit = auraNeeded - user.auraBalance;
    
    // Check if user has enough Nova to cover the deficit
    if (user.novaBalance >= auraDeficit) {
      // Spend all available Aura first
      const auraSpent = user.auraBalance;
      // Convert Nova to cover the rest
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
      updateUser, 
      addNova, 
      addAura, 
      spendNova, 
      spendAura,
      autoConvertNovaToAura 
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

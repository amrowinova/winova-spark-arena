import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';

interface OnboardingProgress {
  completed: boolean;
  currentStep: number;
  completedSteps: string[];
  lastAccessed: string | null;
}

export function useOnboarding() {
  const { user: authUser } = useAuth();
  const { user } = useUser();
  const [progress, setProgress] = useState<OnboardingProgress>({
    completed: false,
    currentStep: 0,
    completedSteps: [],
    lastAccessed: null,
  });

  useEffect(() => {
    if (!authUser || !user) return;

    // Load onboarding progress from localStorage
    const savedProgress = localStorage.getItem('onboarding-progress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        if (parsed.userId === authUser.id) {
          setProgress(parsed);
        }
      } catch (error) {
        console.error('Error loading onboarding progress:', error);
      }
    }

    // Check if user should see onboarding
    const shouldShowOnboarding = 
      !progress.completed && 
      user.rank === 'subscriber' && 
      true; // Show for all new subscribers

    if (shouldShowOnboarding) {
      // Update last accessed time
      updateProgress({ ...progress, lastAccessed: new Date().toISOString() });
    }
  }, [authUser, user, progress.completed]);

  const updateProgress = (newProgress: Partial<OnboardingProgress>) => {
    const updated = { ...progress, ...newProgress, userId: authUser?.id };
    setProgress(updated);
    localStorage.setItem('onboarding-progress', JSON.stringify(updated));
  };

  const completeOnboarding = () => {
    updateProgress({
      completed: true,
      completedSteps: ['welcome', 'nova-vs-aura', 'contests', 'p2p', 'team'],
      lastAccessed: new Date().toISOString(),
    });
  };

  const skipOnboarding = () => {
    updateProgress({
      completed: true,
      lastAccessed: new Date().toISOString(),
    });
  };

  const resetOnboarding = () => {
    updateProgress({
      completed: false,
      currentStep: 0,
      completedSteps: [],
      lastAccessed: new Date().toISOString(),
    });
  };

  const shouldShowOnboarding = 
    !progress.completed && 
    user.rank === 'subscriber';

  return {
    progress,
    updateProgress,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    shouldShowOnboarding,
  };
}

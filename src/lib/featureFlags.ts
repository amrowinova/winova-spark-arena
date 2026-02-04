// WINOVA Feature Flags - Level 3 Execution
// Proposal: UI Rollback Strategy
// Status: Approved | Risk: Low

/**
 * Feature Flag System for UI Rollback Strategy
 * 
 * This allows us to:
 * 1. Toggle features on/off without code deployment
 * 2. Gradually roll out features to users
 * 3. Instantly rollback problematic features
 * 4. A/B test different implementations
 */

export type FeatureFlag = 
  | 'pwa_enabled'
  | 'offline_mode'
  | 'push_notifications'
  | 'new_chat_ui'
  | 'enhanced_p2p'
  | 'ai_control_room_v2'
  | 'dark_mode_only'
  | 'rtl_optimizations'
  | 'chat_reliability_v1'; // NEW: Chat UX improvements

interface FeatureFlagConfig {
  enabled: boolean;
  description: string;
  rolloutPercentage?: number; // 0-100 for gradual rollout
  enabledForAdmins?: boolean;
  enabledForBeta?: boolean;
}

// Default feature flags - can be overridden by server config
const DEFAULT_FLAGS: Record<FeatureFlag, FeatureFlagConfig> = {
  pwa_enabled: {
    enabled: true,
    description: 'Enable PWA features (Service Worker, Install prompt)',
    rolloutPercentage: 100,
  },
  offline_mode: {
    enabled: true,
    description: 'Enable offline support with cached data',
    rolloutPercentage: 100,
  },
  push_notifications: {
    enabled: false,
    description: 'Enable push notifications',
    enabledForAdmins: true,
  },
  new_chat_ui: {
    enabled: true,
    description: 'Use the new chat interface',
    rolloutPercentage: 100,
  },
  enhanced_p2p: {
    enabled: true,
    description: 'Enhanced P2P trading features',
    rolloutPercentage: 100,
  },
  ai_control_room_v2: {
    enabled: true,
    description: 'AI Control Room with Level 3 Governance',
    enabledForAdmins: true,
  },
  dark_mode_only: {
    enabled: true,
    description: 'Force dark mode for all users',
    rolloutPercentage: 100,
  },
  rtl_optimizations: {
    enabled: true,
    description: 'RTL layout optimizations for Arabic',
    rolloutPercentage: 100,
  },
  chat_reliability_v1: {
    enabled: true,
    description: 'Chat UX improvements: copy button, expand long messages, progress indicators',
    rolloutPercentage: 100,
    enabledForAdmins: true,
  },
};

// In-memory cache of flags
let cachedFlags: Record<FeatureFlag, FeatureFlagConfig> = { ...DEFAULT_FLAGS };
let userContext: { userId?: string; isAdmin?: boolean; isBeta?: boolean } = {};

/**
 * Initialize feature flags with user context
 */
export function initializeFeatureFlags(context: {
  userId?: string;
  isAdmin?: boolean;
  isBeta?: boolean;
}): void {
  userContext = context;
  // In future, could fetch flags from server here
  console.log('[FeatureFlags] Initialized with context:', context);
}

/**
 * Check if a feature is enabled for the current user
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const config = cachedFlags[flag];
  if (!config) return false;

  // Check admin-only features
  if (config.enabledForAdmins && userContext.isAdmin) {
    return true;
  }

  // Check beta-only features
  if (config.enabledForBeta && userContext.isBeta) {
    return true;
  }

  // Check rollout percentage
  if (config.rolloutPercentage !== undefined && userContext.userId) {
    const hash = simpleHash(userContext.userId + flag);
    const userPercentile = hash % 100;
    return config.enabled && userPercentile < config.rolloutPercentage;
  }

  return config.enabled;
}

/**
 * Get all feature flags (for admin dashboard)
 */
export function getAllFeatureFlags(): Record<FeatureFlag, FeatureFlagConfig> {
  return { ...cachedFlags };
}

/**
 * Override a feature flag (for testing/admin)
 */
export function setFeatureFlag(flag: FeatureFlag, enabled: boolean): void {
  if (cachedFlags[flag]) {
    cachedFlags[flag] = { ...cachedFlags[flag], enabled };
    console.log('[FeatureFlags] Updated:', flag, '=', enabled);
  }
}

/**
 * Reset all flags to defaults
 */
export function resetFeatureFlags(): void {
  cachedFlags = { ...DEFAULT_FLAGS };
  console.log('[FeatureFlags] Reset to defaults');
}

/**
 * Simple hash function for consistent user bucketing
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

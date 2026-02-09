/**
 * AI System User constants
 * Virtual sender for WINOVA Intelligence alerts delivered via DM
 */
export const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';
export const AI_SYSTEM_USER_NAME = 'WINOVA Intelligence';
export const AI_SYSTEM_USER_USERNAME = 'ai.intelligence';

export function isAISystemUser(userId: string): boolean {
  return userId === AI_SYSTEM_USER_ID;
}

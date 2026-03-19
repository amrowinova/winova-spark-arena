import { AuthRequiredModal } from './AuthRequiredModal';
import { AuthFlow } from './AuthFlow';
import { useAuthRequired } from '@/contexts/AuthRequiredContext';
import { useCallback } from 'react';

export function GlobalAuthGuard() {
  const { authFlowOpen, authFlowMode, initialReferralCode, closeAuthFlow } = useAuthRequired();

  // Handle auth flow close - only mark as success if explicitly told
  const handleAuthFlowChange = useCallback((open: boolean) => {
    if (!open) {
      // When closing via X button or backdrop, don't mark as success
      closeAuthFlow(false);
    }
  }, [closeAuthFlow]);

  return (
    <>
      <AuthRequiredModal />
      <AuthFlow
        open={authFlowOpen}
        onOpenChange={handleAuthFlowChange}
        initialScreen={authFlowMode}
        initialReferralCode={initialReferralCode ?? undefined}
        onAuthSuccess={() => closeAuthFlow(true)}
      />
    </>
  );
}

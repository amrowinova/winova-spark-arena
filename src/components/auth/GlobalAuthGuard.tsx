import { AuthRequiredModal } from './AuthRequiredModal';
import { AuthFlow } from './AuthFlow';
import { useAuthRequired } from '@/contexts/AuthRequiredContext';

export function GlobalAuthGuard() {
  const { authFlowOpen, authFlowMode, closeAuthFlow } = useAuthRequired();

  return (
    <>
      <AuthRequiredModal />
      <AuthFlow 
        open={authFlowOpen} 
        onOpenChange={closeAuthFlow}
        initialScreen={authFlowMode}
      />
    </>
  );
}

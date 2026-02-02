import { useEffect } from 'react';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Component that initializes chat notifications system
 * Should be placed inside AuthProvider
 */
export function ChatNotificationHandler() {
  const { user } = useAuth();
  
  // Enable chat notifications when user is logged in
  useChatNotifications({
    enabled: !!user,
    onNewMessage: (message, senderName) => {
      // Additional handling if needed (analytics, etc.)
      console.log(`New message from ${senderName}:`, message.content.substring(0, 50));
    },
  });

  return null;
}

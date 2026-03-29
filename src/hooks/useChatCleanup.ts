import { useEffect, useCallback, useRef } from 'react';

export interface ChatCleanupOptions {
  subscriptions?: (() => void)[];
  objectUrls?: string[];
  intervals?: NodeJS.Timeout[];
  timeouts?: NodeJS.Timeout[];
  eventListeners?: { element: EventTarget; event: string; handler: EventListener }[];
}

export function useChatCleanup() {
  const resourcesRef = useRef<ChatCleanupOptions>({
    subscriptions: [],
    objectUrls: [],
    intervals: [],
    timeouts: [],
    eventListeners: []
  });

  const addSubscription = useCallback((cleanup: () => void) => {
    resourcesRef.current.subscriptions?.push(cleanup);
    return cleanup;
  }, []);

  const addObjectUrl = useCallback((url: string) => {
    resourcesRef.current.objectUrls?.push(url);
    return url;
  }, []);

  const addInterval = useCallback((interval: NodeJS.Timeout) => {
    resourcesRef.current.intervals?.push(interval);
    return interval;
  }, []);

  const addTimeout = useCallback((timeout: NodeJS.Timeout) => {
    resourcesRef.current.timeouts?.push(timeout);
    return timeout;
  }, []);

  const addEventListener = useCallback((
    element: EventTarget,
    event: string,
    handler: EventListener
  ) => {
    element.addEventListener(event, handler);
    resourcesRef.current.eventListeners?.push({ element, event, handler });
    return () => element.removeEventListener(event, handler);
  }, []);

  const cleanup = useCallback(() => {
    const { subscriptions, objectUrls, intervals, timeouts, eventListeners } = resourcesRef.current;

    // Cleanup subscriptions
    subscriptions?.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('Error cleaning up subscription:', error);
      }
    });

    // Cleanup object URLs
    objectUrls?.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error revoking object URL:', error);
      }
    });

    // Cleanup intervals
    intervals?.forEach(interval => {
      try {
        clearInterval(interval);
      } catch (error) {
        console.error('Error clearing interval:', error);
      }
    });

    // Cleanup timeouts
    timeouts?.forEach(timeout => {
      try {
        clearTimeout(timeout);
      } catch (error) {
        console.error('Error clearing timeout:', error);
      }
    });

    // Cleanup event listeners
    eventListeners?.forEach(({ element, event, handler }) => {
      try {
        element.removeEventListener(event, handler);
      } catch (error) {
        console.error('Error removing event listener:', error);
      }
    });

    // Reset resources
    resourcesRef.current = {
      subscriptions: [],
      objectUrls: [],
      intervals: [],
      timeouts: [],
      eventListeners: []
    };
  }, []);

  // Auto-cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    addSubscription,
    addObjectUrl,
    addInterval,
    addTimeout,
    addEventListener,
    cleanup
  };
}

// Hook for specific chat message cleanup
export function useMessageCleanup() {
  const { addSubscription, addObjectUrl, cleanup } = useChatCleanup();

  const cleanupMessage = useCallback((message: any) => {
    // Clean up message-specific resources
    if (message.imageUrl) {
      addObjectUrl(message.imageUrl);
    }
    
    if (message.fileUrl) {
      addObjectUrl(message.fileUrl);
    }

    // Clean up any message-specific subscriptions
    if (message.subscription) {
      addSubscription(message.subscription);
    }
  }, [addObjectUrl, addSubscription]);

  return {
    cleanupMessage,
    cleanup
  };
}

// Hook for presence cleanup
export function usePresenceCleanup() {
  const { addSubscription, addTimeout, cleanup } = useChatCleanup();

  const cleanupPresence = useCallback((channel: string) => {
    // Clean up presence channel subscriptions
    const unsubscribe = () => {
      // This would be called when leaving a chat
      console.log(`Cleaning up presence for channel: ${channel}`);
    };
    
    addSubscription(unsubscribe);
    
    // Auto-cleanup after a timeout
    const timeout = setTimeout(() => {
      unsubscribe();
    }, 5000);
    
    addTimeout(timeout);
  }, [addSubscription, addTimeout]);

  return {
    cleanupPresence,
    cleanup
  };
}

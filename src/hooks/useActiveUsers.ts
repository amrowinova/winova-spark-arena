import { useState, useEffect } from 'react';

interface ActiveUsersConfig {
  baseCount: number;
  variance: number;
  updateInterval: number; // in ms
}

export function useActiveUsers(config: ActiveUsersConfig = {
  baseCount: 30000,
  variance: 500,
  updateInterval: 60000, // 60 seconds
}) {
  const [activeUsers, setActiveUsers] = useState(() => {
    // Initial random value around base
    return config.baseCount + Math.floor(Math.random() * config.variance * 2) - config.variance;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      // Small fluctuation: ±1-3% of current value
      const fluctuation = Math.floor(activeUsers * (Math.random() * 0.03 - 0.015));
      const newCount = Math.max(config.baseCount - config.variance, 
        Math.min(config.baseCount + config.variance, activeUsers + fluctuation));
      setActiveUsers(newCount);
    }, config.updateInterval);

    return () => clearInterval(interval);
  }, [activeUsers, config]);

  return activeUsers;
}

// For contest-specific active users (smaller numbers)
export function useContestActiveUsers() {
  return useActiveUsers({
    baseCount: 2500,
    variance: 200,
    updateInterval: 30000, // 30 seconds for more urgency
  });
}

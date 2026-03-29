import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Activity, TrendingUp, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveUsers } from '@/hooks/useActiveUsers';
import { getCountryFlag } from '@/lib/countryFlags';

interface ActiveUsersCounterProps {
  showDetails?: boolean;
  className?: string;
}

export function ActiveUsersCounter({ 
  showDetails = false, 
  className = "" 
}: ActiveUsersCounterProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const { 
    totalUsers, 
    activeUsers, 
    onlineUsers, 
    countryStats, 
    isLoading, 
    isConnected 
  } = useActiveUsers();

  const getGrowthRate = () => {
    if (!totalUsers || !activeUsers) return 0;
    return ((activeUsers / totalUsers) * 100).toFixed(1);
  };

  const getTopCountries = () => {
    if (!countryStats) return [];
    return Object.entries(countryStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Users className="h-5 w-5 text-primary" />
              {isConnected && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
            </div>
            <h3 className="font-semibold">
              {isRTL ? 'المستخدمون النشطون' : 'Active Users'}
            </h3>
          </div>
          
          <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
            <Activity className="h-3 w-3 mr-1" />
            {isConnected ? (isRTL ? 'حي' : 'Live') : (isRTL ? 'غير متصل' : 'Offline')}
          </Badge>
        </div>

        {/* Main Counter */}
        <div className="text-center mb-4">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded animate-pulse mx-auto w-32" />
              <div className="h-4 bg-muted rounded animate-pulse mx-auto w-24" />
            </div>
          ) : (
            <>
              <motion.div
                key={activeUsers}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold text-primary"
              >
                {activeUsers?.toLocaleString() || '0'}
              </motion.div>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'مستخدم نشط الآن' : 'users active now'}
              </p>
              
              <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  <span>{totalUsers?.toLocaleString() || '0'} {isRTL ? 'إجمالي' : 'total'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span>{getGrowthRate()}% {isRTL ? 'نشاط' : 'activity'}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {!isLoading && totalUsers && activeUsers && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{isRTL ? 'معدل النشاط' : 'Activity Rate'}</span>
              <span>{getGrowthRate()}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/60"
                initial={{ width: 0 }}
                animate={{ width: `${(activeUsers / totalUsers) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {/* Country Stats */}
        {showDetails && countryStats && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">
              {isRTL ? 'أعلى الدول نشاطاً' : 'Top Active Countries'}
            </h4>
            
            <div className="space-y-2">
              {getTopCountries().map(([country, count], index) => (
                <div key={country} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{getCountryFlag(country)}</span>
                    <span className="text-sm">{country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((count / (activeUsers || 1)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real-time Activity Indicator */}
        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 bg-primary rounded-full"
                  animate={{ 
                    opacity: [0.3, 1, 0.3],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
            <span>
              {isRTL ? 'تحديثات مباشرة' : 'Real-time updates'}
            </span>
          </div>
        </div>

        {/* Online Status */}
        {onlineUsers !== undefined && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-600">
              {onlineUsers} {isRTL ? 'متصل الآن' : 'online now'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

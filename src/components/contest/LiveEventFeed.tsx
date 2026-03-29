import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Trophy, Users, Zap, Heart, Star, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContestEvents } from '@/hooks/useContestEvents';
import { getCountryFlag } from '@/lib/countryFlags';

interface ContestEvent {
  id: string;
  type: 'vote' | 'join' | 'achievement' | 'milestone' | 'chat';
  username: string;
  avatar?: string;
  country: string;
  message: string;
  timestamp: Date;
  metadata?: {
    votes?: number;
    achievement?: string;
    milestone?: string;
  };
}

export function LiveEventFeed() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const { events, isConnected } = useContestEvents();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new events
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [events]);

  const getEventIcon = (type: ContestEvent['type']) => {
    switch (type) {
      case 'vote':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'join':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'achievement':
        return <Trophy className="h-4 w-4 text-purple-500" />;
      case 'milestone':
        return <Star className="h-4 w-4 text-orange-500" />;
      case 'chat':
        return <MessageCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventColor = (type: ContestEvent['type']) => {
    switch (type) {
      case 'vote':
        return 'border-yellow-500/20 bg-yellow-500/5';
      case 'join':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'achievement':
        return 'border-purple-500/20 bg-purple-500/5';
      case 'milestone':
        return 'border-orange-500/20 bg-orange-500/5';
      case 'chat':
        return 'border-green-500/20 bg-green-500/5';
      default:
        return 'border-gray-500/20 bg-gray-500/5';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return isRTL ? 'الآن' : 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} ${isRTL ? 'دقيقة' : 'min'}`;
    return `${Math.floor(seconds / 3600)} ${isRTL ? 'ساعة' : 'hr'}`;
  };

  return (
    <Card className="h-[400px] flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">
              {isRTL ? 'أحداث المسابقة المباشرة' : 'Live Contest Events'}
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
              <div className={`w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {isConnected ? (isRTL ? 'حي' : 'Live') : (isRTL ? 'متوقف' : 'Offline')}
            </Badge>
          </div>
        </div>

        {/* Events Feed */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="space-y-2">
            <AnimatePresence>
              {events.slice(-20).map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className={`p-3 rounded-lg border ${getEventColor(event.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getEventIcon(event.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {event.username}
                        </span>
                        {event.country && (
                          <span>{getCountryFlag(event.country)}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-foreground break-words">
                        {event.message}
                      </p>
                      
                      {/* Event-specific metadata */}
                      {event.metadata && (
                        <div className="mt-2 flex items-center gap-2">
                          {event.metadata.votes && (
                            <Badge variant="secondary" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              {event.metadata.votes} {isRTL ? 'صوت' : 'votes'}
                            </Badge>
                          )}
                          {event.metadata.achievement && (
                            <Badge variant="secondary" className="text-xs">
                              <Trophy className="h-3 w-3 mr-1" />
                              {event.metadata.achievement}
                            </Badge>
                          )}
                          {event.metadata.milestone && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              {event.metadata.milestone}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Empty state */}
            {events.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {isRTL ? 'لا توجد أحداث حالياً' : 'No events yet'}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {events.length} {isRTL ? 'حدث' : 'events'}
            </span>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span>{isRTL ? 'المسابقة نشطة' : 'Contest active'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

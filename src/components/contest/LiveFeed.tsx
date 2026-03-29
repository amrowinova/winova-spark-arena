import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, TrendingUp, Users, Crown, Flame, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface LiveEvent {
  id: string;
  type: 'vote' | 'momentum' | 'overtake' | 'powerup' | 'milestone';
  message: string;
  messageAr: string;
  timestamp: Date;
  participantId?: string;
  participantName?: string;
  icon?: React.ReactNode;
  color?: string;
}

interface LiveFeedProps {
  isRTL: boolean;
  participants?: Array<{ id: string; name: string; votes: number }>;
}

const eventTemplates = {
  vote: {
    en: "{voter} voted for {participant}",
    ar: "{voter} صوت لـ {participant}",
    icon: <Users className="h-4 w-4" />,
    color: "text-blue-500"
  },
  momentum: {
    en: "🔥 MOMENTUM! {participant} gets 50 bonus votes!",
    ar: "🔥 لحظة الحسم! {participant} يحصل على 50 صوتاً إضافياً!",
    icon: <Flame className="h-4 w-4" />,
    color: "text-orange-500"
  },
  overtake: {
    en: "🚀 {participant} overtakes {overtaken}!",
    ar: "🚀 {participant} يتجاوز {overtaken}!",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "text-green-500"
  },
  powerup: {
    en: "⚡ {participant} used Double Vote!",
    ar: "⚡ {participant} يستخدم التصويت المزدوج!",
    icon: <Zap className="h-4 w-4" />,
    color: "text-purple-500"
  },
  milestone: {
    en: "🎯 {participant} reached {votes} votes!",
    ar: "🎯 {participant} وصل إلى {votes} صوت!",
    icon: <Crown className="h-4 w-4" />,
    color: "text-yellow-500"
  }
};

const voterNames = [
  "أحمد", "محمد", "علي", "فهد", "خالد", "سعد", "ناصر", "عمر",
  "Ahmed", "Mohammed", "Ali", "Fahad", "Khaled", "Saad", "Nasser", "Omar"
];

export function LiveFeed({ isRTL, participants = [] }: LiveFeedProps) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-generate events for demonstration
  useEffect(() => {
    if (isPaused) return;

    const generateRandomEvent = (): LiveEvent => {
      const types: Array<'vote' | 'momentum' | 'overtake' | 'powerup' | 'milestone'> = 
        ['vote', 'momentum', 'overtake', 'powerup', 'milestone'];
      const type = types[Math.floor(Math.random() * types.length)];
      const template = eventTemplates[type];
      
      const participant = participants.length > 0 
        ? participants[Math.floor(Math.random() * participants.length)]
        : { id: '1', name: isRTL ? 'سارة' : 'Sarah', votes: 100 };

      let message = template.en;
      let messageAr = template.ar;

      // Replace placeholders
      message = message.replace('{participant}', participant.name);
      messageAr = messageAr.replace('{participant}', participant.name);
      
      if (type === 'vote') {
        const voter = voterNames[Math.floor(Math.random() * voterNames.length)];
        message = message.replace('{voter}', voter);
        messageAr = messageAr.replace('{voter}', voter);
      } else if (type === 'overtake') {
        const otherParticipant = participants.length > 1 
          ? participants[Math.floor(Math.random() * participants.length)]
          : { id: '2', name: isRTL ? 'محمد' : 'Mohammed', votes: 80 };
        
        if (otherParticipant.id !== participant.id) {
          message = message.replace('{overtaken}', otherParticipant.name);
          messageAr = messageAr.replace('{overtaken}', otherParticipant.name);
        }
      } else if (type === 'milestone') {
        const votes = Math.floor(Math.random() * 200) + 50;
        message = message.replace('{votes}', votes.toString());
        messageAr = messageAr.replace('{votes}', votes.toString());
      }

      return {
        id: `${Date.now()}-${Math.random()}`,
        type,
        message,
        messageAr,
        timestamp: new Date(),
        participantId: participant.id,
        participantName: participant.name,
        icon: template.icon,
        color: template.color
      };
    };

    // Generate events periodically
    const interval = setInterval(() => {
      const newEvent = generateRandomEvent();
      setEvents(prev => [newEvent, ...prev].slice(0, 10)); // Keep only last 10 events
    }, 3000 + Math.random() * 4000); // Random interval between 3-7 seconds

    return () => clearInterval(interval);
  }, [isPaused, participants, isRTL]);

  // Auto-scroll to top when new event arrives
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [events]);

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) {
      return isRTL ? 'الآن' : 'now';
    } else if (seconds < 120) {
      return isRTL ? 'قبل دقيقة' : '1m ago';
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return isRTL ? `قبل ${minutes} دقائق` : `${minutes}m ago`;
    } else {
      return isRTL ? 'قبل ساعة' : '1h ago';
    }
  };

  return (
    <Card className="h-96">
      <CardContent className="p-4 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {isRTL ? 'التحديثات الحية' : 'Live Feed'}
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {isRTL ? 'مباشر' : 'LIVE'}
            </Badge>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {isPaused ? (isRTL ? 'تشغيل' : 'Play') : (isRTL ? 'إيقاف' : 'Pause')}
            </button>
          </div>
        </div>

        {/* Events List */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto space-y-2 custom-scrollbar"
        >
          <AnimatePresence>
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.05,
                  ease: "easeOut"
                }}
                className={`
                  p-3 rounded-lg border bg-gradient-to-r from-transparent to-transparent
                  ${event.type === 'momentum' ? 'from-orange-50 to-orange-100 border-orange-200' : ''}
                  ${event.type === 'overtake' ? 'from-green-50 to-green-100 border-green-200' : ''}
                  ${event.type === 'powerup' ? 'from-purple-50 to-purple-100 border-purple-200' : ''}
                  ${event.type === 'milestone' ? 'from-yellow-50 to-yellow-100 border-yellow-200' : ''}
                  ${event.type === 'vote' ? 'from-blue-50 to-blue-100 border-blue-200' : ''}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${event.color}`}>
                    {event.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      event.type === 'momentum' || event.type === 'overtake' 
                        ? 'text-orange-600 font-bold' 
                        : 'text-foreground'
                    }`}>
                      {isRTL ? event.messageAr : event.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(event.timestamp)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {events.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>{isRTL ? 'انتظر التحديثات الحية...' : 'Waiting for live updates...'}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

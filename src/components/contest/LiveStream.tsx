import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Clock, 
  Eye, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Wifi,
  WifiOff,
  AlertCircle,
  Trophy,
  ChevronRight,
  Timer
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface LiveContestant {
  user_id: string;
  username: string;
  avatar_url?: string;
  votes_received: number;
  rank: number;
  is_leaving?: boolean;
  leave_timer?: number; // seconds until removal
}

interface LiveStreamProps {
  contestId: string;
  isActive: boolean;
  stage: 'stage1' | 'final';
}

export function LiveStream({ contestId, isActive, stage }: LiveStreamProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [contestants, setContestants] = useState<LiveContestant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'live' | 'ended'>('connecting');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Ref for real-time subscription
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!isActive || !contestId) return;

    // Initial fetch
    fetchTopContestants();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`contest-live-${contestId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contest_entries',
        filter: `contest_id=eq.${contestId}`
      }, (payload: any) => {
        handleRealtimeUpdate(payload);
      })
      .subscribe();

    subscriptionRef.current = subscription;

    // Update viewer count simulation
    const viewerInterval = setInterval(() => {
      setViewerCount(prev => {
        const change = Math.floor(Math.random() * 20) - 10;
        return Math.max(100, prev + change);
      });
    }, 5000);

    // Update time
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Simulate connection
    setTimeout(() => {
      setIsConnected(true);
      setStreamStatus('live');
    }, 2000);

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      clearInterval(viewerInterval);
      clearInterval(timeInterval);
    };
  }, [isActive, contestId]);

  const fetchTopContestants = async () => {
    try {
      const { data, error } = await supabase
        .from('contest_entries')
        .select(`
          user_id,
          votes_received,
          profiles!inner(
            username,
            avatar_url
          )
        `)
        .eq('contest_id', contestId)
        .order('votes_received', { ascending: false })
        .limit(5);

      if (error) throw error;

      const topContestants = (data || []).map((entry, index) => ({
        user_id: entry.user_id,
        username: entry.profiles.username,
        avatar_url: entry.profiles.avatar_url,
        votes_received: entry.votes_received,
        rank: index + 1,
        is_leaving: false
      }));

      setContestants(topContestants);
    } catch (error) {
      console.error('Error fetching contestants:', error);
    }
  };

  const handleRealtimeUpdate = (payload: any) => {
    if (payload.eventType === 'UPDATE') {
      const updatedEntry = payload.new;
      
      setContestants(prev => {
        const updated = prev.map(contestant => {
          if (contestant.user_id === updatedEntry.user_id) {
            const newVotes = updatedEntry.votes_received;
            const oldRank = contestant.rank;
            
            // Check if rank changed (dropped out of top 5)
            const sortedContestants = [...prev]
              .map(c => c.user_id === updatedEntry.user_id 
                ? { ...c, votes_received: newVotes }
                : c)
              .sort((a, b) => b.votes_received - a.votes_received);
            
            const newRank = sortedContestants.findIndex(c => c.user_id === updatedEntry.user_id) + 1;
            
            // If dropped out of top 5, start 20-second timer
            if (oldRank <= 5 && newRank > 5) {
              return {
                ...contestant,
                votes_received: newVotes,
                rank: newRank,
                is_leaving: true,
                leave_timer: 20
              };
            }
            
            return {
              ...contestant,
              votes_received: newVotes,
              rank: newRank
            };
          }
          return contestant;
        });

        // Re-sort and keep only top 5
        return updated
          .sort((a, b) => b.votes_received - a.votes_received)
          .slice(0, 5);
      });
    }
  };

  // Handle leave timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setContestants(prev => 
        prev.map(contestant => {
          if (contestant.is_leaving && contestant.leave_timer && contestant.leave_timer > 0) {
            return {
              ...contestant,
              leave_timer: contestant.leave_timer - 1
            };
          }
          return contestant;
        }).filter(contestant => !contestant.is_leaving || (contestant.leave_timer && contestant.leave_timer > 0))
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatVotes = (votes: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US').format(votes);
  };

  if (!isActive) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-3 h-3 rounded-full ${
                streamStatus === 'live' ? 'bg-red-500 animate-pulse' : 
                streamStatus === 'connecting' ? 'bg-yellow-500' : 'bg-gray-400'
              }`} />
              {streamStatus === 'live' && (
                <div className="absolute inset-0 rounded-full bg-red-500 animate-ping" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-red-700 flex items-center gap-2">
                <Video className="h-4 w-4" />
                {isRTL ? 'البث المباشر' : 'LIVE STREAM'}
              </h3>
              <p className="text-sm text-red-600">
                {stage === 'stage1' ? 
                  (isRTL ? 'المرحلة الأولى (2م - 8م)' : 'Stage 1 (2PM - 8PM)') :
                  (isRTL ? 'المرحلة النهائية (8م - 10م)' : 'Final Stage (8PM - 10PM)')
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span className="font-medium">{viewerCount}</span>
            </div>
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span>{formatTime(currentTime)}</span>
            </div>
          </div>
        </div>

        {/* Live Contestants Grid */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          <AnimatePresence>
            {contestants.map((contestant, index) => (
              <motion.div
                key={contestant.user_id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: contestant.is_leaving ? 0.5 : 1, 
                  scale: contestant.is_leaving ? 0.9 : 1 
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <Card className={`
                  ${contestant.rank === 1 ? 'bg-yellow-100 border-yellow-300' : 
                    contestant.rank === 2 ? 'bg-gray-100 border-gray-300' :
                    contestant.rank === 3 ? 'bg-orange-100 border-orange-300' :
                    'bg-white border-gray-200'}
                  ${contestant.is_leaving ? 'opacity-50' : ''}
                `}>
                  <CardContent className="p-3 text-center">
                    {/* Rank Badge */}
                    <div className="absolute -top-2 -right-2">
                      <Badge className={`
                        ${contestant.rank === 1 ? 'bg-yellow-500' :
                          contestant.rank === 2 ? 'bg-gray-500' :
                          contestant.rank === 3 ? 'bg-orange-500' :
                          'bg-blue-500'}
                        text-white text-xs
                      `}>
                        #{contestant.rank}
                      </Badge>
                    </div>

                    {/* Avatar */}
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {contestant.avatar_url ? (
                        <img 
                          src={contestant.avatar_url} 
                          alt={contestant.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        contestant.username.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Username */}
                    <div className="text-xs font-medium truncate mb-1">
                      {contestant.username}
                    </div>

                    {/* Votes */}
                    <div className="text-lg font-bold text-blue-600">
                      {formatVotes(contestant.votes_received)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isRTL ? 'صوت' : 'votes'}
                    </div>

                    {/* Leaving Timer */}
                    {contestant.is_leaving && contestant.leave_timer && (
                      <div className="mt-2">
                        <div className="text-xs text-red-600 font-medium">
                          {isRTL ? 'آخر' : 'Last'} {contestant.leave_timer}s
                        </div>
                        <Progress 
                          value={(contestant.leave_timer / 20) * 100} 
                          className="h-1 mt-1"
                        />
                        <div className="text-xs text-red-500 mt-1">
                          {isRTL ? 'مغادر البث' : 'Leaving stream'}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="text-muted-foreground">
              {isRTL ? `أعلى 5 متسابقين من ${contestants.length}` : `Top 5 of ${contestants.length} contestants`}
            </span>
          </div>
          
          {streamStatus === 'connecting' && (
            <div className="flex items-center gap-2 text-yellow-600">
              <Timer className="h-4 w-4 animate-spin" />
              <span>{isRTL ? 'جاري الاتصال...' : 'Connecting...'}</span>
            </div>
          )}
          
          {streamStatus === 'live' && (
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>{isRTL ? 'بث مباشر' : 'LIVE'}</span>
            </div>
          )}
        </div>

        {/* Empty State */}
        {contestants.length === 0 && streamStatus === 'live' && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">
              {isRTL ? 'في انتظار المتسابقين' : 'Waiting for contestants'}
            </h3>
            <p className="text-muted-foreground">
              {isRTL ? 'سيظهر المتسابقون الخمسة الأوائل هنا' : 'Top 5 contestants will appear here'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

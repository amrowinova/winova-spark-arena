import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Heart, Share2, Timer, Sparkles, Medal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface Winner {
  rank: number;
  name: string;
  username: string;
  votes: number;
  prize: number;
  avatar: string;
  country: string;
}

interface Celebration {
  userId: string;
  rank: number;
  timestamp: Date;
}

interface TemporaryHallOfFameProps {
  winners: Winner[];
  isRTL: boolean;
  onCelebrate?: (rank: number) => void;
  onComplete?: () => void;
  duration?: number; // Duration in seconds (default: 30)
}

export function TemporaryHallOfFame({ 
  winners, 
  isRTL, 
  onCelebrate, 
  onComplete,
  duration = 30 
}: TemporaryHallOfFameProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onComplete) onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [duration, onComplete]);

  // Auto-trigger confetti for first place
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleCelebrate = (rank: number) => {
    const winner = winners.find(w => w.rank === rank);
    if (!winner) return;

    // Add celebration
    const newCelebration: Celebration = {
      userId: `user-${Date.now()}`,
      rank,
      timestamp: new Date()
    };
    
    setCelebrations(prev => [...prev, newCelebration]);

    // Call parent handler
    if (onCelebrate) {
      onCelebrate(rank);
    }

    // Trigger special effects
    if (rank === 1) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
  };

  const getCelebrationCount = (rank: number) => {
    return celebrations.filter(c => c.rank === rank).length;
  };

  const getMostCelebrated = () => {
    const counts = celebrations.reduce((acc, c) => {
      acc[c.rank] = (acc[c.rank] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(counts).reduce((a, b) => 
      counts[Number(a[0])] > counts[Number(b[0])] ? a : b
    , ['1', 0]);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '👑';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `🏆`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-400 to-yellow-600';
      case 2: return 'from-gray-300 to-gray-500';
      case 3: return 'from-amber-600 to-amber-800';
      default: return 'from-purple-400 to-purple-600';
    }
  };

  const mostCelebrated = getMostCelebrated();
  const mostCelebratedRank = Number(mostCelebrated[0]);
  const mostCelebratedCount = mostCelebrated[1];

  return (
    <div className="relative">
      {/* Confetti Effect */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50"
          >
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: -20,
                  rotate: Math.random() * 360,
                }}
                animate={{
                  y: window.innerHeight + 20,
                  rotate: Math.random() * 720,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  ease: "easeOut",
                }}
                style={{
                  left: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 border-purple-200 overflow-hidden">
        <CardContent className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-500 to-orange-500 text-white rounded-full"
            >
              <Trophy className="h-6 w-6" />
              <span className="font-bold text-lg">
                {isRTL ? 'لوحة الشرف المؤقتة' : 'Temporary Hall of Fame'}
              </span>
              <Medal className="h-6 w-6" />
            </motion.div>

            {/* Timer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <Timer className="h-4 w-4" />
              <span>
                {isRTL ? `متبقي ${timeRemaining} ثانية` : `${timeRemaining}s remaining`}
              </span>
            </motion.div>
          </div>

          {/* Winners Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {winners.slice(0, 3).map((winner, index) => {
              const celebrationCount = getCelebrationCount(winner.rank);
              const isMostCelebrated = winner.rank === mostCelebratedRank && mostCelebratedCount > 0;

              return (
                <motion.div
                  key={winner.rank}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="relative"
                >
                  <Card className={`
                    relative overflow-hidden transition-all duration-300
                    ${isMostCelebrated 
                      ? 'ring-4 ring-yellow-400 ring-opacity-50 transform scale-105' 
                      : ''
                    }
                    bg-gradient-to-br ${getRankColor(winner.rank)} text-white
                  `}>
                    <CardContent className="p-4">
                      {/* Most Celebrated Badge */}
                      {isMostCelebrated && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", delay: 0.5 }}
                          className="absolute -top-2 -right-2 z-10"
                        >
                          <Badge className="bg-yellow-400 text-yellow-900 px-2 py-1">
                            <Heart className="h-3 w-3 mr-1" />
                            {celebrationCount}
                          </Badge>
                        </motion.div>
                      )}

                      {/* Rank */}
                      <div className="text-center mb-3">
                        <div className="text-4xl mb-2">
                          {getRankIcon(winner.rank)}
                        </div>
                        <div className="text-sm opacity-90">
                          {isRTL ? `المركز ${winner.rank}` : `Rank ${winner.rank}`}
                        </div>
                      </div>

                      {/* Winner Info */}
                      <div className="text-center mb-4">
                        <div className="font-bold text-lg mb-1">
                          {winner.name}
                        </div>
                        <div className="text-sm opacity-90 mb-1">
                          @{winner.username}
                        </div>
                        <div className="text-xs opacity-80">
                          {winner.country}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="opacity-90">
                            {isRTL ? 'الأصوات' : 'Votes'}
                          </span>
                          <span className="font-bold">
                            {winner.votes.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-90">
                            {isRTL ? 'الجائزة' : 'Prize'}
                          </span>
                          <span className="font-bold text-yellow-300">
                            {winner.prize.toLocaleString()} Nova
                          </span>
                        </div>
                      </div>

                      {/* Celebrate Button */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-4"
                      >
                        <Button
                          size="sm"
                          className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
                          onClick={() => handleCelebrate(winner.rank)}
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          {isRTL ? 'احتفال' : 'Celebrate'}
                          {celebrationCount > 0 && (
                            <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                              {celebrationCount}
                            </span>
                          )}
                        </Button>
                      </motion.div>
                    </CardContent>

                    {/* Sparkle Effect */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      animate={{
                        background: [
                          "linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)",
                          "linear-gradient(45deg, transparent, rgba(255,255,255,0.2), transparent)",
                          "linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)",
                        ],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Celebration Stats */}
          {celebrations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/50 rounded-lg p-4 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <span className="font-semibold text-purple-700">
                  {isRTL ? 'إحصائيات الاحتفال' : 'Celebration Stats'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <div>
                  {isRTL ? 'إجمالي الاحتفالات' : 'Total Celebrations'}: {celebrations.length}
                </div>
                {mostCelebratedCount > 0 && (
                  <div>
                    {isRTL ? 'الأكثر احتفالاً' : 'Most Celebrated'}: 
                    <span className="font-bold text-purple-600 ml-1">
                      {isRTL ? `المركز ${mostCelebratedRank}` : `Rank ${mostCelebratedRank}`} ({mostCelebratedCount})
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Share Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-4"
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                // Share functionality
                const text = isRTL 
                  ? `🎉 مبروك للفائزين في مسابقة اليوم! 🏆`
                  : `🎉 Congratulations to today's contest winners! 🏆`;
                
                if (navigator.share) {
                  navigator.share({
                    title: isRTL ? 'لوحة الشرف' : 'Hall of Fame',
                    text: text,
                  });
                }
              }}
            >
              <Share2 className="h-4 w-4" />
              {isRTL ? 'مشاركة' : 'Share'}
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}

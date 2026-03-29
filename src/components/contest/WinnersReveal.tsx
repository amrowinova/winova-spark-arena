import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Star, Zap, Heart, Sparkles, Timer } from 'lucide-react';
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

interface WinnersRevealProps {
  winners: Winner[];
  isRTL: boolean;
  onRevealComplete?: () => void;
  onCelebrate?: (rank: number) => void;
}

export function WinnersReveal({ 
  winners, 
  isRTL, 
  onRevealComplete, 
  onCelebrate 
}: WinnersRevealProps) {
  const [revealedRanks, setRevealedRanks] = useState<number[]>([]);
  const [currentReveal, setCurrentReveal] = useState<number | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [showFirstPlace, setShowFirstPlace] = useState(false);

  // Auto-reveal ranks 3-5 first
  useEffect(() => {
    const timer = setTimeout(() => {
      // Reveal ranks 3-5 immediately
      const lowerRanks = [3, 4, 5];
      lowerRanks.forEach((rank, index) => {
        setTimeout(() => {
          revealRank(rank);
        }, index * 1000);
      });

      // Show rank 2 after 5 seconds
      setTimeout(() => {
        revealRank(2);
      }, 5000);

      // Start countdown for rank 1 after 7 seconds
      setTimeout(() => {
        setShowCountdown(true);
        startCountdown();
      }, 7000);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const startCountdown = () => {
    let count = 3;
    setCountdownNumber(count);

    const interval = setInterval(() => {
      count--;
      setCountdownNumber(count);
      
      if (count === 0) {
        clearInterval(interval);
        setShowCountdown(false);
        revealRank(1);
        setShowFirstPlace(true);
        
        // Notify parent of completion
        if (onRevealComplete) {
          setTimeout(() => onRevealComplete(), 2000);
        }
      }
    }, 1000);
  };

  const revealRank = (rank: number) => {
    setCurrentReveal(rank);
    setTimeout(() => {
      setRevealedRanks(prev => [...prev, rank]);
      setCurrentReveal(null);
    }, 500);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '👑';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-400 to-yellow-600';
      case 2: return 'from-gray-300 to-gray-500';
      case 3: return 'from-amber-600 to-amber-800';
      case 4: return 'from-blue-400 to-blue-600';
      case 5: return 'from-purple-400 to-purple-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getWinnerByRank = (rank: number) => {
    return winners.find(w => w.rank === rank);
  };

  return (
    <div className="space-y-6">
      {/* Countdown Overlay */}
      <AnimatePresence>
        {showCountdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <motion.div
              key={countdownNumber}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="text-9xl font-bold text-white"
            >
              {countdownNumber}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {winners.map((winner) => {
          const isRevealed = revealedRanks.includes(winner.rank);
          const isCurrentReveal = currentReveal === winner.rank;
          const isFirstPlace = winner.rank === 1 && showFirstPlace;

          return (
            <motion.div
              key={winner.rank}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ 
                opacity: isRevealed ? 1 : 0.3, 
                scale: isRevealed ? 1 : 0.8,
                y: isRevealed ? 0 : 50
              }}
              transition={{ duration: 0.5 }}
              className={`
                relative ${isFirstPlace ? 'md:col-span-3 lg:col-span-5' : ''}
              `}
            >
              <Card className={`
                overflow-hidden transition-all duration-500
                ${isRevealed 
                  ? `bg-gradient-to-br ${getRankColor(winner.rank)} text-white shadow-2xl` 
                  : 'bg-gray-100 border-gray-300'
                }
                ${isFirstPlace ? 'transform scale-105' : ''}
                ${isCurrentReveal ? 'ring-4 ring-white ring-opacity-60' : ''}
              `}>
                <CardContent className="p-6">
                  {/* Reveal Animation */}
                  {isCurrentReveal && (
                    <motion.div
                      className="absolute inset-0 bg-white z-10"
                      initial={{ scaleY: 1 }}
                      animate={{ scaleY: 0 }}
                      exit={{ scaleY: 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      style={{ transformOrigin: 'top' }}
                    />
                  )}

                  {/* Rank Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="text-3xl font-bold">
                        {getRankIcon(winner.rank)}
                      </div>
                      <Badge 
                        variant={isRevealed ? "secondary" : "outline"}
                        className={isRevealed ? "bg-white/20 text-white" : ""}
                      >
                        {isRTL ? `المركز ${winner.rank}` : `Rank ${winner.rank}`}
                      </Badge>
                    </div>
                    
                    {isRevealed && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                      >
                        <Trophy className="h-6 w-6 text-yellow-300" />
                      </motion.div>
                    )}
                  </div>

                  {/* Winner Info */}
                  <div className="text-center">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ 
                        opacity: isRevealed ? 1 : 0, 
                        y: isRevealed ? 0 : 20 
                      }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="text-2xl font-bold mb-1">
                        {isRevealed ? winner.name : '???'}
                      </div>
                      <div className="text-sm opacity-90 mb-2">
                        @{isRevealed ? winner.username : '???'}
                      </div>
                      <div className="text-xs opacity-80 mb-3">
                        {isRevealed ? winner.country : '???'}
                      </div>
                    </motion.div>

                    {/* Stats */}
                    {isRevealed && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm opacity-90">
                            {isRTL ? 'الأصوات' : 'Votes'}
                          </span>
                          <span className="font-bold">
                            {winner.votes.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm opacity-90">
                            {isRTL ? 'الجائزة' : 'Prize'}
                          </span>
                          <span className="font-bold text-yellow-300">
                            {winner.prize.toLocaleString()} Nova
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Special Effects for First Place */}
                  {isFirstPlace && (
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
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )}

                  {/* Sparkle Effects */}
                  {isRevealed && (
                    <motion.div
                      className="absolute -top-2 -right-2"
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Sparkles className="h-6 w-6 text-yellow-300" />
                    </motion.div>
                  )}
                </CardContent>

                {/* Celebrate Button */}
                {isRevealed && onCelebrate && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="p-4 pt-0"
                  >
                    <Button
                      size="sm"
                      className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
                      onClick={() => onCelebrate(winner.rank)}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      {isRTL ? 'احتفال' : 'Celebrate'}
                    </Button>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Instructions */}
      {!showFirstPlace && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-muted-foreground"
        >
          <div className="flex items-center justify-center gap-2">
            <Timer className="h-4 w-4" />
            <span>
              {isRTL 
                ? 'جاري الكشف عن الفائزين...' 
                : 'Revealing winners...'
              }
            </span>
          </div>
        </motion.div>
      )}

      {/* Completion Message */}
      {showFirstPlace && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-2xl font-bold mb-2 text-gradient bg-gradient-to-r from-purple-600 to-orange-600 bg-clip-text text-transparent">
            {isRTL ? '🎉 مبروك للفائزين!' : '🎉 Congratulations to the Winners!'}
          </div>
          <p className="text-muted-foreground">
            {isRTL 
              ? 'شكراً لجميع المشاركين في المسابقة' 
              : 'Thank you to all participants'
            }
          </p>
        </motion.div>
      )}
    </div>
  );
}

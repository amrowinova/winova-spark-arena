import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, Zap, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface Participant {
  id: string;
  name: string;
  username: string;
  votes: number;
  avatar: string;
  rank: number;
  country: string;
  previousRank?: number;
}

interface VoteRacingProps {
  participants: Participant[];
  isRTL: boolean;
  onRankChange?: (oldRank: number, newRank: number, participant: Participant) => void;
}

export function VoteRacing({ participants, isRTL, onRankChange }: VoteRacingProps) {
  const [previousRanks, setPreviousRanks] = useState<Map<string, number>>(new Map());
  const [rankChanges, setRankChanges] = useState<Map<string, number>>(new Map());
  const [showEffects, setShowEffects] = useState<Map<string, boolean>>(new Map());

  // Track rank changes
  useEffect(() => {
    const newPreviousRanks = new Map(previousRanks);
    const newRankChanges = new Map<string, number>();
    const newShowEffects = new Map<string, boolean>();

    participants.forEach((participant) => {
      const oldRank = previousRanks.get(participant.id);
      if (oldRank && oldRank !== participant.rank) {
        const change = oldRank - participant.rank;
        newRankChanges.set(participant.id, change);
        newShowEffects.set(participant.id, true);
        
        // Clear effect after animation
        setTimeout(() => {
          setShowEffects(prev => {
            const updated = new Map(prev);
            updated.set(participant.id, false);
            return updated;
          });
        }, 3000);

        // Notify parent of rank change
        if (onRankChange) {
          onRankChange(oldRank, participant.rank, participant);
        }
      }
      newPreviousRanks.set(participant.id, participant.rank);
    });

    setPreviousRanks(newPreviousRanks);
    setRankChanges(newRankChanges);
  }, [participants]);

  // Calculate max votes for progress bars
  const maxVotes = Math.max(...participants.map(p => p.votes), 1);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '👑';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 3: return 'bg-gradient-to-r from-amber-600 to-amber-800';
      default: return 'bg-gradient-to-r from-blue-400 to-blue-600';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          {isRTL ? 'سباق الأصوات' : 'Vote Racing'}
        </h3>
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />
          {participants.length}
        </Badge>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {participants.map((participant, index) => {
            const rankChange = rankChanges.get(participant.id);
            const showEffect = showEffects.get(participant.id);
            const progressPercentage = (participant.votes / maxVotes) * 100;

            return (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? -50 : 50 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                layout
              >
                <Card className={`relative overflow-hidden ${getRankColor(participant.rank)}`}>
                  <CardContent className="p-4">
                    {/* Rank Change Effect */}
                    <AnimatePresence>
                      {showEffect && rankChange !== undefined && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5, y: -20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.5, y: -20 }}
                          className={`absolute top-2 right-2 z-10 px-2 py-1 rounded-full text-xs font-bold ${
                            rankChange > 0 
                              ? 'bg-green-500 text-white' 
                              : 'bg-red-500 text-white'
                          }`}
                        >
                          {rankChange > 0 ? '↑' : '↓'} {Math.abs(rankChange)}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold text-white">
                          {getRankIcon(participant.rank)}
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {participant.name}
                          </div>
                          <div className="text-sm text-white/80">
                            @{participant.username} • {participant.country}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {participant.votes.toLocaleString()}
                        </div>
                        <div className="text-sm text-white/80">
                          {isRTL ? 'صوت' : 'votes'}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative">
                      <Progress 
                        value={progressPercentage} 
                        className="h-3 bg-white/20"
                      />
                      <motion.div
                        className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>

                    {/* Pulse effect for top performers */}
                    {participant.rank <= 3 && (
                      <motion.div
                        className="absolute inset-0 border-2 border-white/30 rounded-lg"
                        animate={{
                          scale: [1, 1.05, 1],
                          opacity: [0.3, 0.1, 0.3],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

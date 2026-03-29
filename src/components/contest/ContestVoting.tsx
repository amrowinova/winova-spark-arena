import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Vote, Users, Timer, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBanner } from '@/contexts/BannerContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  name: string;
  username: string;
  votes: number;
  avatar: string;
  rank: number;
  country: string;
}

interface ContestVotingProps {
  participants: Participant[];
  activeContestId: string;
  usedVotes: number;
  maxVotes: number;
  canVote: boolean;
  timeRemaining: number;
  onVote: (participantId: string, voteCount: number) => void;
}

export function ContestVoting({
  participants,
  activeContestId,
  usedVotes,
  maxVotes,
  canVote,
  timeRemaining,
  onVote
}: ContestVotingProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user: authUser } = useAuth();
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [voteCount, setVoteCount] = useState(1);
  const [isVotingLocal, setIsVotingLocal] = useState(false);

  const handleVote = useCallback(async () => {
    if (!selectedParticipant || !authUser) return;

    const remainingVotes = maxVotes - usedVotes;
    if (voteCount > remainingVotes) {
      showError(isRTL ? 'لا تملك أصوات كافية' : 'Not enough votes');
      return;
    }

    setIsVotingLocal(true);

    try {
      const { data, error } = await (supabase.rpc as any)('vote_contest', {
        p_contest_id: activeContestId,
        p_participant_id: selectedParticipant.id,
        p_vote_count: voteCount,
      });

      if (error) throw error;

      showSuccess(isRTL ? 'تم التصويت بنجاح' : 'Vote successful');
      onVote(selectedParticipant.id, voteCount);
      setSelectedParticipant(null);
      setVoteCount(1);
    } catch (error) {
      console.error('Vote error:', error);
      showError(isRTL ? 'فشل التصويت' : 'Vote failed');
    } finally {
      setIsVotingLocal(false);
    }
  }, [selectedParticipant, activeContestId, authUser, voteCount, maxVotes, usedVotes, onVote, showSuccess, showError, isRTL]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold mb-2">
          {isRTL ? 'التصويت على المسابقة' : 'Vote for Contest'}
        </h2>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{participants.length} {isRTL ? 'مشارك' : 'participants'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Timer className="h-4 w-4" />
            <span>{formatTime(timeRemaining)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Vote className="h-4 w-4" />
            <span>{usedVotes}/{maxVotes} {isRTL ? 'صوت' : 'votes'}</span>
          </div>
        </div>
      </motion.div>

      {/* Participants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {participants.map((participant, index) => (
          <motion.div
            key={participant.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelectedParticipant(participant)}
            className={cn(
              "cursor-pointer transition-all duration-200",
              selectedParticipant?.id === participant.id && "ring-2 ring-primary"
            )}
          >
            <Card className="h-full">
              <CardContent className="p-4 text-center">
                {/* Avatar */}
                <div className="text-4xl mb-3">{participant.avatar}</div>
                
                {/* Name */}
                <h3 className="font-semibold text-lg mb-1">{participant.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">@{participant.username}</p>
                
                {/* Stats */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    #{participant.rank}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium">{participant.votes}</span>
                  </div>
                </div>

                {/* Vote Button */}
                <Button
                  variant={selectedParticipant?.id === participant.id ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  disabled={!canVote || isVotingLocal || usedVotes >= maxVotes}
                >
                  {selectedParticipant?.id === participant.id ? (
                    <div className="flex items-center gap-2">
                      <Vote className="h-3 w-3" />
                      <span>{isRTL ? 'تصويت' : 'Vote'}</span>
                    </div>
                  ) : (
                    <span>{isRTL ? 'اختر' : 'Select'}</span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Vote Dialog */}
      {selectedParticipant && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedParticipant(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background rounded-lg p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{selectedParticipant.avatar}</div>
              <h3 className="font-semibold text-lg">{selectedParticipant.name}</h3>
              <p className="text-sm text-muted-foreground">@{selectedParticipant.username}</p>
            </div>

            {/* Vote Count Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {isRTL ? 'عدد الأصوات' : 'Number of Votes'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 5, 10, 20].map((count) => (
                  <Button
                    key={count}
                    variant={voteCount === count ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVoteCount(count)}
                    disabled={count > (maxVotes - usedVotes)}
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>

            {/* Remaining Votes */}
            <div className="text-center mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm">
                {isRTL ? 'الأصوات المتبقية' : 'Remaining Votes'}:{' '}
                <span className="font-bold text-primary">
                  {maxVotes - usedVotes}
                </span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedParticipant(null)}
                className="flex-1"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleVote}
                disabled={isVotingLocal || voteCount > (maxVotes - usedVotes)}
                className="flex-1"
              >
                {isVotingLocal ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Vote className="h-4 w-4" />
                    <span>{isRTL ? 'صوت' : 'Vote'}</span>
                  </div>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

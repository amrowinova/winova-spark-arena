import { useState, useEffect } from 'react';
import { Gift, Minus, Plus, Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface Contestant {
  id: string;
  name: string;
  username: string;
  votes: number;
  avatar: string;
  rank: number;
  country: string;
}

interface VoteDialogProps {
  open: boolean;
  onClose: () => void;
  contestant: Contestant | null;
  stage: 'stage1' | 'final';
  auraBalance: number;
  novaBalance: number;
  usedVotesStage1: number;
  usedVotesFinal: number;
  freeVoteUsed: boolean;
  freeVoteActive: boolean;
  onVote: (voteCount: number, isFreeVote: boolean) => void;
  onUseFreeVote: () => void;
}

const MAX_VOTES_PER_STAGE = 100;

export function VoteDialog({
  open,
  onClose,
  contestant,
  stage,
  auraBalance,
  novaBalance,
  usedVotesStage1,
  usedVotesFinal,
  freeVoteUsed,
  freeVoteActive,
  onVote,
  onUseFreeVote,
}: VoteDialogProps) {
  const { language } = useLanguage();
  const [voteCount, setVoteCount] = useState(1);

  const isStage1 = stage === 'stage1';
  const usedVotes = isStage1 ? usedVotesStage1 : usedVotesFinal;
  const remainingVotes = MAX_VOTES_PER_STAGE - usedVotes;

  // Calculate max affordable votes
  // Each vote = 1 Aura = 0.5 Nova
  // Aura first, then Nova
  const maxAffordableVotes = Math.floor(auraBalance + (novaBalance * 2));
  const maxVotes = Math.min(remainingVotes, maxAffordableVotes);

  // Calculate cost breakdown
  const calculateCost = (votes: number) => {
    let auraCost = 0;
    let novaCost = 0;
    
    if (auraBalance >= votes) {
      auraCost = votes;
    } else {
      auraCost = auraBalance;
      const remainingNeeded = votes - auraBalance;
      // 2 Aura = 1 Nova, so 1 vote needs 0.5 Nova if paid in Nova
      novaCost = remainingNeeded / 2;
    }
    
    return { auraCost, novaCost };
  };

  const { auraCost, novaCost } = calculateCost(voteCount);

  // Reset vote count when dialog opens
  useEffect(() => {
    if (open) {
      setVoteCount(1);
    }
  }, [open]);

  const handleIncrement = () => {
    if (voteCount < maxVotes) {
      setVoteCount(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (voteCount > 1) {
      setVoteCount(prev => prev - 1);
    }
  };

  const handleQuickSelect = (amount: number) => {
    if (amount <= maxVotes) {
      setVoteCount(amount);
    }
  };

  const handleConfirmVote = () => {
    onVote(voteCount, false);
  };

  const handleFreeVote = () => {
    onUseFreeVote();
  };

  const formatBalance = (value: number): string => {
    return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  };

  if (!contestant) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Vote className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'صوّت لـ' : 'Vote for'} {contestant.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contestant Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl">
              {contestant.avatar}
            </div>
            <div className="flex-1">
              <p className="font-medium">{contestant.name}</p>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'الترتيب الحالي:' : 'Current rank:'} #{contestant.rank}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {contestant.votes} {language === 'ar' ? 'صوت' : 'votes'}
            </Badge>
          </div>

          {/* Free Vote Button (Stage 1 only, if active and not used) */}
          {isStage1 && freeVoteActive && !freeVoteUsed && (
            <Button
              className="w-full bg-success text-success-foreground hover:bg-success/90"
              onClick={handleFreeVote}
            >
              <Gift className="h-4 w-4 me-2" />
              {language === 'ar' ? '🎁 استخدم صوتك المجاني' : '🎁 Use Your Free Vote'}
            </Button>
          )}

          {/* Remaining Votes Info */}
          <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <span className="text-sm text-muted-foreground">
              {language === 'ar' ? 'الأصوات المتبقية لهذه المرحلة:' : 'Remaining votes this stage:'}
            </span>
            <Badge variant="secondary" className="font-bold">
              {remainingVotes} / {MAX_VOTES_PER_STAGE}
            </Badge>
          </div>

          {/* Vote Count Selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-center block">
              {language === 'ar' ? 'عدد الأصوات' : 'Number of Votes'}
            </label>
            
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDecrement}
                disabled={voteCount <= 1}
                className="h-10 w-10"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <div className="w-20 h-12 flex items-center justify-center bg-muted rounded-lg">
                <span className="text-2xl font-bold">{voteCount}</span>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleIncrement}
                disabled={voteCount >= maxVotes}
                className="h-10 w-10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Select Buttons */}
            <div className="flex justify-center gap-2 flex-wrap">
              {[5, 10, 25, 50].filter(n => n <= maxVotes).map(amount => (
                <Button
                  key={amount}
                  variant={voteCount === amount ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickSelect(amount)}
                  className="text-xs"
                >
                  {amount}
                </Button>
              ))}
              {maxVotes > 0 && (
                <Button
                  variant={voteCount === maxVotes ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickSelect(maxVotes)}
                  className="text-xs"
                >
                  {language === 'ar' ? 'الكل' : 'Max'} ({maxVotes})
                </Button>
              )}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {language === 'ar' ? 'التكلفة:' : 'Cost:'}
              </span>
              <div className="flex items-center gap-2">
                {auraCost > 0 && (
                  <span className="text-aura font-medium">✦ {formatBalance(auraCost)}</span>
                )}
                {auraCost > 0 && novaCost > 0 && (
                  <span className="text-muted-foreground">+</span>
                )}
                {novaCost > 0 && (
                  <span className="text-nova font-medium">И {formatBalance(novaCost)}</span>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              {language === 'ar' 
                ? 'كل صوت = 1 Aura (يعادل 0.5 Nova) • يُخصم من Aura أولًا'
                : 'Each vote = 1 Aura (equals 0.5 Nova) • Deducted from Aura first'}
            </p>
          </div>

          {/* Your Balance */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="text-aura">✦ {formatBalance(auraBalance)}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-nova">И {formatBalance(novaBalance)}</span>
          </div>

          {/* Confirm Button */}
          <Button
            className="w-full h-12 bg-gradient-primary text-primary-foreground font-bold"
            onClick={handleConfirmVote}
            disabled={maxVotes === 0 || voteCount < 1}
          >
            <Vote className="h-4 w-4 me-2" />
            {language === 'ar' 
              ? `صوّت بـ ${voteCount} صوت`
              : `Vote with ${voteCount} vote${voteCount > 1 ? 's' : ''}`}
          </Button>

          {maxVotes === 0 && remainingVotes === 0 && (
            <p className="text-xs text-destructive text-center">
              {language === 'ar' 
                ? '❌ استنفدت جميع أصواتك في هذه المرحلة'
                : '❌ You have used all your votes for this stage'}
            </p>
          )}

          {maxVotes === 0 && remainingVotes > 0 && (
            <p className="text-xs text-destructive text-center">
              {language === 'ar' 
                ? '❌ رصيد غير كافي'
                : '❌ Insufficient balance'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
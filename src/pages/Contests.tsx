import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronRight, Star } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReceiptDialog } from '@/components/common/ReceiptCard';
import { useUser } from '@/contexts/UserContext';
import { useTransactions, Receipt, getPricing } from '@/contexts/TransactionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// Contest Components
import {
  ContestStageHeader,
  ContestUserStatusCard,
  ContestContestantCard,
  ContestInfoBox,
} from '@/components/contest';

// Mock contest data - expanded with more participants
const mockContest = {
  id: 'C-1247',
  participants: 156,
  prizePool: 936,
  stage: 'stage1' as const,
  endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
  joinCloses: new Date(Date.now() + 1 * 60 * 60 * 1000),
  entryFee: 10,
};

// Generate all participants (mock 156 total)
const generateParticipants = () => {
  const names = [
    'خالد محمد', 'فاطمة سعيد', 'عمر أحمد', 'ليلى حسن', 'أحمد كريم',
    'نورا بكر', 'سارة علي', 'محمد سالم', 'مريم حسن', 'يوسف عادل',
    'هدى أحمد', 'علي سعيد', 'رنا محمد', 'كريم فؤاد', 'دينا حسام',
    'طارق أمين', 'نادية رشيد', 'سامي جابر', 'لينا خالد', 'وائل سمير',
  ];
  const avatars = ['👨', '👩', '👨', '👩', '👨', '👩', '👨', '👩', '👨', '👩'];
  const countries = ['Saudi Arabia', 'Egypt', 'Palestine', 'Syria', 'Jordan'];
  
  const participants = [];
  for (let i = 0; i < 80; i++) { // Show 80 participants for demo
    const votes = Math.max(1, 95 - i * 1.2 + Math.floor(Math.random() * 5));
    participants.push({
      id: `${100 + i}`,
      name: names[i % names.length],
      username: `user_${100 + i}`,
      votes: Math.round(votes),
      avatar: avatars[i % avatars.length],
      rank: i + 1,
      country: countries[i % countries.length],
    });
  }
  return participants;
};

// Format balance helper
const formatBalance = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

export default function ContestsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user, spendAura, spendNova } = useUser();
  const { createTransaction, calculateLocalAmount } = useTransactions();

  const [selectedTab, setSelectedTab] = useState('contestants');
  const [contest, setContest] = useState(mockContest);
  const [participants, setParticipants] = useState(generateParticipants);
  const [userVotes, setUserVotes] = useState(24);
  const [userRank, setUserRank] = useState(47);
  const [hasJoined, setHasJoined] = useState(true); // User already joined for demo
  
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<typeof participants[0] | null>(null);
  
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const pricing = getPricing(user.country);
  
  // Votes needed for top 50
  const top50Threshold = participants[49]?.votes || 45;

  const handleJoinContest = () => {
    const entryFee = contest.entryFee;
    const auraEquivalent = entryFee * 2;
    
    if (user.auraBalance >= auraEquivalent) {
      spendAura(auraEquivalent);
    } else if (user.novaBalance >= entryFee) {
      spendNova(entryFee);
    } else if (user.auraBalance > 0 && user.novaBalance > 0) {
      const auraToUse = user.auraBalance;
      const novaEquivalentFromAura = auraToUse / 2;
      const remainingNovaNeeded = entryFee - novaEquivalentFromAura;
      
      if (user.novaBalance >= remainingNovaNeeded) {
        spendAura(auraToUse);
        spendNova(remainingNovaNeeded);
      } else {
        toast.error(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
        return;
      }
    } else {
      toast.error(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      return;
    }

    const receipt = createTransaction({
      type: 'contest_entry',
      status: 'completed',
      amount: entryFee,
      currency: 'nova',
      sender: {
        id: user.id,
        name: user.name,
        username: `${user.name.toLowerCase()}_user`,
        country: user.country,
      },
      reason: language === 'ar' 
        ? `دخول المسابقة اليومية #${contest.id}`
        : `Daily Contest Entry #${contest.id}`,
      contestId: contest.id,
    });

    setHasJoined(true);
    setJoinDialogOpen(false);
    setSelectedReceipt(receipt);
    setReceiptDialogOpen(true);
    toast.success(language === 'ar' ? '🎉 تم الانضمام للمسابقة!' : '🎉 Joined the contest!');
  };

  const handleVote = (participant: typeof participants[0]) => {
    setSelectedParticipant(participant);
    setVoteDialogOpen(true);
  };

  const handleConfirmVote = (voteType: 'free' | 'nova' | 'aura', voteCount: number = 1) => {
    if (!selectedParticipant) return;

    if (voteType === 'nova' && user.novaBalance < voteCount) {
      toast.error(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      return;
    }

    if (voteType === 'aura' && user.auraBalance < voteCount) {
      toast.error(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      return;
    }

    if (voteType === 'nova') {
      spendNova(voteCount);
    } else if (voteType === 'aura') {
      spendAura(voteCount);
    }

    if (voteType !== 'free') {
      const receipt = createTransaction({
        type: 'vote_sent',
        status: 'completed',
        amount: voteCount,
        currency: voteType as 'nova' | 'aura',
        sender: {
          id: user.id,
          name: user.name,
          username: `${user.name.toLowerCase()}_user`,
          country: user.country,
        },
        receiver: {
          id: selectedParticipant.id,
          name: selectedParticipant.name,
          username: selectedParticipant.username,
          country: selectedParticipant.country,
        },
        reason: language === 'ar' 
          ? `تصويت ${voteCount} صوت لـ ${selectedParticipant.name}`
          : `Voted ${voteCount} for ${selectedParticipant.name}`,
        contestId: contest.id,
      });
      setSelectedReceipt(receipt);
    }

    setParticipants(prev => 
      prev.map(p => 
        p.id === selectedParticipant.id 
          ? { ...p, votes: p.votes + voteCount }
          : p
      ).sort((a, b) => b.votes - a.votes).map((p, i) => ({ ...p, rank: i + 1 }))
    );

    setVoteDialogOpen(false);
    
    if (voteType !== 'free') {
      setReceiptDialogOpen(true);
    }

    toast.success(language === 'ar' 
      ? `تم التصويت ${voteCount} صوت لـ ${selectedParticipant.name}!`
      : `Voted ${voteCount} for ${selectedParticipant.name}!`
    );
  };

  return (
    <AppLayout title={language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'}>
      <div className="px-4 py-4 space-y-4">
        
        {/* Stage Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ContestStageHeader
            stage={contest.stage}
            participants={contest.participants}
            endsAt={contest.endsAt}
          />
        </motion.div>

        {/* User Status Card */}
        <ContestUserStatusCard
          userRank={userRank}
          userVotes={userVotes}
          votesNeededForTop50={top50Threshold}
          hasJoined={hasJoined}
        />

        {/* Free Vote Banner - Stage 1 Only */}
        {contest.stage === 'stage1' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ContestInfoBox variant="free-vote" stage={contest.stage} />
          </motion.div>
        )}

        {/* Join Button (if not joined) */}
        {!hasJoined && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="p-4">
              <div className="text-center mb-3">
                <p className="text-sm text-muted-foreground mb-1">
                  {language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}
                </p>
                <p className="text-xl font-bold text-nova">И {contest.entryFee}</p>
              </div>
              <Button 
                className="w-full bg-gradient-primary"
                onClick={() => setJoinDialogOpen(true)}
                disabled={(user.novaBalance + (user.auraBalance / 2)) < contest.entryFee}
              >
                {language === 'ar' ? 'انضم الآن' : 'Join Now'}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                {language === 'ar' 
                  ? 'يتم الخصم تلقائياً من Aura أولاً ثم Nova'
                  : 'Auto-deducts from Aura first, then Nova'}
              </p>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contestants">
              {language === 'ar' ? 'المتسابقون' : 'Contestants'}
            </TabsTrigger>
            <TabsTrigger value="rules">
              {language === 'ar' ? 'القواعد' : 'Rules'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contestants" className="mt-4 space-y-3">
            {/* Qualification Info */}
            <ContestInfoBox variant="qualification-rules" />
            
            {/* Contestants List */}
            <div className="space-y-2">
              <AnimatePresence>
                {participants.map((participant, index) => (
                  <ContestContestantCard
                    key={participant.id}
                    contestant={participant}
                    index={index}
                    onVote={handleVote}
                    canVote={hasJoined}
                  />
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="rules" className="mt-4 space-y-4">
            {/* Stage 1 Rules */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-bold text-primary flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  {language === 'ar' ? 'قواعد المرحلة الأولى' : 'Stage 1 Rules'}
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-success">✓</span>
                    <p className="text-muted-foreground">
                      {language === 'ar' 
                        ? 'أفضل 50 متسابق يتأهلون للمرحلة النهائية'
                        : 'Top 50 contestants qualify for the Final Stage'}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-success">✓</span>
                    <p className="text-muted-foreground">
                      {language === 'ar' 
                        ? 'الترتيب يعتمد على عدد الأصوات المستلمة'
                        : 'Ranking is based on votes received'}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-success">✓</span>
                    <p className="text-muted-foreground">
                      {language === 'ar' 
                        ? 'صوت مجاني واحد يظهر عشوائيًا خلال المرحلة'
                        : 'One free vote appears randomly during the stage'}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-aura">✦</span>
                    <p className="text-muted-foreground">
                      {language === 'ar' 
                        ? 'المتسابق يحصل على 10% من الأصوات المدفوعة كمكافأة Aura'
                        : 'Contestants earn 10% of paid votes as Aura rewards'}
                    </p>
                  </div>
                </div>
                
                <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <p className="text-xs text-warning font-medium">
                    {language === 'ar' 
                      ? '⚠️ لا يتم توزيع أي جوائز في المرحلة الأولى'
                      : '⚠️ No prizes are distributed in Stage 1'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Stage Info */}
            <ContestInfoBox variant="stage-info" stage={contest.stage} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Join Contest Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">
              {language === 'ar' ? 'انضم للمسابقة' : 'Join Contest'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {language === 'ar' 
                ? 'سيتم الخصم تلقائياً من رصيدك'
                : 'Will be automatically deducted from your balance'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Balance Box */}
            <div className="p-4 bg-gradient-to-r from-aura/10 to-nova/10 rounded-xl border border-border/50">
              <p className="text-xs text-muted-foreground text-center mb-2">
                {language === 'ar' ? 'رصيدك الحالي' : 'Your Balance'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-aura font-bold text-lg">✦ {formatBalance(user.auraBalance)}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-nova font-bold text-lg">И {formatBalance(user.novaBalance)}</span>
              </div>
            </div>

            {/* Entry Fee */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'ar' ? 'رسوم الدخول' : 'Entry Fee'}
              </p>
              <p className="text-xl font-bold text-primary">И {contest.entryFee}</p>
            </div>
            
            {/* Single Payment Button */}
            <Button 
              className="w-full h-12 bg-gradient-primary text-primary-foreground font-bold text-base"
              onClick={handleJoinContest}
              disabled={(user.novaBalance + (user.auraBalance / 2)) < contest.entryFee}
            >
              {language === 'ar' ? 'ادفع الآن' : 'Pay Now'}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              {language === 'ar' 
                ? 'يتم الخصم تلقائياً من Aura أولاً ثم Nova'
                : 'Auto-deducts from Aura first, then Nova'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vote Dialog */}
      <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {language === 'ar' ? 'صوّت لـ' : 'Vote for'} {selectedParticipant?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => handleConfirmVote('free')}
            >
              <span className="me-2">🆓</span>
              {language === 'ar' ? 'تصويت مجاني (مرة يومياً)' : 'Free Vote (1x daily)'}
            </Button>
            
            <Button 
              className="w-full bg-gradient-nova text-nova-foreground"
              onClick={() => handleConfirmVote('nova', 1)}
              disabled={user.novaBalance < 1}
            >
              <span className="me-2">И</span>
              {language === 'ar' ? 'صوت بـ 1 Nova' : 'Vote with 1 Nova'}
            </Button>
            
            <Button 
              className="w-full bg-gradient-aura text-aura-foreground"
              onClick={() => handleConfirmVote('aura', 1)}
              disabled={user.auraBalance < 1}
            >
              <span className="me-2">✦</span>
              {language === 'ar' ? 'صوت بـ 1 Aura' : 'Vote with 1 Aura'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {language === 'ar' 
                ? 'كل تصويت مدفوع يولّد إيصال'
                : 'Each paid vote generates a receipt'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <ReceiptDialog
        receipt={selectedReceipt}
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
      />
    </AppLayout>
  );
}

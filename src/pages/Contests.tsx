import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Star, ThumbsUp, Clock, ChevronRight, Info } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CurrencyBadge } from '@/components/common/CurrencyBadge';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { ReceiptDialog } from '@/components/common/ReceiptCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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

// Mock contest data
const mockContest = {
  id: 'C-1247',
  participants: 156,
  prizePool: 936, // 6 Nova × 156 participants
  stage: 'stage1' as const,
  endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
  joinCloses: new Date(Date.now() + 1 * 60 * 60 * 1000),
  entryFee: 10,
  userJoined: false,
  userVotes: 24,
  votesToTop50: 45,
};

// Mock top participants
const initialParticipants = [
  { id: '101', name: 'خالد محمد', username: 'khalid_m', votes: 89, avatar: '👨', rank: 1, country: 'Saudi Arabia' },
  { id: '102', name: 'فاطمة سعيد', username: 'fatima_s', votes: 76, avatar: '👩', rank: 2, country: 'Egypt' },
  { id: '103', name: 'عمر أحمد', username: 'omar_a', votes: 72, avatar: '👨', rank: 3, country: 'Saudi Arabia' },
  { id: '104', name: 'ليلى حسن', username: 'layla_h', votes: 68, avatar: '👩', rank: 4, country: 'Palestine' },
  { id: '105', name: 'أحمد كريم', username: 'ahmed_k', votes: 65, avatar: '👨', rank: 5, country: 'Saudi Arabia' },
  { id: '106', name: 'نورا بكر', username: 'nora_b', votes: 61, avatar: '👩', rank: 6, country: 'Syria' },
];

const prizeDistribution = [
  { place: '1st', percentage: 50 },
  { place: '2nd', percentage: 20 },
  { place: '3rd', percentage: 15 },
  { place: '4th', percentage: 10 },
  { place: '5th', percentage: 5 },
];

// Mock contest history data (newest to oldest)
interface ContestHistoryItem {
  id: string;
  date: string;
  prizePool: number;
  participants: number;
  userRank: number | null;
  participated: boolean;
  winners: { name: string; prize: number; rank: number }[];
}

const mockContestHistory: ContestHistoryItem[] = [
  {
    id: 'C-1246',
    date: '25 يناير 2026',
    prizePool: 936,
    participants: 156,
    userRank: 12,
    participated: true,
    winners: [
      { name: 'خالد محمد', prize: 468, rank: 1 },
      { name: 'فاطمة سعيد', prize: 187, rank: 2 },
      { name: 'عمر أحمد', prize: 140, rank: 3 },
    ],
  },
  {
    id: 'C-1245',
    date: '24 يناير 2026',
    prizePool: 840,
    participants: 140,
    userRank: 35,
    participated: true,
    winners: [
      { name: 'سارة علي', prize: 420, rank: 1 },
      { name: 'أحمد كريم', prize: 168, rank: 2 },
      { name: 'ليلى حسن', prize: 126, rank: 3 },
    ],
  },
  {
    id: 'C-1244',
    date: '23 يناير 2026',
    prizePool: 780,
    participants: 130,
    userRank: null,
    participated: false,
    winners: [
      { name: 'محمد سالم', prize: 390, rank: 1 },
      { name: 'نورا بكر', prize: 156, rank: 2 },
      { name: 'يوسف عادل', prize: 117, rank: 3 },
    ],
  },
  {
    id: 'C-1243',
    date: '22 يناير 2026',
    prizePool: 900,
    participants: 150,
    userRank: 8,
    participated: true,
    winners: [
      { name: 'فاطمة أحمد', prize: 450, rank: 1 },
      { name: 'خالد سعيد', prize: 180, rank: 2 },
      { name: 'مريم حسن', prize: 135, rank: 3 },
    ],
  },
];

export default function ContestsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user, spendAura, spendNova, addAura } = useUser();
  const { createTransaction, calculateLocalAmount } = useTransactions();

  const [selectedTab, setSelectedTab] = useState('current');
  const [contest, setContest] = useState(mockContest);
  const [participants, setParticipants] = useState(initialParticipants);
  const [userVotes, setUserVotes] = useState(24);
  const [userRank, setUserRank] = useState(47);
  
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<typeof participants[0] | null>(null);
  
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  
  // Contest history state
  const [contestHistory] = useState<ContestHistoryItem[]>(mockContestHistory);
  const [historyDetailsOpen, setHistoryDetailsOpen] = useState(false);
  const [selectedHistoryContest, setSelectedHistoryContest] = useState<ContestHistoryItem | null>(null);

  const pricing = getPricing(user.country);
  const entryFeeLocal = calculateLocalAmount(contest.entryFee, user.country, 'aura');
  
  const handleViewHistoryDetails = (historyItem: ContestHistoryItem) => {
    setSelectedHistoryContest(historyItem);
    setHistoryDetailsOpen(true);
  };

  const handleJoinContest = (useAura: boolean) => {
    const hasEnough = useAura ? user.auraBalance >= contest.entryFee : user.novaBalance >= contest.entryFee;
    
    if (!hasEnough) {
      toast.error(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      return;
    }

    // Deduct balance
    if (useAura) {
      spendAura(contest.entryFee);
    } else {
      // Nova is auto-converted to Aura for contest entry
      spendNova(contest.entryFee);
      // Don't add Aura since it's used immediately
    }

    // Create transaction with receipt
    const receipt = createTransaction({
      type: 'contest_entry',
      status: 'completed',
      amount: contest.entryFee,
      currency: useAura ? 'aura' : 'nova',
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

    setContest(prev => ({ ...prev, userJoined: true }));
    setJoinDialogOpen(false);
    setSelectedReceipt(receipt);
    setReceiptDialogOpen(true);

    toast.success(language === 'ar' ? 'تم الانضمام للمسابقة!' : 'Joined contest!');
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

    // Deduct balance for paid votes
    if (voteType === 'nova') {
      spendNova(voteCount);
    } else if (voteType === 'aura') {
      spendAura(voteCount);
    }

    // Create transaction with receipt for paid votes
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
          ? `تصويت ${voteCount} صوت لـ ${selectedParticipant.name} - المسابقة #${contest.id}`
          : `Voted ${voteCount} for ${selectedParticipant.name} - Contest #${contest.id}`,
        contestId: contest.id,
      });

      setSelectedReceipt(receipt);
    }

    // Update participant votes
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
      <div className="px-4 py-4 space-y-5">
        {/* Contest Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-primary p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-primary-foreground" />
                  <h1 className="text-primary-foreground text-lg font-bold">
                    {language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'}
                  </h1>
                </div>
                <span className="px-3 py-1 bg-card/20 rounded-full text-primary-foreground text-xs font-medium">
                  {language === 'ar' ? 'المرحلة الأولى' : 'Stage 1'}
                </span>
              </div>

              {/* Prize Pool */}
              <div className="text-center mb-4">
                <p className="text-primary-foreground/70 text-sm mb-1">
                  {language === 'ar' ? 'مجموع الجوائز' : 'Prize Pool'}
                </p>
                <p className="text-primary-foreground text-4xl font-bold">
                  И {contest.prizePool} <span className="text-2xl">Nova</span>
                </p>
                <p className="text-primary-foreground/60 text-xs mt-1">
                  ≈ {pricing.symbol} {calculateLocalAmount(contest.prizePool, user.country, 'nova').amount.toFixed(0)}
                </p>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-card/10 rounded-lg p-2">
                  <Users className="h-4 w-4 mx-auto mb-1 text-primary-foreground/70" />
                  <p className="text-primary-foreground font-bold">{contest.participants}</p>
                  <p className="text-primary-foreground/60 text-[10px]">
                    {language === 'ar' ? 'مشترك' : 'Participants'}
                  </p>
                </div>
                <div className="bg-card/10 rounded-lg p-2">
                  <ThumbsUp className="h-4 w-4 mx-auto mb-1 text-primary-foreground/70" />
                  <p className="text-primary-foreground font-bold">{userVotes}</p>
                  <p className="text-primary-foreground/60 text-[10px]">
                    {language === 'ar' ? 'أصواتك' : 'Your Votes'}
                  </p>
                </div>
                <div className="bg-card/10 rounded-lg p-2">
                  <Star className="h-4 w-4 mx-auto mb-1 text-primary-foreground/70" />
                  <p className="text-primary-foreground font-bold">{contest.votesToTop50}</p>
                  <p className="text-primary-foreground/60 text-[10px]">
                    {language === 'ar' ? 'للـ 50' : 'To Top 50'}
                  </p>
                </div>
              </div>
            </div>

            {/* Countdown & Join */}
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{language === 'ar' ? 'تنتهي المرحلة خلال' : 'Stage ends in'}</span>
              </div>
              <CountdownTimer targetDate={contest.endsAt} size="sm" className="mb-4" />
              
              {!contest.userJoined ? (
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-center font-bold">
                      {language === 'ar' ? 'رسوم الدخول:' : 'Entry Fee:'} И {contest.entryFee} Nova
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {language === 'ar' 
                        ? 'يمكن الدخول باستخدام Nova أو Aura بقيمة تعادل 10 Nova'
                        : 'Pay with Nova or Aura (1 Nova = 2 Aura)'}
                    </p>
                  </div>
                  
                  <Button 
                    className="w-full bg-gradient-primary"
                    onClick={() => setJoinDialogOpen(true)}
                  >
                    {language === 'ar' ? 'انضم الآن' : 'Join Now'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 p-3 bg-success/10 rounded-lg text-success">
                  <Star className="h-4 w-4" />
                  <span className="font-medium">
                    {language === 'ar' ? 'انضممت بالفعل' : 'Already Joined'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <Card className="p-3 bg-aura/5 border-aura/20">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-aura mt-0.5 shrink-0" />
            <p className="text-xs text-aura">
              {language === 'ar' 
                ? 'المتسابق يحصل على 10% من قيمة الأصوات المدفوعة المستلمة كمكافأة Aura'
                : 'Contestants earn 10% of paid votes received as Aura rewards'}
            </p>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">
              {language === 'ar' ? 'أفضل 50' : 'Top 50'}
            </TabsTrigger>
            <TabsTrigger value="prizes">
              {language === 'ar' ? 'الجوائز' : 'Prizes'}
            </TabsTrigger>
            <TabsTrigger value="history">
              {language === 'ar' ? 'السجل' : 'History'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4 space-y-3">
            {/* User rank indicator */}
            <Card className="p-3 border-primary glow-primary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {userRank}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-primary">
                    {language === 'ar' ? 'ترتيبك اليوم' : 'Your Rank Today'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userVotes} {language === 'ar' ? 'صوت' : 'votes'} • 
                    {language === 'ar' ? ' تحتاج ' : ' Need '}
                    {contest.votesToTop50 - userVotes} {language === 'ar' ? ' للدخول في الـ 50' : ' more for Top 50'}
                  </p>
                </div>
              </div>
            </Card>

            <AnimatePresence>
              {participants.map((participant, index) => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-3 flex items-center gap-3">
                      {/* Rank */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        participant.rank <= 3 ? 'bg-gradient-nova text-nova-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {participant.rank}
                      </div>

                      {/* Avatar & Name */}
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                          {participant.avatar}
                        </div>
                        <div>
                          <p className="font-medium">{participant.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {participant.votes} {language === 'ar' ? 'صوت' : 'votes'}
                          </p>
                        </div>
                      </div>

                      {/* Vote Button */}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleVote(participant)}
                      >
                        {language === 'ar' ? 'صوّت' : 'Vote'}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="prizes" className="mt-4 space-y-3">
            {/* Section Title */}
            <p className="text-sm text-muted-foreground text-center">
              {language === 'ar' 
                ? 'توزيع جوائز المسابقة اليومية (Nova)'
                : 'Daily Contest Prize Distribution (Nova)'}
            </p>
            
            <Card>
              <CardContent className="p-4 space-y-4">
                {prizeDistribution.map((prize, index) => {
                  const prizeAmount = contest.prizePool * prize.percentage / 100;
                  const prizeLocal = calculateLocalAmount(prizeAmount, user.country, 'nova');
                  
                  return (
                    <div key={prize.place} className="space-y-2">
                      {/* Row Header: Rank + Percentage */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">
                            {language === 'ar' 
                              ? ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'][index]
                              : prize.place
                            }
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {prize.percentage}%
                        </span>
                      </div>
                      
                      {/* Progress Bar - Consistent color */}
                      <Progress value={prize.percentage} className="h-2" />
                      
                      {/* Prize Amount */}
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-nova">
                          И {prizeAmount % 1 === 0 ? prizeAmount.toFixed(0) : prizeAmount.toFixed(1)} Nova
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ≈ {pricing.symbol} {prizeLocal.amount.toFixed(0)}
                        </p>
                      </div>
                      
                      {index < prizeDistribution.length - 1 && (
                        <div className="border-b border-border/50 pt-2" />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {/* Intro Text */}
            <p className="text-sm text-muted-foreground text-center">
              {language === 'ar' 
                ? 'هنا تجد جميع المسابقات التي شاركت بها سابقًا'
                : 'Here you can find all contests you participated in'}
            </p>
            
            {/* Mock Contest History */}
            {contestHistory.length > 0 ? (
              <div className="space-y-3">
                {contestHistory.map((historyItem) => {
                  const historyPrizeLocal = calculateLocalAmount(historyItem.prizePool, user.country, 'nova');
                  
                  return (
                    <Card key={historyItem.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-sm">
                              {language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'}
                            </h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              📅 {historyItem.date}
                            </p>
                          </div>
                          {historyItem.participated && (
                            <span className="px-2 py-1 bg-success/10 text-success text-xs rounded-full">
                              {language === 'ar' ? 'شاركت' : 'Participated'}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-muted/50 rounded-lg p-2">
                            <p className="text-xs text-muted-foreground">
                              {language === 'ar' ? 'مجموع الجوائز' : 'Prize Pool'}
                            </p>
                            <p className="font-bold text-nova">И {historyItem.prizePool} Nova</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-2">
                            <p className="text-xs text-muted-foreground">
                              {language === 'ar' ? 'مركزك' : 'Your Rank'}
                            </p>
                            <p className="font-bold">
                              {historyItem.participated 
                                ? `#${historyItem.userRank}`
                                : (language === 'ar' ? '—' : '—')
                              }
                            </p>
                          </div>
                        </div>
                        
                        {historyItem.participated ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => handleViewHistoryDetails(historyItem)}
                          >
                            {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                            <ChevronRight className="h-4 w-4 ms-1" />
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            {language === 'ar' ? 'لم تشارك في هذه المسابقة' : 'You did not participate in this contest'}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'لا توجد مسابقات سابقة' : 'No past contests'}
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Join Contest Dialog */}
        <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {language === 'ar' ? 'انضم للمسابقة' : 'Join Contest'}
              </DialogTitle>
              <DialogDescription>
                {language === 'ar' 
                  ? 'اختر طريقة الدفع للانضمام للمسابقة'
                  : 'Choose payment method to join the contest'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Nova</p>
                  <p className="font-bold text-nova">И {user.novaBalance % 1 === 0 ? user.novaBalance.toFixed(0) : user.novaBalance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aura</p>
                  <p className="font-bold text-aura">✧ {user.auraBalance % 1 === 0 ? user.auraBalance.toFixed(0) : user.auraBalance.toFixed(2)}</p>
                </div>
              </div>

              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-center font-bold">
                  {language === 'ar' ? 'رسوم الدخول:' : 'Entry Fee:'} И {contest.entryFee} Nova
                </p>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {language === 'ar' 
                    ? 'يمكن الدخول باستخدام Nova أو Aura بقيمة تعادل 10 Nova'
                    : 'Pay with Nova or Aura (1 Nova = 2 Aura)'}
                </p>
              </div>
              
              <Button 
                className="w-full bg-gradient-aura text-aura-foreground"
                onClick={() => handleJoinContest(true)}
                disabled={user.auraBalance < contest.entryFee}
              >
                <span className="me-2">◈</span>
                {language === 'ar' ? 'ادفع بـ Aura' : 'Pay with Aura'}
              </Button>
              
              <Button 
                className="w-full bg-gradient-nova text-nova-foreground"
                onClick={() => handleJoinContest(false)}
                disabled={user.novaBalance < contest.entryFee}
              >
                <span className="me-2">✦</span>
                {language === 'ar' ? 'ادفع بـ Nova (تحويل تلقائي)' : 'Pay with Nova (auto-convert)'}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                {language === 'ar' 
                  ? 'النظام يحول تلقائياً بين العملات (1 Nova = 2 Aura)'
                  : 'System auto-converts between currencies (1 Nova = 2 Aura)'}
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Vote Dialog */}
        <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
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
                <span className="me-2">✧</span>
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

        {/* History Details Dialog */}
        <Dialog open={historyDetailsOpen} onOpenChange={setHistoryDetailsOpen}>
          <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {language === 'ar' ? 'تفاصيل المسابقة' : 'Contest Details'}
              </DialogTitle>
              <DialogDescription>
                📅 {selectedHistoryContest?.date}
              </DialogDescription>
            </DialogHeader>
            
            {selectedHistoryContest && (
              <div className="space-y-4">
                {/* Prize Pool */}
                <div className="p-3 bg-gradient-primary/10 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'ar' ? 'مجموع الجوائز' : 'Prize Pool'}
                  </p>
                  <p className="text-2xl font-bold text-nova">
                    И {selectedHistoryContest.prizePool} Nova
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedHistoryContest.participants} {language === 'ar' ? 'مشترك' : 'participants'}
                  </p>
                </div>
                
                {/* User Rank */}
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground text-center mb-1">
                    {language === 'ar' ? 'مركزك في هذه المسابقة' : 'Your Rank in this Contest'}
                  </p>
                  <p className="text-2xl font-bold text-center text-primary">
                    #{selectedHistoryContest.userRank}
                  </p>
                </div>
                
                {/* Winners */}
                <div>
                  <p className="text-sm font-medium mb-2">
                    {language === 'ar' ? 'الفائزون' : 'Winners'}
                  </p>
                  <div className="space-y-2">
                    {selectedHistoryContest.winners.map((winner, index) => {
                      const prizeLocal = calculateLocalAmount(winner.prize, user.country, 'nova');
                      return (
                        <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {winner.rank}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{winner.name}</p>
                          </div>
                          <div className="text-end">
                            <p className="text-sm font-bold text-nova">И {winner.prize} Nova</p>
                            <p className="text-[10px] text-muted-foreground">
                              ≈ {pricing.symbol} {prizeLocal.amount.toFixed(0)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Prize Distribution */}
                <div>
                  <p className="text-sm font-medium mb-2">
                    {language === 'ar' ? 'توزيع الجوائز' : 'Prize Distribution'}
                  </p>
                  <div className="space-y-2">
                    {prizeDistribution.map((prize, index) => {
                      const prizeAmount = selectedHistoryContest.prizePool * prize.percentage / 100;
                      return (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {language === 'ar' 
                              ? ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'][index]
                              : prize.place
                            } ({prize.percentage}%)
                          </span>
                          <span className="font-medium text-nova">
                            И {prizeAmount % 1 === 0 ? prizeAmount.toFixed(0) : prizeAmount.toFixed(1)} Nova
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <p className="text-[10px] text-muted-foreground text-center">
                  {language === 'ar' 
                    ? 'هذه البيانات ثابتة ولا تتغير'
                    : 'This data is frozen and will not change'}
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Receipt Dialog */}
        <ReceiptDialog
          receipt={selectedReceipt}
          open={receiptDialogOpen}
          onClose={() => setReceiptDialogOpen(false)}
        />
      </div>
    </AppLayout>
  );
}

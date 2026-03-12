import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet, AlertCircle } from 'lucide-react';
import { useP2PSafe } from '@/contexts/P2PContext';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNovaPricing } from '@/hooks/useNovaPricing';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Home Components
import { ActiveUsersCard } from '@/components/home/ActiveUsersCard';
import { LuckyLeadersCard } from '@/components/home/LuckyLeadersCard';
import { TopWinnersCard } from '@/components/home/TopWinnersCard';
import { ContestJoinCard } from '@/components/home/ContestJoinCard';
import { getContestTiming, getSaudiDateStr } from '@/lib/contestTiming';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBanner } from '@/contexts/BannerContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

// Format number - remove decimals if whole number
const formatBalance = (value: number): string => {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
};

export default function HomePage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { user } = useUser();
  const { chats: p2pChats } = useP2PSafe();
  const { success: showSuccess, error: showError } = useBanner();
  
  // Check for active P2P orders, disputes, or unread messages
  const hasActiveP2POrder = p2pChats.some(chat => 
    chat.orders.some(order => 
      ['created', 'waiting_payment', 'paid', 'dispute'].includes(order.status)
    )
  );
  const hasP2PDispute = p2pChats.some(chat => 
    chat.orders.some(order => order.status === 'dispute')
  );
  const hasUnreadP2P = p2pChats.some(chat => chat.unreadCount > 0);
  const showP2PAlert = hasActiveP2POrder || hasP2PDispute || hasUnreadP2P;
  
  // Get local currency info
  const { getCurrencyInfo } = useNovaPricing();
  const pricing = getCurrencyInfo(user.country);
  const novaLocalValue = user.novaBalance * pricing.novaRate;

  // Real contest data from DB
  const [activeContestId, setActiveContestId] = useState<string | null>(null);
  const [prizePool, setPrizePool] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Contest timing from KSA
  const [timing, setTiming] = useState(getContestTiming());
  const entryFee = 10;

  // Update timing every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTiming(getContestTiming());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Safety: if join dialog is open and join window closes (18:00 KSA), close it immediately.
  useEffect(() => {
    if (joinDialogOpen && !timing.canJoin) {
      setJoinDialogOpen(false);
    }
  }, [joinDialogOpen, timing.canJoin]);

  // Fetch real contest data
  const fetchContestData = useCallback(async () => {
    try {
      // Use same query as Contests page: fetch today's or most recent contest
      const ksaToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
      const { data: contestData } = await supabase
        .from('contests')
        .select('id, prize_pool, current_participants')
        .lte('contest_date', ksaToday)
        .order('contest_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contestData) {
        setActiveContestId(contestData.id);
        setPrizePool(contestData.prize_pool || 0);
        setParticipantCount(contestData.current_participants || 0);

        // Check if user has joined
        if (authUser) {
          const { data: entryData } = await supabase
            .from('contest_entries')
            .select('id')
            .eq('contest_id', contestData.id)
            .eq('user_id', authUser.id)
            .maybeSingle();

          setHasJoined(!!entryData);
        }
      } else {
        // Strict zero-state: never keep stale UI when there is no real active contest.
        setActiveContestId(null);
        setPrizePool(0);
        setParticipantCount(0);
        setHasJoined(false);
      }
    } catch (err) {
      console.error('Error fetching contest:', err);
    }
  }, [authUser]);

  useEffect(() => {
    fetchContestData();
  }, [fetchContestData]);

  const handleJoinContest = () => {
    if (!authUser) {
      showError(language === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
      return;
    }

    // Must have a real contest for today
    if (!activeContestId) {
      showError(language === 'ar' ? 'لا توجد مسابقة لليوم' : 'No contest for today');
      return;
    }

    // Join eligibility is time-based only (10:00–18:00 KSA)
    if (!timing.canJoin) {
      showError(
        language === 'ar'
          ? 'تم إغلاق باب الانضمام'
          : 'Registration is closed'
      );
      return;
    }

    setJoinDialogOpen(true);
  };

  const confirmJoin = async () => {
    if (!authUser || !activeContestId) {
      showError(language === 'ar' ? 'لا توجد مسابقة لليوم' : 'No contest for today');
      return;
    }

    if (!timing.canJoin) {
      showError(language === 'ar' ? 'تم إغلاق باب الانضمام' : 'Registration is closed');
      setJoinDialogOpen(false);
      return;
    }

    if (user.novaBalance < entryFee) {
      showError(language === 'ar' ? 'رصيد غير كافي' : 'Insufficient balance');
      return;
    }

    setIsJoining(true);

    try {
      const { data, error } = await supabase.rpc('join_contest', {
        p_user_id: authUser.id,
        p_contest_id: activeContestId,
        p_entry_fee: entryFee,
      });

      if (error) {
        console.error('Join contest error:', error);
        showError(error.message);
        return;
      }

      const result = data as { success: boolean; error?: string };

      if (!result.success) {
        const normalizedError = (() => {
          if (!result.error) return undefined;
          if (language !== 'ar') return result.error;
          if (result.error === 'Joining is closed') return 'تم إغلاق باب الانضمام';
          if (result.error === 'No contest for today') return 'لا توجد مسابقة لليوم';
          if (result.error === 'Already joined this contest') return 'أنت منضم بالفعل لهذه المسابقة';
          if (result.error === 'Insufficient Nova balance') return 'رصيد Nova غير كافي';
          return result.error;
        })();

        showError(normalizedError || (language === 'ar' ? 'فشل الانضمام' : 'Failed to join'));
        return;
      }

      setHasJoined(true);
      setJoinDialogOpen(false);
      showSuccess(language === 'ar' ? '🎉 تم الانضمام للمسابقة بنجاح!' : '🎉 Successfully joined the contest!');
      
      // Navigate to contests page
      navigate('/contests');
    } catch (err) {
      console.error('Join error:', err);
      showError(language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <AppLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-4 py-3 space-y-4"
      >
        {/* Active Users Badge - Compact inline bar */}
        <motion.div variants={itemVariants} className="flex justify-center">
          <ActiveUsersCard />
        </motion.div>

        {/* 1️⃣ Welcome Message */}
        <motion.div variants={itemVariants} className="text-center px-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {language === 'ar' 
              ? 'أهلاً بك في WINOVA 👋\n\nاليوم فرصتك تربح، تصوّت، وتزيد ترتيبك.'
              : 'Welcome to WINOVA 👋\n\nToday is your chance to win, vote, and boost your rank.'}
          </p>
        </motion.div>

        {/* Wallet Card - Matching Wallet page design */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border border-border bg-card shadow-sm">
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Nova Balance - Gold accent */}
                <div className="space-y-1">
                  <div className="bg-nova/5 border border-nova/20 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-nova text-lg font-bold">И</span>
                      <span className="text-foreground/70 text-xs font-medium">Nova</span>
                    </div>
                    <p className="text-foreground text-2xl font-bold">
                      {formatBalance(user.novaBalance)}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      ≈ {pricing.symbol} {formatBalance(novaLocalValue)}
                    </p>
                  </div>
                  {/* 3️⃣ Nova Explanation */}
                  <p className="text-[10px] text-muted-foreground leading-snug px-1">
                    <span>💰</span>{' '}
                    {language === 'ar' 
                      ? 'Nova = أرباحك. حوّلها لأي مستخدم من محفظتي.'
                      : 'Nova = your earnings. Transfer to anyone from My Wallet.'}
                  </p>
                </div>

                {/* Aura Balance - Purple accent, no local currency */}
                <div className="space-y-1">
                  <div className="bg-aura/5 border border-aura/20 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-aura text-lg font-bold">✦</span>
                      <span className="text-foreground/70 text-xs font-medium">Aura</span>
                    </div>
                    <p className="text-foreground text-2xl font-bold">
                      {formatBalance(user.auraBalance)}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {language === 'ar' ? 'نقاط تصويت' : 'Voting Points'}
                    </p>
                  </div>
                  {/* 2️⃣ Aura Explanation */}
                  <p className="text-[10px] text-muted-foreground leading-snug px-1">
                    <span>✨</span>{' '}
                    {language === 'ar' 
                      ? 'Aura = نقاط التصويت. استخدمها لرفع ترتيبك.'
                      : 'Aura = voting points. Use them to boost your rank.'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions - Wallet & P2P - Directly below balance */}
        <motion.div variants={itemVariants} className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-11 flex items-center justify-center gap-2 bg-card hover:bg-muted/50 border-border/50">
              <Link to="/wallet">
                <Wallet className="h-4 w-4 text-nova" />
                <span className="text-sm font-medium">{language === 'ar' ? 'محفظتي' : 'My Wallet'}</span>
              </Link>
            </Button>
            <div className="flex flex-col gap-1.5">
              <Button asChild variant="outline" className="h-11 flex items-center justify-center gap-2 bg-card hover:bg-muted/50 border-border/50">
                <Link to="/p2p">
                  <span className="text-base">🤝</span>
                  <span className="text-sm font-medium">{language === 'ar' ? 'تحويل فوري P2P' : 'P2P Transfer'}</span>
                </Link>
              </Button>
              {/* P2P Active Order Status - Informational, teal color */}
              {hasActiveP2POrder && (
                <Link to="/p2p" className="block">
                  <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-primary/10 border border-primary/30 rounded-lg text-primary">
                    <span className="text-[11px] font-medium">
                      {language === 'ar' ? '⏳ صفقة P2P قيد التنفيذ' : '⏳ P2P order in progress'}
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </div>
          {/* 4️⃣ Transfer Clarification */}
          <p className="text-[10px] text-muted-foreground text-center leading-snug">
            <span>🔁</span>{' '}
            {language === 'ar' 
              ? 'يمكنك تحويل Nova فورًا لأي شخص داخل التطبيق — التحويل يتم مباشرة وبأمان.'
              : 'Transfer Nova instantly to anyone in the app — safe and direct.'}
          </p>
        </motion.div>

        {/* Daily Contest Card - Most prominent */}
        <motion.div variants={itemVariants}>
          <ContestJoinCard
            prizePool={prizePool}
            participants={participantCount}
            stage={timing.currentStage === 'final' ? 'final' : 'stage1'}
            closesAt={timing.joinCloseAt}
            endsAt={timing.finalEnd}
            entryFee={entryFee}
            hasJoined={hasJoined}
            onJoin={handleJoinContest}
            contestAvailable={!!activeContestId}
          />
        </motion.div>


        {/* Top Winners - Highest Nova Prize Earners */}
        <motion.div variants={itemVariants}>
          <TopWinnersCard limit={5} />
        </motion.div>

        {/* Lucky Leaders - متصدري المحظوظين */}
        <motion.div variants={itemVariants}>
          <LuckyLeadersCard limit={5} />
        </motion.div>
      </motion.div>

      {/* Join Contest Dialog - Simplified Single Payment */}
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
            {/* Combined Balance Box */}
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
              <p className="text-xl font-bold text-primary">И 10</p>
            </div>
            
            {/* Single Payment Button */}
            <Button 
              className="w-full h-12 bg-gradient-primary text-primary-foreground font-bold text-base"
              onClick={confirmJoin}
              disabled={isJoining || user.novaBalance < entryFee}
            >
              {isJoining ? (
                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                language === 'ar' ? 'ادفع الآن' : 'Pay Now'
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              {language === 'ar' 
                ? 'الخصم يتم من رصيد Nova فقط'
                : 'Deducted from Nova balance only'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

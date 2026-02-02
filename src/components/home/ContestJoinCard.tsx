import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Users, ArrowRight, Gift, Calendar, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useNovaPricing } from '@/hooks/useNovaPricing';
import { Link } from 'react-router-dom';
import { getKsaJoinWindow } from '@/lib/ksaTime';

interface ContestJoinCardProps {
  prizePool: number;
  participants: number;
  stage: 'stage1' | 'final';
  closesAt: Date;
  endsAt: Date;
  entryFee: number;
  hasJoined: boolean;
  userRank?: number;
  onJoin: () => void;
  contestAvailable?: boolean;
}

// Helper to get day name
function getDayName(date: Date, language: string): string {
  const days = {
    ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  };
  return language === 'ar' ? days.ar[date.getDay()] : days.en[date.getDay()];
}

// Format date as DD/MM/YYYY
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function ContestJoinCard({
  prizePool,
  participants,
  stage,
  closesAt,
  endsAt,
  entryFee,
  hasJoined,
  userRank,
  onJoin,
  contestAvailable = true,
}: ContestJoinCardProps) {
  const { language } = useLanguage();
  const { user } = useUser();
  const { getCurrencyInfo } = useNovaPricing();
  const pricing = getCurrencyInfo(user.country);
  
  // Calculate total balance in Nova equivalent (1 Nova = 2 Aura)
  const totalNovaEquivalent = user.novaBalance + (user.auraBalance / 2);
  
  const [joinWindowMessage, setJoinWindowMessage] = useState('');
  const [canJoin, setCanJoin] = useState(true);

  // Calculate prize distribution (percentages)
  const prizes = {
    first: Math.floor(prizePool * 0.50),
    second: Math.floor(prizePool * 0.20),
    third: Math.floor(prizePool * 0.15),
    fourth: Math.floor(prizePool * 0.10),
    fifth: Math.floor(prizePool * 0.05),
  };

  // Dynamic join window messaging - based on KSA time (10:00-18:00)
  useEffect(() => {
    const updateJoinWindow = () => {
      // Case 1: No contest record for today
      if (!contestAvailable) {
        setCanJoin(false);
        setJoinWindowMessage(language === 'ar' ? 'لا توجد مسابقة لليوم' : 'No contest for today');
        return;
      }

      // Case 2: Contest exists - check time window (KSA wall-clock, second-precise)
      const joinWindow = getKsaJoinWindow();

      // Before 10:00 KSA - not open yet
      if (joinWindow.nowWallClockMs < joinWindow.joinOpenWallClockMs) {
        setCanJoin(false);
        setJoinWindowMessage(language === 'ar' ? 'التسجيل يفتح الساعة 10:00 صباحاً' : 'Registration opens at 10:00 AM');
        return;
      }
      
      // After 18:00 KSA - closed for the day
      if (joinWindow.nowWallClockMs >= joinWindow.joinCloseWallClockMs) {
        setCanJoin(false);
        setJoinWindowMessage(language === 'ar' ? 'تم إغلاق باب الانضمام' : 'Registration is closed');
        return;
      }
      
      // Between 10:00 and 18:00 KSA - open for joining
      const minutesUntilClose = Math.max(0, Math.floor(joinWindow.msUntilClose / 60000));
      
      if (minutesUntilClose <= 30) {
        setCanJoin(true);
        setJoinWindowMessage(language === 'ar' ? '⚠️ باب الانضمام يغلق قريبًا!' : '⚠️ Joining closes soon!');
      } else if (minutesUntilClose <= 60) {
        setCanJoin(true);
        setJoinWindowMessage(language === 'ar' ? `⏳ باب الانضمام يغلق خلال ${minutesUntilClose} دقيقة` : `⏳ Joining closes in ${minutesUntilClose} min`);
      } else {
        setCanJoin(true);
        setJoinWindowMessage(language === 'ar' ? '⏳ باب الانضمام مفتوح' : '⏳ Joining is open');
      }
    };

    updateJoinWindow();
    const interval = setInterval(updateJoinWindow, 1000);
    return () => clearInterval(interval);
  }, [language, contestAvailable]);

  // Calculate stage 1 end and final stage times
  const now = new Date();
  const stage1EndsAt = new Date(closesAt);
  stage1EndsAt.setHours(22, 0, 0, 0); // Stage 1 ends at 10 PM
  
  const finalStartsAt = new Date(stage1EndsAt);
  const finalEndsAt = new Date(stage1EndsAt);
  finalEndsAt.setHours(23, 59, 59, 0); // Final ends at midnight

  return (
    <Card className="overflow-hidden border border-border shadow-sm">
      {/* Header with Title and Date */}
      <div className="bg-card p-4 border-b border-border">
        <div className="relative z-10">
          {/* Title with Date */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="text-foreground font-bold text-lg">
              {language === 'ar' 
                ? `المسابقة اليومية – ${getDayName(now, language)} ${formatDate(now)}`
                : `Daily Contest – ${getDayName(now, language)} ${formatDate(now)}`}
            </span>
          </div>

          {/* Prize Pool - Dynamic */}
          <div className="text-center p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4">
            <p className="text-muted-foreground text-xs mb-1">
              {language === 'ar' ? '💰 مجموع الجوائز' : '💰 Prize Pool'}
            </p>
            <p className="text-foreground text-3xl font-bold text-primary">
              И {prizePool} Nova
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              ≈ {pricing.symbol} {(prizePool * pricing.novaRate).toFixed(0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">
              {language === 'ar' 
                ? 'كلما زاد عدد المشتركين، زاد مجموع الجوائز تلقائيًا'
                : 'The more participants, the bigger the prize pool'}
            </p>
          </div>

          {/* Participants & Entry Fee */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <Users className="h-3 w-3" />
                <span>{language === 'ar' ? 'المشتركين' : 'Participants'}</span>
              </div>
              <p className="text-foreground font-bold">{participants}</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">
                {language === 'ar' ? 'رسوم الاشتراك' : 'Entry Fee'}
              </p>
              <p className="text-foreground font-bold">И {entryFee} Nova</p>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Prize Distribution */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
            <Award className="h-4 w-4 text-primary" />
            {language === 'ar' ? '🏅 توزيع الجوائز' : '🏅 Prize Distribution'}
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span>🥇 {language === 'ar' ? 'المركز الأول' : '1st Place'} (50%)</span>
              <span className="font-bold text-primary">И {prizes.first}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>🥈 {language === 'ar' ? 'المركز الثاني' : '2nd Place'} (20%)</span>
              <span className="font-bold text-primary">И {prizes.second}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>🥉 {language === 'ar' ? 'المركز الثالث' : '3rd Place'} (15%)</span>
              <span className="font-bold text-primary">И {prizes.third}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>🏅 {language === 'ar' ? 'المركز الرابع' : '4th Place'} (10%)</span>
              <span className="font-bold text-primary">И {prizes.fourth}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>🏅 {language === 'ar' ? 'المركز الخامس' : '5th Place'} (5%)</span>
              <span className="font-bold text-primary">И {prizes.fifth}</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {language === 'ar' 
              ? '⚠️ قيمة كل جائزة تتغير تلقائيًا حسب عدد المشتركين'
              : '⚠️ Prize values change automatically based on participants'}
          </p>
        </div>

        {/* Contest Stages Timeline */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1">
            <Clock className="h-4 w-4 text-warning" />
            {language === 'ar' ? '⏱️ مراحل المسابقة' : '⏱️ Contest Stages'}
          </p>
          
          {/* Stage 1 */}
          <div className={`p-2 rounded-lg mb-2 ${stage === 'stage1' ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">
                {language === 'ar' ? 'المرحلة الأولى' : 'Stage 1'}
              </span>
              {stage === 'stage1' && (
                <span className="text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full">
                  {language === 'ar' ? 'الآن' : 'Now'}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mb-1">
              🎯 {language === 'ar' ? 'يتأهل أعلى 50 متسابق حسب عدد الأصوات' : 'Top 50 contestants qualify by votes'}
            </p>
            {stage === 'stage1' && (
              <div className="mt-2">
                <p className="text-[10px] text-muted-foreground mb-1">
                  {language === 'ar' ? 'تنتهي بعد:' : 'Ends in:'}
                </p>
                <CountdownTimer targetDate={endsAt} size="sm" showLabels hideDays />
              </div>
            )}
          </div>

          {/* Final Stage */}
          <div className={`p-2 rounded-lg ${stage === 'final' ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">
                {language === 'ar' ? 'المرحلة النهائية' : 'Final Stage'}
              </span>
              {stage === 'final' && (
                <span className="text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full">
                  {language === 'ar' ? 'الآن' : 'Now'}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mb-1">
              🏆 {language === 'ar' ? 'يتم تحديد الفائزين الخمسة الأوائل' : 'Top 5 winners are determined'}
            </p>
            {stage === 'final' && (
              <div className="mt-2">
                <p className="text-[10px] text-muted-foreground mb-1">
                  {language === 'ar' ? 'تنتهي بعد:' : 'Ends in:'}
                </p>
                <CountdownTimer targetDate={endsAt} size="sm" showLabels hideDays />
              </div>
            )}
          </div>
        </div>


        {/* User Rank (only if joined) */}
        {hasJoined && userRank && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              {stage === 'final' 
                ? (language === 'ar' ? 'ترتيبك اليوم (نهائي):' : 'Your Rank Today (Final):')
                : (language === 'ar' ? 'ترتيبك اليوم:' : 'Your Rank Today:')}
            </p>
            <p className="text-2xl font-bold text-primary">#{userRank}</p>
          </div>
        )}

        {/* Join Status */}
        {!hasJoined ? (
          <>
            {canJoin ? (
              <>
                <motion.div
                  animate={{ scale: [1, 1.01, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="p-3 bg-gradient-to-r from-primary/15 to-primary/10 border border-primary/30 rounded-lg text-center"
                >
                  <p className="text-sm text-primary font-semibold mb-0.5">
                    {joinWindowMessage}
                  </p>
                </motion.div>

                <Button 
                  className="w-full h-12 text-base font-bold"
                  onClick={onJoin}
                  disabled={totalNovaEquivalent < entryFee}
                >
                  {language === 'ar' ? '🔴 انضم الآن' : '🔴 Join Now'}
                  <ArrowRight className="h-4 w-4 ms-2" />
                </Button>
              </>
            ) : (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
                <p className="text-sm font-medium text-destructive">
                  {joinWindowMessage}
                </p>
              </div>
            )}
          </>
        ) : (
          <Button asChild className="w-full" variant="outline">
            <Link to="/contests">
              {language === 'ar' ? 'شاهد المسابقة' : 'View Contest'}
              <ArrowRight className="h-4 w-4 ms-2" />
            </Link>
          </Button>
        )}

      </CardContent>
    </Card>
  );
}

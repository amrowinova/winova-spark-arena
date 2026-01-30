import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Users, ArrowRight, Gift, Calendar, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { getPricing } from '@/contexts/TransactionContext';
import { Link } from 'react-router-dom';

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
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day} / ${month} / ${year}`;
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
}: ContestJoinCardProps) {
  const { language } = useLanguage();
  const { user } = useUser();
  const pricing = getPricing(user.country);
  
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

  // Dynamic join window messaging
  useEffect(() => {
    const updateJoinWindow = () => {
      const now = new Date();
      const diff = closesAt.getTime() - now.getTime();
      const minutesLeft = Math.max(0, Math.floor(diff / 60000));
      
      if (diff <= 0) {
        setCanJoin(false);
        setJoinWindowMessage(language === 'ar' ? 'باب الانضمام مغلق' : 'Joining closed');
      } else if (minutesLeft <= 30) {
        setCanJoin(true);
        setJoinWindowMessage(language === 'ar' ? 'باب الانضمام يغلق قريبًا' : 'Joining closes soon');
      } else if (minutesLeft <= 60) {
        setCanJoin(true);
        setJoinWindowMessage(language === 'ar' ? `⏳ باب الانضمام يغلق خلال ${minutesLeft} دقيقة` : `⏳ Joining closes in ${minutesLeft} minutes`);
      } else {
        setCanJoin(true);
        setJoinWindowMessage(language === 'ar' ? '⏳ باب الانضمام مفتوح' : '⏳ Joining is open');
      }
    };

    updateJoinWindow();
    const interval = setInterval(updateJoinWindow, 1000);
    return () => clearInterval(interval);
  }, [closesAt, language]);

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
          {/* Title */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="text-foreground font-bold text-lg">
              {language === 'ar' 
                ? `المسابقة اليومية – يوم ${getDayName(now, language)}`
                : `Daily Contest – ${getDayName(now, language)}`}
            </span>
          </div>
          
          {/* Date */}
          <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-4">
            <Calendar className="h-4 w-4" />
            <span>📅 {formatDate(now)}</span>
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
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="p-2 bg-warning/10 rounded-lg text-center"
                >
                  <p className="text-xs text-warning font-medium">
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
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
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

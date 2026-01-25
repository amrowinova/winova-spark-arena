import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Users, UserPlus, Copy, Share2, ChevronRight, Target, Star, Crown, CheckCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RankBadge } from '@/components/common/RankBadge';
import { ProgressRing } from '@/components/common/ProgressRing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser, UserRank } from '@/contexts/UserContext';
import { toast } from 'sonner';

// Promotion requirements
const promotionRequirements: Record<UserRank, { nextRank: UserRank | null; directRequired: number; description: string }> = {
  subscriber: { nextRank: 'marketer', directRequired: 3, description: 'Bring 3 active subscribers' },
  marketer: { nextRank: 'leader', directRequired: 10, description: 'Bring 10 direct marketers' },
  leader: { nextRank: 'manager', directRequired: 10, description: 'Bring 10 direct leaders' },
  manager: { nextRank: 'president', directRequired: 10, description: '10+ managers + highest spotlight points' },
  president: { nextRank: null, directRequired: 0, description: 'Top rank achieved!' },
};

// Mock team members
const teamMembers = [
  { id: 1, name: 'Sara A.', rank: 'marketer' as UserRank, active: true, avatar: '👩' },
  { id: 2, name: 'Mohammed K.', rank: 'subscriber' as UserRank, active: true, avatar: '👨' },
  { id: 3, name: 'Layla H.', rank: 'subscriber' as UserRank, active: false, avatar: '👩' },
  { id: 4, name: 'Omar B.', rank: 'marketer' as UserRank, active: true, avatar: '👨' },
  { id: 5, name: 'Nora M.', rank: 'subscriber' as UserRank, active: true, avatar: '👩' },
];

export default function TeamPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  const currentPromotion = promotionRequirements[user.rank];
  const activeDirectMembers = teamMembers.filter(m => m.active).length;
  const promotionProgress = currentPromotion.nextRank 
    ? Math.min(100, (activeDirectMembers / currentPromotion.directRequired) * 100)
    : 100;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    toast.success(t('team.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join WINOVA',
        text: `Join me on WINOVA! Use my referral code: ${user.referralCode}`,
        url: 'https://winova.app',
      });
    } else {
      handleCopyCode();
    }
  };

  return (
    <AppLayout title={t('team.title')}>
      <div className="px-4 py-4 space-y-5">
        {/* Team Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-dark p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-secondary-foreground" />
                  <h1 className="text-secondary-foreground text-lg font-bold">
                    {t('team.title')}
                  </h1>
                </div>
                <RankBadge rank={user.rank} size="sm" />
              </div>

              {/* Team Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-card/10 rounded-lg p-3">
                  <p className="text-secondary-foreground text-2xl font-bold">{user.teamSize}</p>
                  <p className="text-secondary-foreground/60 text-xs">{t('team.totalMembers')}</p>
                </div>
                <div className="bg-card/10 rounded-lg p-3">
                  <p className="text-secondary-foreground text-2xl font-bold">{user.directTeam}</p>
                  <p className="text-secondary-foreground/60 text-xs">{t('team.directTeam')}</p>
                </div>
                <div className="bg-card/10 rounded-lg p-3">
                  <p className="text-secondary-foreground text-2xl font-bold">{user.indirectTeam}</p>
                  <p className="text-secondary-foreground/60 text-xs">{t('team.indirectTeam')}</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Activity Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          <Card className="p-4 text-center">
            <ProgressRing progress={user.activityPercentage} size={70} strokeWidth={5}>
              <span className="text-lg font-bold">{user.activityPercentage}%</span>
            </ProgressRing>
            <p className="text-sm text-muted-foreground mt-2">{t('team.myActivity')}</p>
            <p className="text-xs text-muted-foreground">
              {user.activeWeeks}/{user.totalWeeks} weeks
            </p>
          </Card>
          
          <Card className="p-4 text-center">
            <ProgressRing progress={user.teamActivityPercentage} size={70} strokeWidth={5}>
              <span className="text-lg font-bold">{user.teamActivityPercentage}%</span>
            </ProgressRing>
            <p className="text-sm text-muted-foreground mt-2">{t('team.teamActivity')}</p>
            <p className="text-xs text-muted-foreground">
              {activeDirectMembers}/{teamMembers.length} active
            </p>
          </Card>
        </motion.div>

        {/* Promotion Progress */}
        {currentPromotion.nextRank && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  {t('team.promotionProgress')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <RankBadge rank={user.rank} size="sm" />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <RankBadge rank={currentPromotion.nextRank} size="sm" />
                </div>
                
                <Progress value={promotionProgress} className="h-3 mb-2" />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{activeDirectMembers} / {currentPromotion.directRequired} {t('team.directRequired')}</span>
                  <span>{Math.round(promotionProgress)}%</span>
                </div>
                
                <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded-lg">
                  {currentPromotion.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Referral Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-2">{t('team.inviteCode')}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-muted rounded-lg font-mono text-center font-bold tracking-wider">
                {user.referralCode}
              </div>
              <Button size="icon" variant="outline" onClick={handleCopyCode}>
                {copied ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Team Members */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">{t('team.directTeam')}</TabsTrigger>
            <TabsTrigger value="indirect">{t('team.indirectTeam')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-3">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                      {member.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{member.name}</p>
                      <RankBadge rank={member.rank} size="sm" />
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      member.active 
                        ? 'bg-success/20 text-success' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {member.active ? t('home.active') : 'Inactive'}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="indirect" className="mt-4">
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">{user.indirectTeam} indirect team members</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

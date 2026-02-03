import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { UserIdentityCard } from '@/components/team/UserIdentityCard';
import { ActivityCard } from '@/components/team/ActivityCard';
import { PromotionCard } from '@/components/team/PromotionCard';
import { WarningCard } from '@/components/team/WarningCard';
import { ReferralCodeCard } from '@/components/team/ReferralCodeCard';
import { TeamRankingCard } from '@/components/team/TeamRankingCard';
import { TeamLevelBreakdown } from '@/components/team/TeamLevelBreakdown';
import { DirectLeaderCard } from '@/components/team/DirectLeaderCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeamHierarchy } from '@/hooks/useTeamHierarchy';
import { useTeamStats } from '@/hooks/useTeamStats';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, ChevronRight, Loader2, UserCheck, UserX } from 'lucide-react';

type ViewLevel = 'overview' | 'direct' | 'indirect';

function TeamContent() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [viewLevel, setViewLevel] = useState<ViewLevel>('overview');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch real team data from database
  const {
    directMembers,
    getIndirectByParent,
    loading: hierarchyLoading
  } = useTeamHierarchy(5);

  const { 
    directCount, 
    indirectCount, 
    activeDirectCount,
    loading: statsLoading 
  } = useTeamStats();

  const loading = hierarchyLoading || statsLoading;
  const inactiveCount = directCount - activeDirectCount;

  const handleViewDirect = () => {
    setViewLevel('direct');
  };

  const handleViewIndirect = (memberId: string) => {
    setSelectedMemberId(memberId);
    setViewLevel('indirect');
  };

  const handleBack = () => {
    if (viewLevel === 'indirect') {
      setViewLevel('direct');
      setSelectedMemberId(null);
    } else {
      setViewLevel('overview');
    }
  };

  // Team Member Card Component
  const TeamMemberCard = ({ member, onViewTeam }: { member: any; onViewTeam?: () => void }) => (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.avatar_url || ''} />
          <AvatarFallback className="bg-muted">
            {member.name?.charAt(0) || '👤'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{member.name}</p>
            {member.weekly_active ? (
              <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
                <UserCheck className="h-3 w-3 mr-0.5" />
                {isRTL ? 'نشط' : 'Active'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                <UserX className="h-3 w-3 mr-0.5" />
                {isRTL ? 'غير نشط' : 'Inactive'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">@{member.username}</p>
          <p className="text-xs text-muted-foreground">
            {isRTL ? 'الرتبة:' : 'Rank:'} {member.rank} | {isRTL ? 'أسابيع نشطة:' : 'Active weeks:'} {member.active_weeks}/14
          </p>
        </div>

        {member.direct_count > 0 && onViewTeam && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onViewTeam}
            className="gap-1"
          >
            <Users className="h-4 w-4" />
            <span className="text-xs">{member.direct_count}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );

  // Level 3: Indirect Team View
  if (viewLevel === 'indirect' && selectedMemberId) {
    const selectedMember = directMembers.find(m => m.member_id === selectedMemberId);
    const memberTeam = getIndirectByParent(selectedMemberId);
    
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader 
          title={isRTL ? `فريق ${selectedMember?.name || ''}` : `${selectedMember?.name || ''}'s Team`}
          onBack={handleBack}
        />
        <main className="flex-1 px-4 py-4 space-y-3">
          {memberTeam.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <h2 className="text-lg font-bold mb-2">
                {isRTL ? 'لا يوجد أعضاء غير مباشرين' : 'No Indirect Members'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'هذا العضو لم يقم بدعوة أحد بعد' : 'This member hasn\'t invited anyone yet'}
              </p>
            </div>
          ) : (
            memberTeam.map((member) => (
              <motion.div
                key={member.member_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <TeamMemberCard member={member} />
              </motion.div>
            ))
          )}
        </main>
      </div>
    );
  }

  // Level 2: Direct Team View
  if (viewLevel === 'direct') {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader 
          title={isRTL ? 'الفريق المباشر' : 'Direct Team'}
          onBack={handleBack}
        />
        <main className="flex-1 px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : directMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <h2 className="text-lg font-bold mb-2">
                {isRTL ? 'لا يوجد أعضاء بعد' : 'No Team Members Yet'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'شارك كود الدعوة الخاص بك لبناء فريقك!' : 'Share your referral code to build your team!'}
              </p>
            </div>
          ) : (
            directMembers.map((member) => (
              <motion.div
                key={member.member_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <TeamMemberCard 
                  member={member} 
                  onViewTeam={member.direct_count > 0 ? () => handleViewIndirect(member.member_id) : undefined}
                />
              </motion.div>
            ))
          )}
        </main>
      </div>
    );
  }

  // Level 1: Overview with Tabs
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={t('team.title')} />
      <main className="flex-1 px-4 py-4 pb-20">
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="overview" className="text-xs">
              {isRTL ? 'نظرة عامة' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="direct" className="text-xs">
              {isRTL ? 'المباشر' : 'Direct'}
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs">
              {isRTL ? 'الإحصائيات' : 'Stats'}
            </TabsTrigger>
            <TabsTrigger value="referral" className="text-xs">
              {isRTL ? 'الإحالة' : 'Referral'}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            {/* My Direct Leader Card - NEW */}
            <DirectLeaderCard />
            
            {/* User Identity Card */}
            <UserIdentityCard />

            {/* Team Size Card - Real Data */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {isRTL ? 'حجم الفريق' : 'Team Size'}
              </h3>
              
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Card 
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={handleViewDirect}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-primary">{directCount}</p>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? 'مباشر' : 'Direct'}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>

                  <Card className="p-3">
                    <p className="text-2xl font-bold text-muted-foreground">{indirectCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'غير مباشر' : 'Indirect'}
                    </p>
                  </Card>
                </div>
              )}

              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{isRTL ? 'إجمالي الفريق' : 'Total Team'}</span>
                  <span className="font-bold">{directCount + indirectCount}</span>
                </div>
              </div>
            </Card>

            {/* Activity Card - Real DB data */}
            <ActivityCard />

            {/* Promotion Card - Real DB data */}
            <PromotionCard />

            {/* Warning Card */}
            <WarningCard inactiveCount={inactiveCount} directTeamCount={directCount} />
          </TabsContent>

          {/* Direct Team Tab */}
          <TabsContent value="direct" className="space-y-3 mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : directMembers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <h2 className="text-lg font-bold mb-2">
                  {isRTL ? 'لا يوجد أعضاء بعد' : 'No Team Members Yet'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'شارك كود الدعوة الخاص بك لبناء فريقك!' : 'Share your referral code to build your team!'}
                </p>
              </div>
            ) : (
              directMembers.map((member) => (
                <motion.div
                  key={member.member_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <TeamMemberCard 
                    member={member} 
                    onViewTeam={member.direct_count > 0 ? () => handleViewIndirect(member.member_id) : undefined}
                  />
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4 mt-0">
            {/* Ranking Card */}
            <TeamRankingCard />
            
            {/* Level Breakdown */}
            <TeamLevelBreakdown />
            
            {/* Activity Card */}
            <ActivityCard />
          </TabsContent>

          {/* Referral Tab */}
          <TabsContent value="referral" className="space-y-4 mt-0">
            {/* Referral Code Card with Stats */}
            <ReferralCodeCard />
            
            {/* How it works */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">
                {isRTL ? 'كيف تعمل الإحالة؟' : 'How Referral Works?'}
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isRTL ? 'شارك كودك' : 'Share Your Code'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'أرسل كود الإحالة لأصدقائك' : 'Send your referral code to friends'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isRTL ? 'ينضمون إلى WINOVA' : 'They Join WINOVA'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'يستخدمون كودك عند التسجيل' : 'They use your code when signing up'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center text-xs font-bold text-success shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isRTL ? 'تكسب نقاط ومكافآت' : 'Earn Points & Rewards'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'كلما كان فريقك نشيطاً، زادت مكافآتك' : 'The more active your team, the more you earn'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
}

export default function TeamPage() {
  return <TeamContent />;
}

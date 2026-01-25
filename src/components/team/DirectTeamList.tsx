import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, ArrowLeft, Copy, Share2, CheckCircle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TeamMemberCard, TeamMember } from './TeamMemberCard';
import { MemberDetailPanel } from './MemberDetailPanel';
import { QuickActionsCard } from './QuickActionsCard';
import { TeamFilters, TeamFilter } from './TeamFilters';
import { ReminderTemplatesDialog } from './ReminderTemplatesDialog';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface DirectTeamListProps {
  members: TeamMember[];
  onBack: () => void;
  onViewMemberTeam: (member: TeamMember) => void;
}

export function DirectTeamList({ members, onBack, onViewMemberTeam }: DirectTeamListProps) {
  const { user } = useUser();
  const { language } = useLanguage();
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<TeamFilter>('needs-attention');
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<'inactive' | 'at-risk' | 'all'>('inactive');

  // Calculate filter counts with new categories
  const filterCounts = useMemo(() => {
    const needsAttention = members.filter(m => !m.active).length;
    const atRisk = members.filter(m => {
      const activity = (m.activeWeeks / m.totalWeeks) * 100;
      return m.active && activity < 50;
    }).length;
    const active = members.filter(m => m.active).length;
    const hasTeam = members.filter(m => m.teamSize > 0).length;
    
    return { needsAttention, atRisk, active, hasTeam };
  }, [members]);

  // Filter members based on selected filter
  const filteredMembers = useMemo(() => {
    switch (filter) {
      case 'needs-attention':
        return members.filter(m => !m.active);
      case 'at-risk':
        return members.filter(m => {
          const activity = (m.activeWeeks / m.totalWeeks) * 100;
          return m.active && activity < 50;
        });
      case 'active':
        return members.filter(m => m.active);
      case 'has-team':
        return members.filter(m => m.teamSize > 0);
      default:
        return members;
    }
  }, [members, filter]);

  const activeCount = members.filter(m => m.active).length;

  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
    setPanelOpen(true);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    toast.success(language === 'ar' ? 'تم النسخ!' : 'Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join WINOVA',
        text: language === 'ar' 
          ? `انضم إلي في WINOVA! استخدم كود الدعوة: ${user.referralCode}`
          : `Join me on WINOVA! Use my referral code: ${user.referralCode}`,
        url: 'https://winova.app',
      });
    } else {
      handleCopyCode();
    }
  };

  const handleTakeAction = () => {
    // Switch to needs-attention filter
    setFilter('needs-attention');
  };

  const handleRemindInactive = () => {
    setReminderTarget('inactive');
    setReminderDialogOpen(true);
  };

  const handleRemindAtRisk = () => {
    setReminderTarget('at-risk');
    setReminderDialogOpen(true);
  };

  const inactiveCount = members.filter(m => !m.active).length;
  const atRiskCount = members.filter(m => {
    const activity = (m.activeWeeks / m.totalWeeks) * 100;
    return m.active && activity < 50;
  }).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-bold text-lg">
            {language === 'ar' ? 'الفريق المباشر' : 'Direct Team'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeCount}/{members.length} {language === 'ar' ? 'نشط' : 'active'}
          </p>
        </div>
      </div>

      {/* Quick Actions Card */}
      <QuickActionsCard members={members} onTakeAction={handleTakeAction} />

      {/* Smart Reminder Buttons */}
      {(inactiveCount > 0 || atRiskCount > 0) && (
        <div className="flex gap-2">
          {inactiveCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={handleRemindInactive}
            >
              <Bell className="h-3.5 w-3.5 me-1" />
              {language === 'ar' ? `تذكير ${inactiveCount} غير نشط` : `Remind ${inactiveCount} Inactive`}
            </Button>
          )}
          {atRiskCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs border-warning/30 text-warning hover:bg-warning/10"
              onClick={handleRemindAtRisk}
            >
              <Bell className="h-3.5 w-3.5 me-1" />
              {language === 'ar' ? `تذكير ${atRiskCount} معرض` : `Remind ${atRiskCount} At Risk`}
            </Button>
          )}
        </div>
      )}

      {/* Referral Code */}
      <Card className="p-3">
        <p className="text-xs text-muted-foreground mb-2">
          {language === 'ar' ? 'كود الدعوة' : 'Referral Code'}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-muted rounded-lg font-mono text-center font-bold tracking-wider text-sm">
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

      {/* Filter Buttons */}
      <TeamFilters 
        filter={filter} 
        onFilterChange={setFilter} 
        counts={filterCounts}
      />

      {/* Members List */}
      {filteredMembers.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground mb-3">
            {language === 'ar' ? 'لا يوجد أعضاء في هذه الفئة' : 'No members in this category'}
          </p>
          {filter === 'needs-attention' && (
            <p className="text-sm text-success">
              {language === 'ar' ? '🎉 رائع! كل فريقك نشط' : '🎉 Great! Your whole team is active'}
            </p>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member, index) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              index={index}
              onClick={() => handleMemberClick(member)}
              showActions={true}
              showPromotionBadge={true}
              onViewTeam={member.teamSize > 0 ? () => onViewMemberTeam(member) : undefined}
              onRemind={() => {
                setSelectedMember(member);
                setReminderTarget('all');
                setReminderDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Member Detail Panel */}
      <MemberDetailPanel
        member={selectedMember}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onViewTeam={() => {
          setPanelOpen(false);
          if (selectedMember) {
            onViewMemberTeam(selectedMember);
          }
        }}
      />

      {/* Reminder Templates Dialog */}
      <ReminderTemplatesDialog
        open={reminderDialogOpen}
        onClose={() => setReminderDialogOpen(false)}
        targetType={reminderTarget}
        targetCount={
          reminderTarget === 'inactive' 
            ? inactiveCount 
            : reminderTarget === 'at-risk' 
              ? atRiskCount 
              : 1
        }
      />
    </div>
  );
}

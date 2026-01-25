import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, ArrowLeft, Copy, Share2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TeamMemberCard, TeamMember } from './TeamMemberCard';
import { MemberDetailPanel } from './MemberDetailPanel';
import { SmartAlertCard } from './SmartAlertCard';
import { TeamFilters, TeamFilter } from './TeamFilters';
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
  const [filter, setFilter] = useState<TeamFilter>('all');

  // Calculate filter counts
  const filterCounts = useMemo(() => ({
    all: members.length,
    active: members.filter(m => m.active).length,
    inactive: members.filter(m => !m.active).length,
    promotable: members.filter(m => m.rank === 'subscriber' && m.activeWeeks >= 4 && m.directTeam >= 3).length,
  }), [members]);

  // Filter members based on selected filter
  const filteredMembers = useMemo(() => {
    switch (filter) {
      case 'active':
        return members.filter(m => m.active);
      case 'inactive':
        return members.filter(m => !m.active);
      case 'promotable':
        return members.filter(m => m.rank === 'subscriber' && m.activeWeeks >= 4 && m.directTeam >= 3);
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

  const handleRemindAll = () => {
    const inactiveCount = members.filter(m => !m.active).length;
    toast.success(
      language === 'ar' 
        ? `تم إرسال تذكير لـ ${inactiveCount} أعضاء غير نشطين!`
        : `Reminder sent to ${inactiveCount} inactive members!`
    );
  };

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

      {/* Smart Alert Card */}
      <SmartAlertCard members={members} onRemindAll={handleRemindAll} />

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
            {filter === 'all' 
              ? (language === 'ar' ? 'لا يوجد أعضاء في فريقك المباشر' : 'No direct team members yet')
              : (language === 'ar' ? 'لا يوجد أعضاء في هذه الفئة' : 'No members in this category')}
          </p>
          {filter === 'all' && (
            <Button onClick={handleShare}>
              {language === 'ar' ? 'ادعُ أصدقاءك' : 'Invite Friends'}
            </Button>
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
              onViewTeam={member.teamSize > 0 ? () => onViewMemberTeam(member) : undefined}
              onRemind={() => toast.success(language === 'ar' ? 'تم إرسال التذكير!' : 'Reminder sent!')}
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
    </div>
  );
}

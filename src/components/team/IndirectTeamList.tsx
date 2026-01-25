import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TeamMemberCard, TeamMember } from './TeamMemberCard';
import { useLanguage } from '@/contexts/LanguageContext';

interface IndirectTeamListProps {
  parentMember: TeamMember;
  members: TeamMember[];
  onBack: () => void;
}

export function IndirectTeamList({ parentMember, members, onBack }: IndirectTeamListProps) {
  const { language } = useLanguage();

  const activeCount = members.filter(m => m.active).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-bold text-lg">
            {language === 'ar' 
              ? `فريق ${parentMember.nameAr}`
              : `${parentMember.name}'s Team`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeCount}/{members.length} {language === 'ar' ? 'نشط' : 'active'}
          </p>
        </div>
      </div>

      {/* Parent Info */}
      <Card className="p-3 bg-muted/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
            {parentMember.avatar}
          </div>
          <div>
            <p className="font-medium text-sm">
              {language === 'ar' ? parentMember.nameAr : parentMember.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {parentMember.teamSize} {language === 'ar' ? 'عضو' : 'members'}
            </p>
          </div>
        </div>
      </Card>

      {/* Members List */}
      {members.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            {language === 'ar' ? 'لا يوجد أعضاء' : 'No team members'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((member, index) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              index={index}
              showArrow={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

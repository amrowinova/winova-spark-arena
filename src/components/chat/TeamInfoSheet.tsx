import { useState } from 'react';
import { Users, Crown, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RankBadge } from '@/components/common/RankBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import { banner } from '@/contexts/BannerContext';
import type { UserRank } from '@/contexts/UserContext';
import { GroupMemberSheet } from './GroupMemberSheet';

export interface TeamChatMember {
  id: string;
  name: string;
  nameAr: string;
  username: string;
  rank: UserRank;
  active: boolean;
  avatar: string;
  directCount: number;
  activityRanking: number;
  engagementStatus?: 'both' | 'contest' | 'vote' | 'none';
}

interface TeamManager {
  id: string;
  name: string;
  nameAr: string;
  avatar: string;
  rank: UserRank;
  active?: boolean;
  username?: string;
  engagementStatus?: 'both' | 'contest' | 'vote' | 'none';
}

interface TeamInfoSheetProps {
  open: boolean;
  onClose: () => void;
  teamName: string;
  teamNameAr: string;
  manager: TeamManager;
  members: TeamChatMember[];
  onRemindInactive?: () => void;
  onTransferToMember?: (memberId: string) => void;
  onPrivateMessage?: (memberId: string) => void;
}

export function TeamInfoSheet({
  open,
  onClose,
  teamName,
  teamNameAr,
  manager,
  members,
  onRemindInactive,
  onTransferToMember,
  onPrivateMessage,
}: TeamInfoSheetProps) {
  const { language } = useLanguage();
  const [selectedMember, setSelectedMember] = useState<TeamChatMember | null>(null);
  const [memberSheetOpen, setMemberSheetOpen] = useState(false);
  
  // Sort members by activity ranking (lower number = more active)
  const sortedMembers = [...members].sort((a, b) => a.activityRanking - b.activityRanking);
  const inactiveCount = members.filter(m => !m.active).length;

  const handleRemindInactive = () => {
    if (onRemindInactive) {
      onRemindInactive();
    } else {
      banner.success(
        language === 'ar' 
          ? `تم إرسال تذكير إلى ${inactiveCount} عضو` 
          : `Reminder sent to ${inactiveCount} members`
      );
    }
  };

  const handleMemberClick = (member: TeamChatMember) => {
    setSelectedMember(member);
    setMemberSheetOpen(true);
  };

  const handleTransfer = () => {
    if (selectedMember && onTransferToMember) {
      onTransferToMember(selectedMember.id);
    }
  };

  const handlePrivateMessage = () => {
    if (selectedMember && onPrivateMessage) {
      onPrivateMessage(selectedMember.id);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">
                  {language === 'ar' ? teamNameAr : teamName}
                </p>
                <p className="text-sm text-muted-foreground font-normal">
                  {members.length} {language === 'ar' ? 'عضو' : 'members'}
                </p>
              </div>
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(85vh-120px)] mt-4">
            {/* Manager Card */}
            <Card className="mb-4 border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-1 text-xs text-primary mb-2">
                  <Crown className="h-3 w-3" />
                  {language === 'ar' ? 'المسؤول المباشر' : 'Your Direct Manager'}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl relative">
                    {manager.avatar}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card ${
                      manager.active !== false ? 'bg-success' : 'bg-destructive'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">
                      {language === 'ar' ? manager.nameAr : manager.name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <RankBadge rank={manager.rank} size="sm" />
                      <span className={`text-xs ${manager.active !== false ? 'text-success' : 'text-destructive'}`}>
                        {manager.active !== false 
                          ? (language === 'ar' ? 'نشط' : 'Active')
                          : (language === 'ar' ? 'غير نشط' : 'Inactive')
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions for Admin */}
            {inactiveCount > 0 && (
              <Card className="mb-4 bg-warning/10 border-warning/30">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-warning" />
                    <span className="text-sm">
                      {language === 'ar' 
                        ? `${inactiveCount} عضو غير نشط`
                        : `${inactiveCount} inactive members`}
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleRemindInactive}>
                    {language === 'ar' ? 'تذكير' : 'Remind'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Members List - Clickable */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {language === 'ar' ? 'الأعضاء (مرتبين حسب النشاط)' : 'Members (by activity)'}
              </p>
              
              {sortedMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card 
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleMemberClick(member)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      {/* Ranking Badge */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        index < 3 
                          ? 'bg-warning/20 text-warning' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        #{index + 1}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg relative">
                        {member.avatar}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                          member.active ? 'bg-success' : 'bg-destructive'
                        }`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {language === 'ar' ? member.nameAr : member.name}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <RankBadge rank={member.rank} size="sm" />
                          <span className={`text-xs ${member.active ? 'text-success' : 'text-destructive'}`}>
                            {member.active 
                              ? (language === 'ar' ? 'نشط' : 'Active')
                              : (language === 'ar' ? 'غير نشط' : 'Inactive')
                            }
                          </span>
                        </div>
                      </div>

                      {/* Direct Members */}
                      {member.directCount > 0 && (
                        <div className="text-end">
                          <p className="text-sm font-medium">{member.directCount}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {language === 'ar' ? 'مباشر' : 'direct'}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Member Detail Sheet for Group */}
      {selectedMember && (
        <GroupMemberSheet
          open={memberSheetOpen}
          onOpenChange={setMemberSheetOpen}
          member={{
            id: selectedMember.id,
            name: language === 'ar' ? selectedMember.nameAr : selectedMember.name,
            username: selectedMember.username,
            avatar: selectedMember.avatar,
            rank: selectedMember.rank,
            isActive: selectedMember.active,
            engagementStatus: selectedMember.engagementStatus,
          }}
          onTransfer={handleTransfer}
          onPrivateMessage={handlePrivateMessage}
        />
      )}
    </>
  );
}

import { motion } from 'framer-motion';
import { 
  UserPlus, 
  Trophy, 
  Vote, 
  Star, 
  TrendingUp,
  Activity,
  Sparkles,
  Medal
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UserRank } from '@/contexts/UserContext';

export type SystemMessageType = 
  | 'member_joined'
  | 'contest_entered'
  | 'vote_request'
  | 'member_won'
  | 'member_promoted'
  | 'activity_changed';

export interface SystemMessageData {
  id: string;
  type: SystemMessageType;
  memberName: string;
  memberNameAr: string;
  time: string;
  // Optional data for specific types
  contestName?: string;
  contestNameAr?: string;
  prizeAmount?: number;
  newRank?: UserRank;
  isNowActive?: boolean;
}

interface SystemMessageBubbleProps {
  message: SystemMessageData;
}

const typeIcons: Record<SystemMessageType, React.ElementType> = {
  member_joined: UserPlus,
  contest_entered: Trophy,
  vote_request: Vote,
  member_won: Medal,
  member_promoted: Star,
  activity_changed: Activity,
};

const typeColors: Record<SystemMessageType, string> = {
  member_joined: 'text-info bg-info/10 border-info/20',
  contest_entered: 'text-warning bg-warning/10 border-warning/20',
  vote_request: 'text-primary bg-primary/10 border-primary/20',
  member_won: 'text-success bg-success/10 border-success/20',
  member_promoted: 'text-warning bg-warning/10 border-warning/20',
  activity_changed: 'text-muted-foreground bg-muted/50 border-border',
};

const rankNamesAr: Record<UserRank, string> = {
  subscriber: 'مشترك',
  marketer: 'مسوّق',
  leader: 'قائد',
  manager: 'مدير',
  president: 'رئيس',
};

const rankNamesEn: Record<UserRank, string> = {
  subscriber: 'Subscriber',
  marketer: 'Marketer',
  leader: 'Leader',
  manager: 'Manager',
  president: 'President',
};

export function SystemMessageBubble({ message }: SystemMessageBubbleProps) {
  const { language } = useLanguage();
  const Icon = typeIcons[message.type];
  const colorClasses = typeColors[message.type];

  const getMessageText = (): string => {
    const name = language === 'ar' ? message.memberNameAr : message.memberName;
    
    switch (message.type) {
      case 'member_joined':
        return language === 'ar' 
          ? `🎉 انضم ${name} إلى الفريق - مرحباً!`
          : `🎉 ${name} joined the team - Welcome!`;
      
      case 'contest_entered':
        const contest = language === 'ar' ? message.contestNameAr : message.contestName;
        return language === 'ar'
          ? `🏆 ${name} دخل مسابقة ${contest || 'اليوم'}`
          : `🏆 ${name} entered ${contest || "today's"} contest`;
      
      case 'vote_request':
        return language === 'ar'
          ? `🗳️ ${name} يحتاج دعمكم - صوّتوا له!`
          : `🗳️ ${name} needs your support - Vote now!`;
      
      case 'member_won':
        const prize = message.prizeAmount || 0;
        return language === 'ar'
          ? `🏅 مبروك! ${name} فاز بـ ${prize} Nova`
          : `🏅 Congrats! ${name} won ${prize} Nova`;
      
      case 'member_promoted':
        const rankName = message.newRank 
          ? (language === 'ar' ? rankNamesAr[message.newRank] : rankNamesEn[message.newRank])
          : '';
        return language === 'ar'
          ? `⭐ ${name} ترقّى إلى ${rankName} - أحسنت!`
          : `⭐ ${name} promoted to ${rankName} - Well done!`;
      
      case 'activity_changed':
        return message.isNowActive
          ? (language === 'ar' 
              ? `✅ ${name} أصبح نشطاً هذا الأسبوع`
              : `✅ ${name} became active this week`)
          : (language === 'ar'
              ? `⚠️ ${name} لم يشارك هذا الأسبوع`
              : `⚠️ ${name} hasn't participated this week`);
      
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex justify-center my-3"
    >
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm ${colorClasses}`}>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-center">{getMessageText()}</span>
        <span className="text-[10px] opacity-60 shrink-0">{message.time}</span>
      </div>
    </motion.div>
  );
}

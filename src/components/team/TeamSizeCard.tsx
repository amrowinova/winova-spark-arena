import { motion } from 'framer-motion';
import { Users, UserPlus, UsersRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useUser, UserRank } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRankBasedData } from '@/hooks/useRankBasedData';

interface TeamSizeCardProps {
  onDirectClick?: () => void;
  onIndirectClick?: () => void;
  rankOverride?: UserRank | null;
}

export function TeamSizeCard({ onDirectClick, onIndirectClick, rankOverride }: TeamSizeCardProps) {
  const { user } = useUser();
  const { language } = useLanguage();
  
  // Use override rank for dev testing, otherwise use actual user rank
  const displayRank = rankOverride ?? user.rank;
  const rankData = useRankBasedData(displayRank);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">
            {language === 'ar' ? 'حجم الفريق' : 'Team Size'}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Total */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-primary">{rankData.teamSize}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'الإجمالي' : 'Total'}
            </p>
          </div>

          {/* Direct */}
          <div 
            className={`bg-success/5 border border-success/20 rounded-xl p-3 text-center ${
              onDirectClick ? 'cursor-pointer hover:bg-success/10 transition-colors' : ''
            }`}
            onClick={onDirectClick}
          >
            <UserPlus className="h-5 w-5 mx-auto mb-1 text-success" />
            <p className="text-2xl font-bold text-success">{rankData.directTeam}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'مباشر' : 'Direct'}
            </p>
          </div>

          {/* Indirect */}
          <div 
            className={`bg-muted rounded-xl p-3 text-center ${
              onIndirectClick ? 'cursor-pointer hover:bg-muted/80 transition-colors' : ''
            }`}
            onClick={onIndirectClick}
          >
            <UsersRound className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{rankData.indirectTeam}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'غير مباشر' : 'Indirect'}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { Users, UserPlus, UsersRound, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeamStats } from '@/hooks/useTeamStats';

interface TeamSizeCardProps {
  onDirectClick?: () => void;
  onIndirectClick?: () => void;
}

export function TeamSizeCard({ onDirectClick, onIndirectClick }: TeamSizeCardProps) {
  const { language } = useLanguage();
  
  // Get ALL data from database - NO MOCK DATA
  const { directCount, indirectCount, totalCount, loading } = useTeamStats();

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="p-4">
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </Card>
      </motion.div>
    );
  }

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
            <p className="text-2xl font-bold text-primary">{totalCount}</p>
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
            <p className="text-2xl font-bold text-success">{directCount}</p>
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
            <p className="text-2xl font-bold">{indirectCount}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'غير مباشر' : 'Indirect'}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

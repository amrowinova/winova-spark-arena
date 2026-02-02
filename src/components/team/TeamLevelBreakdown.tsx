import { Layers, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeamStats } from '@/hooks/useTeamStats';

export function TeamLevelBreakdown() {
  const { language } = useLanguage();
  const { levelBreakdown, totalCount, loading } = useTeamStats();

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!levelBreakdown || levelBreakdown.length === 0) return null;

  const levelNames: Record<number, { en: string; ar: string }> = {
    1: { en: 'Direct', ar: 'مباشر' },
    2: { en: 'Level 2', ar: 'المستوى 2' },
    3: { en: 'Level 3', ar: 'المستوى 3' },
    4: { en: 'Level 4', ar: 'المستوى 4' },
    5: { en: 'Level 5', ar: 'المستوى 5' },
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Layers className="h-5 w-5 text-primary" />
        {language === 'ar' ? 'تفصيل المستويات' : 'Level Breakdown'}
      </h3>

      <div className="space-y-3">
        {levelBreakdown.map((level) => {
          const percentage = totalCount > 0 
            ? Math.round((level.total_count / totalCount) * 100) 
            : 0;
          const activityRate = level.total_count > 0 
            ? Math.round((level.active_count / level.total_count) * 100) 
            : 0;

          return (
            <div key={level.level} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {language === 'ar' 
                    ? levelNames[level.level]?.ar || `المستوى ${level.level}`
                    : levelNames[level.level]?.en || `Level ${level.level}`}
                </span>
                <span className="text-muted-foreground">
                  {level.active_count}/{level.total_count}
                  <span className="text-xs ml-1">({activityRate}%)</span>
                </span>
              </div>
              <Progress 
                value={percentage} 
                className="h-2"
              />
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
        <span className="font-medium">
          {language === 'ar' ? 'إجمالي الفريق' : 'Total Team'}
        </span>
        <span className="font-bold text-primary">{totalCount}</span>
      </div>
    </Card>
  );
}

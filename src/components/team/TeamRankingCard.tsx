import { Trophy, Globe, MapPin, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeamStats } from '@/hooks/useTeamStats';

export function TeamRankingCard() {
  const { language } = useLanguage();
  const { ranking, loading } = useTeamStats();

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!ranking) return null;

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-warning" />
        {language === 'ar' ? 'ترتيبك' : 'Your Ranking'}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Country Rank */}
        <div className="bg-primary/5 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary">
            #{ranking.country_rank || '-'}
          </p>
          <p className="text-xs text-muted-foreground">
            {language === 'ar' ? `في ${ranking.country}` : `in ${ranking.country}`}
          </p>
        </div>

        {/* Global Rank */}
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Globe className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            #{ranking.global_rank || '-'}
          </p>
          <p className="text-xs text-muted-foreground">
            {language === 'ar' ? 'عالمياً' : 'Global'}
          </p>
        </div>
      </div>

      {/* Points */}
      <div className="mt-3 pt-3 border-t flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {language === 'ar' ? 'نقاط Spotlight' : 'Spotlight Points'}
        </span>
        <span className="font-bold text-primary">{ranking.spotlight_points.toLocaleString()}</span>
      </div>
    </Card>
  );
}

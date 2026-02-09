import { useExternalKnowledge } from '@/hooks/useStrategicBrain';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function TodayLearningsSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data, isLoading } = useExternalKnowledge();

  const categoryEmoji: Record<string, string> = {
    security: '🔒',
    fintech: '💰',
    engineering: '⚙️',
    ux: '🎨',
    general: '📚',
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" />
          {isAr ? 'ما تعلمه الذكاء اليوم' : 'What AI Learned Today'}
          <Badge variant="secondary" className="ms-auto text-xs">{data?.length || 0}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-80 overflow-y-auto">
        {(!data || data.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isAr ? 'لا توجد معرفة جديدة بعد' : 'No new knowledge collected yet'}
          </p>
        ) : (
          data.map((item: any) => (
            <div key={item.id} className="rounded-lg border p-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-tight">
                  {categoryEmoji[item.source_category] || '📚'} {item.title}
                </p>
                {item.source_url && (
                  <a href={item.source_url} target="_blank" rel="noopener" className="shrink-0">
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{item.content}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{item.source_category}</Badge>
                <span className="text-[10px] text-muted-foreground">
                  {isAr ? 'صلة' : 'Relevance'}: {item.relevance_score}%
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

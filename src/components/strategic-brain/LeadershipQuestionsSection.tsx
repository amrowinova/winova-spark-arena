import { useLeadershipQuestions } from '@/hooks/useControlTower';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function LeadershipQuestionsSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data, isLoading } = useLeadershipQuestions();

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
      </Card>
    );
  }

  const pending = (data || []).filter((q: any) => q.status === 'pending');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="h-4 w-4" />
          {isAr ? 'أسئلة للقيادة' : 'Questions for Leadership'}
          {pending.length > 0 && (
            <Badge variant="destructive" className="ms-auto text-xs">{pending.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-72 overflow-y-auto">
        {(!data || data.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isAr ? 'لا توجد أسئلة معلقة' : 'No pending questions'}
          </p>
        ) : (
          data.map((q: any) => (
            <div key={q.id} className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={q.status === 'pending' ? 'default' : 'secondary'} className="text-[10px]">
                  {q.status === 'pending' ? (isAr ? '⏳ معلق' : '⏳ Pending') : (isAr ? '✅ مكتمل' : '✅ Resolved')}
                </Badge>
              </div>
              <p className="text-sm font-medium">{q.question}</p>
              {q.summary && (
                <p className="text-xs text-muted-foreground">
                  {isAr ? (q.summary_ar || q.summary) : q.summary}
                </p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

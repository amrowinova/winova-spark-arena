import { HelpCircle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLeadershipQuestions } from '@/hooks/useControlTower';
import { useLanguage } from '@/contexts/LanguageContext';

export function QuestionsSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data: questions = [], isLoading } = useLeadershipQuestions();

  const pending = questions.filter((q: any) => q.status === 'pending' || q.status === 'in_progress');
  const completed = questions.filter((q: any) => q.status === 'completed');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="h-5 w-5 text-accent-foreground" />
          {isAr ? 'أسئلة للقيادة' : 'Questions for Leadership'}
          {pending.length > 0 && (
            <Badge variant="destructive" className="text-xs">{pending.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : questions.length === 0 ? (
          <div className="text-center py-6">
            <HelpCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{isAr ? 'لا أسئلة حالياً' : 'No questions right now'}</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-2">
                {pending.map((q: any) => (
                  <div key={q.id} className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{q.question}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(q.created_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <h4 className="text-xs text-muted-foreground mb-2">
                  {isAr ? 'تم الرد عليها' : 'Answered'}
                </h4>
                <div className="space-y-2">
                  {completed.slice(0, 3).map((q: any) => (
                    <div key={q.id} className="rounded-lg border bg-card/50 p-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs">{q.question}</p>
                          {q.summary && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {isAr ? (q.summary_ar || q.summary) : q.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

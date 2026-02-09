import { Lightbulb, BookOpen, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNewKnowledge } from '@/hooks/useControlTower';
import { useLanguage } from '@/contexts/LanguageContext';

export function NewKnowledgeSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data, isLoading } = useNewKnowledge();

  const memories = data?.recentMemory || [];
  const patterns = data?.patterns || [];
  const rules = data?.rules || [];

  const hasData = memories.length > 0 || patterns.length > 0 || rules.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-5 w-5 text-warning" />
          {isAr ? 'معرفة جديدة' : 'New Knowledge'}
          {hasData && (
            <Badge variant="secondary" className="text-xs">
              {memories.length + patterns.length + rules.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : !hasData ? (
          <div className="text-center py-6">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{isAr ? 'لم يتعلم الذكاء شيئاً جديداً بعد' : 'No new learnings yet'}</p>
          </div>
        ) : (
          <>
            {/* Recent Discoveries */}
            {memories.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                  <BookOpen className="h-3 w-3" />
                  {isAr ? 'اكتشافات حديثة' : 'Recent Discoveries'}
                </h4>
                <div className="space-y-2">
                  {memories.slice(0, 5).map((m: any) => (
                    <div key={m.id} className="rounded-lg border bg-card/50 p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{m.event_type}</Badge>
                        <Badge variant="outline" className="text-[10px]">{m.area || 'general'}</Badge>
                        <span className="text-[10px] text-muted-foreground ms-auto">
                          {new Date(m.created_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {m.source}: {JSON.stringify(m.payload).slice(0, 120)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patterns */}
            {patterns.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                  <Sparkles className="h-3 w-3" />
                  {isAr ? 'أنماط مكتشفة' : 'Discovered Patterns'}
                </h4>
                <div className="space-y-2">
                  {patterns.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="rounded-lg border bg-card/50 p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{p.pattern_type}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{p.confidence}% ثقة</Badge>
                      </div>
                      <p className="text-xs font-medium">{p.problem}</p>
                      {p.solution && <p className="text-xs text-muted-foreground mt-1">→ {p.solution}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rules */}
            {rules.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  {isAr ? 'قواعد مستخلصة' : 'Extracted Rules'}
                </h4>
                <div className="space-y-2">
                  {rules.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="rounded-lg border bg-card/50 p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={r.is_active ? 'default' : 'secondary'} className="text-[10px]">
                          {r.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معلق' : 'Pending')}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{r.rule_key}</Badge>
                      </div>
                      <p className="text-xs">{isAr ? (r.description_ar || r.description) : r.description}</p>
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

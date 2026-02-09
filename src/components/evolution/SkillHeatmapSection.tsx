import { useSkillHeatmap } from '@/hooks/useEvolutionEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SkillHeatmapSection() {
  const { data: skills, isLoading } = useSkillHeatmap();

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  if (!skills?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No skill data available yet.
        </CardContent>
      </Card>
    );
  }

  // Group skills by category
  const categories: Record<string, { name: string; level: number; count: number }[]> = {};
  skills.forEach(s => {
    const cat = s.skill_category || 'general';
    if (!categories[cat]) categories[cat] = [];
    const existing = categories[cat].find(x => x.name === s.skill_name);
    if (existing) {
      existing.level = Math.max(existing.level, s.proficiency_level);
      existing.count++;
    } else {
      categories[cat].push({ name: s.skill_name, level: s.proficiency_level, count: 1 });
    }
  });

  const heatColor = (level: number) => {
    if (level >= 80) return 'bg-green-500/80';
    if (level >= 60) return 'bg-green-500/50';
    if (level >= 40) return 'bg-yellow-500/50';
    if (level >= 20) return 'bg-orange-500/50';
    return 'bg-red-500/40';
  };

  return (
    <div className="space-y-4">
      {Object.entries(categories).map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm capitalize">{cat}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {items.sort((a, b) => b.level - a.level).map(skill => (
                <div
                  key={skill.name}
                  className={`${heatColor(skill.level)} rounded-md px-3 py-1.5 text-xs font-medium`}
                  title={`${skill.name}: ${skill.level}% (${skill.count} agent${skill.count > 1 ? 's' : ''})`}
                >
                  {skill.name} · {skill.level}%
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

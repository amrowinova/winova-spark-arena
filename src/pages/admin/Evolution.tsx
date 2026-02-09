import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ForecastsSection } from '@/components/evolution/ForecastsSection';
import { CapabilityGapsSection } from '@/components/evolution/CapabilityGapsSection';
import { GrowthMetricsSection } from '@/components/evolution/GrowthMetricsSection';
import { SkillHeatmapSection } from '@/components/evolution/SkillHeatmapSection';
import { Brain, TrendingUp, Zap, BarChart3, Grid3X3 } from 'lucide-react';

export default function Evolution() {
  return (
    <div className="min-h-screen bg-background">
      <InnerPageHeader title="Evolution Engine" />

      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Brain className="h-4 w-4" />
          <span>Predictive Intelligence · Read Only · No Auto-Execution</span>
        </div>

        <Tabs defaultValue="forecasts" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="forecasts" className="text-xs gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Forecasts
            </TabsTrigger>
            <TabsTrigger value="gaps" className="text-xs gap-1">
              <Zap className="h-3.5 w-3.5" />
              Gaps
            </TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Growth
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="text-xs gap-1">
              <Grid3X3 className="h-3.5 w-3.5" />
              Skills
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forecasts">
            <ForecastsSection />
          </TabsContent>
          <TabsContent value="gaps">
            <CapabilityGapsSection />
          </TabsContent>
          <TabsContent value="metrics">
            <GrowthMetricsSection />
          </TabsContent>
          <TabsContent value="heatmap">
            <SkillHeatmapSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { CommanderBriefing } from '@/components/commander/CommanderBriefing';
import { DecisionFeed } from '@/components/commander/DecisionFeed';
import { LearningLoopChart } from '@/components/commander/LearningLoopChart';
import { EmergencyControls } from '@/components/commander/EmergencyControls';
import { GovernanceTierLegend } from '@/components/commander/GovernanceTierLegend';
import { AuthorityTierCard } from '@/components/commander/AuthorityTierCard';
import { GhostArmySection } from '@/components/commander/GhostArmySection';
import { SystemIncidentsMonitor } from '@/components/commander/SystemIncidentsMonitor';

export default function Commander() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <InnerPageHeader
        title={isAr ? 'القائد التنفيذي' : 'Executive Commander'}
        onBack={() => navigate('/admin')}
      />

      <div className="container pb-24 pt-4 space-y-4">
        {/* 1. Commander Briefing — always first */}
        <CommanderBriefing />

        {/* 2. Authority Level — earned autonomy */}
        <AuthorityTierCard />

        {/* 3. Decision Feed — the core */}
        <DecisionFeed />

        {/* 4. Learning Loop + Governance side by side */}
        <div className="grid md:grid-cols-2 gap-4">
          <LearningLoopChart />
          <div className="space-y-4">
            <GovernanceTierLegend />
            <EmergencyControls />
          </div>
        </div>

        {/* 5. System Incidents Monitor */}
        <SystemIncidentsMonitor />

        {/* 6. Ghost Army — Sovereign Stress Test */}
        <GhostArmySection />
      </div>
    </div>
  );
}

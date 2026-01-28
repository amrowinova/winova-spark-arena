import { UserRank } from '@/contexts/UserContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2 } from 'lucide-react';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEV-ONLY RANK SWITCHER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This component is ONLY visible in development mode.
 * It allows developers to quickly switch between ranks to test UI.
 * 
 * IMPORTANT:
 * - Does NOT change actual user data
 * - Only affects the current view/UI
 * - Hidden from end users in production
 * ═══════════════════════════════════════════════════════════════════════════
 */

const RANKS: { value: UserRank; labelAr: string; labelEn: string; icon: string }[] = [
  { value: 'subscriber', labelAr: 'مشترك', labelEn: 'Subscriber', icon: '🔵' },
  { value: 'marketer', labelAr: 'مسوّق', labelEn: 'Marketer', icon: '🟢' },
  { value: 'leader', labelAr: 'قائد', labelEn: 'Leader', icon: '⭐' },
  { value: 'manager', labelAr: 'مدير', labelEn: 'Manager', icon: '💎' },
  { value: 'president', labelAr: 'رئيس', labelEn: 'President', icon: '👑' },
];

interface DevRankSwitcherProps {
  currentRank: UserRank;
  onRankChange: (rank: UserRank) => void;
  language: 'ar' | 'en';
}

export function DevRankSwitcher({ currentRank, onRankChange, language }: DevRankSwitcherProps) {
  // Only show in development mode
  const isDev = import.meta.env.DEV;
  
  if (!isDev) return null;

  return (
    <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Settings2 className="h-4 w-4 text-warning" />
        <span className="text-xs font-medium text-warning">
          {language === 'ar' ? 'وضع التطوير - اختبار الرتب' : 'Dev Mode - Test Ranks'}
        </span>
      </div>
      
      <Tabs value={currentRank} onValueChange={(v) => onRankChange(v as UserRank)}>
        <TabsList className="w-full h-auto flex-wrap gap-1 bg-warning/20">
          {RANKS.map((rank) => (
            <TabsTrigger
              key={rank.value}
              value={rank.value}
              className="flex-1 min-w-[60px] text-xs py-1.5 data-[state=active]:bg-warning data-[state=active]:text-warning-foreground"
            >
              <span className="mr-1">{rank.icon}</span>
              {language === 'ar' ? rank.labelAr : rank.labelEn}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      
      <p className="text-[10px] text-warning mt-2 text-center">
        {language === 'ar' 
          ? '⚠️ هذا للاختبار فقط - لا يغيّر البيانات الحقيقية' 
          : '⚠️ Testing only - does not change real data'}
      </p>
    </div>
  );
}

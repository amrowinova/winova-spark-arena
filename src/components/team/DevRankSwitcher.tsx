import { UserRank } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEV-ONLY RANK SWITCHER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This component is ONLY visible in development mode.
 * It allows developers to quickly switch between ranks to test UI.
 * 
 * UI/UX matches the Contest Stage Toggle (Stage 1 / Final Stage buttons)
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
    <div className="mb-4">
      {/* Dev Mode Label */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {language === 'ar' ? 'وضع التطوير - اختبار الرتب' : 'Dev Mode - Test Ranks'}
        </span>
      </div>
      
      {/* Rank Buttons - Same style as Contest Stage Toggle */}
      <div className="flex flex-wrap gap-2 justify-center">
        {RANKS.map((rank) => (
          <Button
            key={rank.value}
            size="sm"
            variant={currentRank === rank.value ? "default" : "outline"}
            onClick={() => onRankChange(rank.value)}
            className="text-xs"
          >
            <span className="mr-1">{rank.icon}</span>
            {language === 'ar' ? rank.labelAr : rank.labelEn}
          </Button>
        ))}
      </div>
      
      {/* Warning note */}
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        ⚠️ {language === 'ar' 
          ? 'هذا للاختبار فقط - لا يغيّر البيانات الحقيقية' 
          : 'Testing only - does not change real data'}
      </p>
    </div>
  );
}

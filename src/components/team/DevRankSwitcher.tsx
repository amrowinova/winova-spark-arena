import { UserRank } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Language } from '@/contexts/LanguageContext';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RANK SWITCHER (Preview/Development Tool)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Allows switching between ranks to preview each rank's UI.
 * Same UI/UX as Contest Stage Toggle (Stage 1 / Final Stage buttons)
 * 
 * IMPORTANT:
 * - Does NOT change actual user data
 * - Only affects the current view/UI (Preview/Simulation)
 * - Can be hidden later for end users
 * ═══════════════════════════════════════════════════════════════════════════
 */

const RANKS: { value: UserRank; labelAr: string; labelEn: string; icon: string }[] = [
  { value: 'subscriber', labelAr: 'مشترك', labelEn: 'Subscriber', icon: '🔵' },
  { value: 'marketer', labelAr: 'مسوّق', labelEn: 'Marketer', icon: '🟢' },
  { value: 'leader', labelAr: 'قائد', labelEn: 'Leader', icon: '⭐' },
  { value: 'manager', labelAr: 'مدير', labelEn: 'Manager', icon: '💎' },
  { value: 'president', labelAr: 'رئيس', labelEn: 'President', icon: '👑' },
];

interface RankSwitcherProps {
  currentRank: UserRank;
  onRankChange: (rank: UserRank) => void;
  language: Language;
}

export function RankSwitcher({ currentRank, onRankChange, language }: RankSwitcherProps) {
  return (
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
  );
}

// Keep old name for backward compatibility
export const DevRankSwitcher = RankSwitcher;

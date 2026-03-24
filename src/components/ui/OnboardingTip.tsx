/**
 * OnboardingTip — Contextual, one-time tooltip shown in context
 *
 * Rules:
 *  - Each tipType is shown exactly once (persisted in localStorage)
 *  - Auto-dismisses after 5 seconds with a visible progress bar
 *  - Manual close also marks it as seen
 *  - Only renders when `condition` is true AND not yet seen
 *  - Zero PII — only stores tip keys in localStorage
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// ─── Tip registry ──────────────────────────────────────────────────────────────

export type TipType =
  | 'contest_pre_open'   // Pre-10am: join early for best position
  | 'contest_join'       // 10am-7pm: join to compete
  | 'contest_voting'     // 2pm-8pm: vote to earn Aura
  | 'contest_final'      // 8pm-10pm: final stage live
  | 'wallet_zero'        // Nova balance is 0 → explain how to earn
  | 'aura_explained'     // First time Aura is seen → explain Nova vs Aura
  | 'team_subscriber'    // Rank is subscriber → explain 0% commission
  | 'spotlight_first'    // First visit to Spotlight
  | 'p2p_first';         // First visit to P2P

interface TipContent {
  icon: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  ctaAr?: string;
  ctaEn?: string;
  ctaHref?: string;
  variant?: 'info' | 'nova' | 'aura' | 'warning' | 'success';
}

const TIPS: Record<TipType, TipContent> = {
  contest_pre_open: {
    icon: '⏰',
    titleAr: 'المسابقة تبدأ الساعة 10 صباحاً',
    titleEn: 'Contest opens at 10 AM',
    bodyAr: 'سجّل مبكراً! كلما انضممت أول كلما زادت فرصتك في المرحلة الأولى. التسجيل يغلق الساعة 7 مساءً.',
    bodyEn: 'Join early! The sooner you enter, the more time you have to gather votes. Registration closes at 7 PM.',
    variant: 'info',
  },
  contest_join: {
    icon: '🏆',
    titleAr: 'انضم الآن — 10 Nova فقط',
    titleEn: 'Join Now — Only 10 Nova',
    bodyAr: 'رسوم الدخول 10 Nova. كل مشترك يضيف 6 Nova لمجموع الجوائز. كلما زاد المشاركون كلما كبرت الجائزة.',
    bodyEn: 'Entry fee is 10 Nova. Each participant adds 6 Nova to the prize pool — more players = bigger prize.',
    variant: 'nova',
  },
  contest_voting: {
    icon: '🗳️',
    titleAr: 'صوّت وأنت تكسب',
    titleEn: 'Vote and Earn',
    bodyAr: 'كل صوت تُعطيه يكلّفك 1 Aura — لكنك تكسب نقطة Spotlight. Aura ليست Nova — تُكتسب بتحويل Nova أو بالنشاط.',
    bodyEn: 'Each vote costs 1 Aura — but earns you a Spotlight point. Aura ≠ Nova: earn it by converting Nova or through activity.',
    variant: 'aura',
  },
  contest_final: {
    icon: '🔥',
    titleAr: 'المرحلة النهائية — أعلى 50 يتنافسون',
    titleEn: 'Final Stage — Top 50 competing',
    bodyAr: 'فقط من تأهّل يمكنه الوصول للنهائي. إذا تأهّلت — ادخل المسابقة وصوّت الآن قبل 10 مساءً.',
    bodyEn: 'Only qualifiers can participate in the final. If you qualified — go vote now before 10 PM.',
    ctaAr: 'ادخل المسابقة',
    ctaEn: 'Enter Contest',
    ctaHref: '/contests',
    variant: 'warning',
  },
  wallet_zero: {
    icon: '💡',
    titleAr: 'رصيدك صفر؟ إليك كيف تكسب Nova',
    titleEn: 'Zero balance? Here\'s how to earn Nova',
    bodyAr: 'اكسب Nova من: الفوز في المسابقة، عمولة الفريق عند إحالة أصدقاء، أو شراء Nova عبر وكيل P2P.',
    bodyEn: 'Earn Nova from: winning contests, team referral commission, or buying Nova via a P2P agent.',
    ctaAr: 'شارك رابط الإحالة',
    ctaEn: 'Share Referral Link',
    ctaHref: '/referral',
    variant: 'info',
  },
  aura_explained: {
    icon: '⭐',
    titleAr: 'Aura ≠ Nova — الفرق المهم',
    titleEn: 'Aura ≠ Nova — Key difference',
    bodyAr: 'Nova هي عملتك الرئيسية (تكتسبها وتنفقها). Aura للتصويت فقط — تكتسبها بتحويل 1 Nova = 2 Aura.',
    bodyEn: 'Nova is your main currency. Aura is for voting only — earn it by converting: 1 Nova = 2 Aura.',
    variant: 'aura',
  },
  team_subscriber: {
    icon: '👥',
    titleAr: 'رتبتك subscriber — عمولتك 0%',
    titleEn: 'You\'re subscriber — 0% commission',
    bodyAr: 'رتبة subscriber لا تُدرّ عمولة من فريقك. ارقَ إلى marketer للحصول على 5%، أو leader لـ 10%.',
    bodyEn: 'Subscriber rank earns 0% team commission. Upgrade to marketer for 5%, or leader for 10%.',
    ctaAr: 'اطّلع على الرتب',
    ctaEn: 'View Ranks',
    ctaHref: '/referral',
    variant: 'warning',
  },
  spotlight_first: {
    icon: '✨',
    titleAr: 'Spotlight — السحب اليومي بالنقاط',
    titleEn: 'Spotlight — Daily draw by points',
    bodyAr: 'نقاطك = احتمالية فوزك في السحب اليومي. اكسب نقاطاً بالانضمام للمسابقة، التصويت، والتحويل.',
    bodyEn: 'Your points = your daily draw odds. Earn points by joining contests, voting, and transferring Nova.',
    variant: 'success',
  },
  p2p_first: {
    icon: '🔄',
    titleAr: 'P2P — بيع وشراء Nova مقابل نقد',
    titleEn: 'P2P — Buy & sell Nova for cash',
    bodyAr: 'أنشئ طلب بيع وانتظر مشترياً، أو نفّذ طلباً موجوداً. Nova يُقفَل في ضمان حتى يؤكد البائع الاستلام.',
    bodyEn: 'Create a sell order or execute an existing one. Nova is locked in escrow until the seller confirms receipt.',
    variant: 'info',
  },
};

// ─── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'wnv_tips_seen';

function isAlreadySeen(type: TipType): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const seen = JSON.parse(raw) as Record<string, boolean>;
    return seen[type] === true;
  } catch {
    return false;
  }
}

function markSeen(type: TipType): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const seen: Record<string, boolean> = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    seen[type] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  } catch {
    // storage blocked — silently skip
  }
}

// ─── Variant styles ────────────────────────────────────────────────────────────

const variantStyles: Record<NonNullable<TipContent['variant']>, string> = {
  info:    'bg-blue-500/10 border-blue-500/25 [--progress-color:theme(colors.blue.500)]',
  nova:    'bg-nova/10 border-nova/25 [--progress-color:theme(colors.amber.400)]',
  aura:    'bg-purple-500/10 border-purple-500/25 [--progress-color:theme(colors.purple.500)]',
  warning: 'bg-amber-500/10 border-amber-500/25 [--progress-color:theme(colors.amber.500)]',
  success: 'bg-green-500/10 border-green-500/25 [--progress-color:theme(colors.green.500)]',
};

const progressStyles: Record<NonNullable<TipContent['variant']>, string> = {
  info:    'bg-blue-500',
  nova:    'bg-amber-400',
  aura:    'bg-purple-500',
  warning: 'bg-amber-500',
  success: 'bg-green-500',
};

// ─── Component ─────────────────────────────────────────────────────────────────

const AUTO_DISMISS_MS = 5_000;

interface OnboardingTipProps {
  tipType: TipType;
  /** Render-side condition — set to false to suppress without touching localStorage */
  condition?: boolean;
  className?: string;
}

export function OnboardingTip({ tipType, condition = true, className }: OnboardingTipProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tip = TIPS[tipType];
  const variant = tip.variant ?? 'info';

  // Determine visibility on mount
  useEffect(() => {
    if (condition && !isAlreadySeen(tipType)) {
      setVisible(true);
    }
  }, [condition, tipType]);

  // Auto-dismiss timer with progress
  useEffect(() => {
    if (!visible) return;

    const TICK_MS = 50;
    const decrement = (TICK_MS / AUTO_DISMISS_MS) * 100;

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev - decrement;
        if (next <= 0) {
          dismiss();
          return 0;
        }
        return next;
      });
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dismiss = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    markSeen(tipType);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'relative overflow-hidden rounded-xl border px-3.5 py-3',
            variantStyles[variant],
            className
          )}
        >
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-border/30">
            <div
              className={cn('h-full transition-none', progressStyles[variant])}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="flex items-start gap-2.5">
            <span className="text-xl leading-none mt-0.5 shrink-0">{tip.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-snug">
                {isRTL ? tip.titleAr : tip.titleEn}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {isRTL ? tip.bodyAr : tip.bodyEn}
              </p>
              {tip.ctaHref && (
                <a
                  href={tip.ctaHref}
                  className="inline-block mt-1.5 text-xs font-semibold underline underline-offset-2 text-foreground hover:opacity-70 transition-opacity"
                  onClick={dismiss}
                >
                  {isRTL ? tip.ctaAr : tip.ctaEn} →
                </a>
              )}
            </div>
            <button
              onClick={dismiss}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              aria-label="Close tip"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

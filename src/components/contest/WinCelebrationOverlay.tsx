/**
 * WinCelebrationOverlay
 * ─────────────────────
 * Full-screen celebration shown once per session when the user wins a contest.
 * - Canvas confetti burst (canvas-confetti)
 * - Web Audio API victory chime (no external files)
 * - Animated win card with rank, name, and prize
 * - Share + Close actions
 */

import { useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Share2, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface WinCelebrationOverlayProps {
  open: boolean;
  name: string;
  rank: number;
  prizeNova: number;
  onClose: () => void;
  onShare?: () => void;
}

// ── Medal config ────────────────────────────────────────────────────────────
const MEDAL: Record<number, { emoji: string; label: { ar: string; en: string }; gradient: string; ring: string }> = {
  1: { emoji: '🥇', label: { ar: 'المركز الأول', en: '1st Place' }, gradient: 'from-yellow-400 via-nova to-yellow-600', ring: 'ring-yellow-400' },
  2: { emoji: '🥈', label: { ar: 'المركز الثاني', en: '2nd Place' }, gradient: 'from-slate-300 via-slate-400 to-slate-500', ring: 'ring-slate-400' },
  3: { emoji: '🥉', label: { ar: 'المركز الثالث', en: '3rd Place' }, gradient: 'from-amber-600 via-amber-700 to-amber-800', ring: 'ring-amber-600' },
};
const DEFAULT_MEDAL = { emoji: '🏆', label: { ar: `المركز`, en: 'Place' }, gradient: 'from-primary via-primary/80 to-primary/60', ring: 'ring-primary' };

// ── Web Audio victory chime ──────────────────────────────────────────────────
function playVictoryChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.5);

      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.55);
    });
  } catch {
    // Audio context blocked by browser policy — silent fallback
  }
}

// ── Confetti burst ───────────────────────────────────────────────────────────
function launchConfetti() {
  const colors = ['#f59e0b', '#fbbf24', '#60a5fa', '#34d399', '#f472b6', '#a78bfa'];

  // First burst — center explosion
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { x: 0.5, y: 0.55 },
    colors,
    startVelocity: 45,
    ticks: 200,
    zIndex: 9999,
  });

  // Side cannons after 300ms
  setTimeout(() => {
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, colors, zIndex: 9999 });
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, colors, zIndex: 9999 });
  }, 300);

  // Final shower after 700ms
  setTimeout(() => {
    confetti({ particleCount: 80, spread: 100, origin: { x: 0.5, y: 0.3 }, colors, gravity: 0.8, zIndex: 9999 });
  }, 700);
}

export function WinCelebrationOverlay({
  open,
  name,
  rank,
  prizeNova,
  onClose,
  onShare,
}: WinCelebrationOverlayProps) {
  const { language } = useLanguage();
  const launched = useRef(false);

  const isRTL = language === 'ar';
  const medal = MEDAL[rank] ?? DEFAULT_MEDAL;
  const rankLabel = rank <= 3
    ? medal.label[isRTL ? 'ar' : 'en']
    : (isRTL ? `المركز #${rank}` : `#${rank} Place`);

  const launch = useCallback(() => {
    if (launched.current) return;
    launched.current = true;
    playVictoryChime();
    launchConfetti();
  }, []);

  useEffect(() => {
    if (open) {
      // Slight delay so the overlay animates in first
      const t = setTimeout(launch, 350);
      return () => clearTimeout(t);
    } else {
      launched.current = false;
    }
  }, [open, launch]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* ── Card ── */}
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.6, y: 60 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 40 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.05 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center px-6 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm">
              {/* Close button */}
              <div className="flex justify-end mb-2">
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Main win card */}
              <div className={`bg-gradient-to-br ${medal.gradient} p-px rounded-3xl shadow-2xl`}>
                <div className="bg-background rounded-3xl p-6 text-center space-y-5">

                  {/* Medal emoji — bouncing */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ delay: 0.2, duration: 0.5, times: [0, 0.7, 1] }}
                    className="text-7xl leading-none select-none"
                  >
                    {medal.emoji}
                  </motion.div>

                  {/* Rank label */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r ${medal.gradient} text-white shadow`}>
                      {rankLabel}
                    </span>
                  </motion.div>

                  {/* Congratulations */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="space-y-1"
                  >
                    <p className="text-2xl font-bold text-foreground">
                      {isRTL ? `مبروك ${name}! 🎉` : `Congrats ${name}! 🎉`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isRTL ? 'فزت في مسابقة اليوم' : "You won today's contest"}
                    </p>
                  </motion.div>

                  {/* Prize amount */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55, type: 'spring', stiffness: 260 }}
                    className="bg-nova/10 border border-nova/30 rounded-2xl p-4"
                  >
                    <p className="text-xs text-muted-foreground mb-1">
                      {isRTL ? '🏅 جائزتك' : '🏅 Your Prize'}
                    </p>
                    <p className="text-4xl font-bold text-nova">
                      И {prizeNova.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Nova</p>
                  </motion.div>

                  {/* Stars decoration */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.65 }}
                    className="flex justify-center gap-1"
                  >
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.65 + i * 0.07 }}
                      >
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Action buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                    className="flex gap-3"
                  >
                    {onShare && (
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={onShare}
                      >
                        <Share2 className="h-4 w-4" />
                        {isRTL ? 'شارك' : 'Share'}
                      </Button>
                    )}
                    <Button
                      className={`${onShare ? 'flex-1' : 'w-full'} gap-2`}
                      onClick={onClose}
                    >
                      <Trophy className="h-4 w-4" />
                      {isRTL ? 'شاهد النتائج' : 'View Results'}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

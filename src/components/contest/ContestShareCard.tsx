/**
 * ContestShareCard — three variants rendered from a single component
 *   winner      → shown to the winning contestant in the results phase
 *   participant → shown to users who joined but didn't place in top 5
 *   spectator   → shown to users who didn't join (FOMO card)
 *
 * Share targets: WhatsApp (text link) + Instagram/Download (html2canvas PNG)
 */
import { useRef } from 'react';
import { MessageCircle, Instagram, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCountryFlag } from '@/lib/countryFlags';
import { useBanner } from '@/contexts/BannerContext';

// ─── Data shapes ──────────────────────────────────────────────────────────────

export interface WinnerCardData {
  type: 'winner';
  name: string;
  city: string;
  country: string;
  rank: number;
  prizeNova: number;
  prizeLocal: number;
  currencySymbolAr: string;   // e.g. "ر.س"
  currencySymbolEn: string;   // e.g. "SAR"
  contestDate: string;        // KSA-formatted date string
}

export interface ParticipantCardData {
  type: 'participant';
  name: string;
  city: string;
  country: string;
  rank: number;
  totalParticipants: number;
  contestDate: string;
}

export interface SpectatorCardData {
  type: 'spectator';
  totalParticipants: number;
  prizeNova: number;
  prizeLocal: number;
  currencySymbolAr: string;
  currencySymbolEn: string;
  contestDate: string;
}

export type ContestShareCardData =
  | WinnerCardData
  | ParticipantCardData
  | SpectatorCardData;

// ─── Helper: html2canvas capture ─────────────────────────────────────────────

async function captureCard(el: HTMLElement): Promise<Blob | null> {
  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(el, {
      backgroundColor: null,
      scale: 3,
      useCORS: true,
      logging: false,
    });
    return await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), 'image/png')
    );
  } catch {
    return null;
  }
}

// ─── Visual card (what gets captured) ────────────────────────────────────────

function WinnerVisualCard({ d, isRTL }: { d: WinnerCardData; isRTL: boolean }) {
  const flag = getCountryFlag(d.country);
  const rankEmoji = ['🥇', '🥈', '🥉', '🏅', '🏅'][d.rank - 1] ?? '🏅';
  const location = [d.city, d.country].filter(Boolean).join('، ');
  const currency = isRTL ? d.currencySymbolAr : d.currencySymbolEn;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1a0533 0%, #2d0a5e 50%, #1a0533 100%)',
        borderRadius: 20,
        padding: 28,
        width: 340,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        direction: 'rtl',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow blob */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 160, height: 160,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(155,79,255,0.35) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span style={{ color: '#c084fc', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          WeNova
        </span>
        <span style={{
          background: 'rgba(255,255,255,0.12)',
          color: '#c084fc',
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: 20,
          border: '1px solid rgba(192,132,252,0.3)',
        }}>
          ✓ فائز رسمي
        </span>
      </div>

      {/* Rank emoji */}
      <div style={{ textAlign: 'center', fontSize: 52, marginBottom: 8 }}>
        {rankEmoji}
      </div>

      {/* Name + location */}
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <p style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>
          {d.name}
        </p>
        <p style={{ color: '#a78bfa', fontSize: 12, margin: 0 }}>
          {flag} {location}
        </p>
      </div>

      {/* Prize box */}
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(192,132,252,0.25)',
        borderRadius: 14,
        padding: '14px 18px',
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <p style={{ color: '#c084fc', fontSize: 11, margin: '0 0 4px', fontWeight: 600 }}>
          🏆 الجائزة
        </p>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, margin: '0 0 2px' }}>
          {d.prizeNova.toLocaleString()} Nova
        </p>
        <p style={{ color: '#a78bfa', fontSize: 14, margin: 0, fontWeight: 600 }}>
          ≈ {d.prizeLocal.toFixed(0)} {currency}
        </p>
      </div>

      {/* Date */}
      <p style={{ color: '#6b7280', fontSize: 11, textAlign: 'center', margin: 0 }}>
        {d.contestDate}
      </p>
    </div>
  );
}

function ParticipantVisualCard({ d, isRTL }: { d: ParticipantCardData; isRTL: boolean }) {
  const flag = getCountryFlag(d.country);
  const location = [d.city, d.country].filter(Boolean).join('، ');
  const _ = isRTL; // used implicitly via strings

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0f1f3d 0%, #1a3660 50%, #0f1f3d 100%)',
        borderRadius: 20,
        padding: 28,
        width: 340,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        direction: 'rtl',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: -40, left: -40,
        width: 160, height: 160,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span style={{ color: '#60a5fa', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          WeNova
        </span>
        <span style={{
          background: 'rgba(255,255,255,0.08)',
          color: '#93c5fd',
          fontSize: 11,
          padding: '3px 10px',
          borderRadius: 20,
          border: '1px solid rgba(147,197,253,0.2)',
        }}>
          مشاركة رسمية
        </span>
      </div>

      {/* Icon */}
      <div style={{ textAlign: 'center', fontSize: 44, marginBottom: 10 }}>
        💪
      </div>

      {/* Name + location */}
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <p style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>
          {d.name}
        </p>
        <p style={{ color: '#93c5fd', fontSize: 12, margin: 0 }}>
          {flag} {location}
        </p>
      </div>

      {/* Stats box */}
      <div style={{
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(147,197,253,0.2)',
        borderRadius: 14,
        padding: '14px 18px',
        textAlign: 'center',
        marginBottom: 12,
      }}>
        <p style={{ color: '#93c5fd', fontSize: 12, margin: '0 0 6px', fontWeight: 600 }}>
          شاركت اليوم
        </p>
        <p style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: '0 0 2px' }}>
          المركز {d.rank} من {d.totalParticipants}
        </p>
        <p style={{ color: '#60a5fa', fontSize: 12, margin: 0 }}>
          مشترك
        </p>
      </div>

      {/* Encouragement */}
      <div style={{
        background: 'rgba(59,130,246,0.12)',
        borderRadius: 10,
        padding: '8px 14px',
        textAlign: 'center',
        marginBottom: 14,
      }}>
        <p style={{ color: '#bfdbfe', fontSize: 13, margin: 0, fontWeight: 600 }}>
          كنت قريب — المرة الجاية أقرب 💪
        </p>
      </div>

      <p style={{ color: '#4b5563', fontSize: 11, textAlign: 'center', margin: 0 }}>
        {d.contestDate}
      </p>
    </div>
  );
}

function SpectatorVisualCard({ d, isRTL }: { d: SpectatorCardData; isRTL: boolean }) {
  const currency = isRTL ? d.currencySymbolAr : d.currencySymbolEn;
  const _ = isRTL;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1a0d00 0%, #3d1a00 50%, #1a0d00 100%)',
        borderRadius: 20,
        padding: 28,
        width: 340,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        direction: 'rtl',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: -50, right: -50,
        width: 180, height: 180,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,146,60,0.3) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <span style={{ color: '#fb923c', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          WeNova
        </span>
      </div>

      {/* Icon */}
      <div style={{ textAlign: 'center', fontSize: 44, marginBottom: 12 }}>
        👀
      </div>

      {/* Main message */}
      <div style={{
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.5 }}>
          اليوم {d.totalParticipants} شخص
        </p>
        <p style={{ color: '#fed7aa', fontSize: 14, margin: '0 0 4px' }}>
          تنافسوا على
        </p>
        <p style={{ color: '#fb923c', fontSize: 26, fontWeight: 900, margin: 0 }}>
          {d.prizeLocal.toFixed(0)} {currency} 🔥
        </p>
      </div>

      {/* FOMO box */}
      <div style={{
        background: 'rgba(251,146,60,0.12)',
        border: '1px solid rgba(251,146,60,0.25)',
        borderRadius: 12,
        padding: '12px 16px',
        textAlign: 'center',
        marginBottom: 14,
      }}>
        <p style={{ color: '#fed7aa', fontSize: 14, margin: 0, fontWeight: 700 }}>
          أنت كنت ممكن تكون فيهم 👀
        </p>
      </div>

      <p style={{ color: '#4b5563', fontSize: 11, textAlign: 'center', margin: 0 }}>
        {d.contestDate}
      </p>
    </div>
  );
}

// ─── Share buttons ────────────────────────────────────────────────────────────

async function shareToInstagram(
  cardEl: HTMLElement,
  filename: string,
  showSuccess: (msg: string) => void,
  showError: (msg: string) => void,
  isRTL: boolean
) {
  const blob = await captureCard(cardEl);
  if (!blob) {
    showError(isRTL ? 'فشل توليد الصورة' : 'Failed to generate image');
    return;
  }

  // Try native share with file (works on Android/iOS Chrome)
  if (navigator.canShare?.({ files: [new File([blob], filename, { type: 'image/png' })] })) {
    try {
      await navigator.share({
        files: [new File([blob], filename, { type: 'image/png' })],
        title: 'WeNova',
      });
      return;
    } catch {
      // User cancelled or not supported — fall through to download
    }
  }

  // Fallback: download + prompt to share
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showSuccess(
    isRTL
      ? 'تم حفظ البطاقة — شاركها من إنستغرام 📸'
      : 'Card saved — share it from Instagram 📸'
  );
  window.open('https://www.instagram.com', '_blank');
}

async function downloadCard(
  cardEl: HTMLElement,
  filename: string,
  showSuccess: (msg: string) => void,
  showError: (msg: string) => void,
  isRTL: boolean
) {
  const blob = await captureCard(cardEl);
  if (!blob) {
    showError(isRTL ? 'فشل توليد الصورة' : 'Failed to generate image');
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showSuccess(isRTL ? 'تم حفظ البطاقة ✅' : 'Card saved ✅');
}

// ─── WhatsApp text builders ───────────────────────────────────────────────────

function buildWhatsAppText(data: ContestShareCardData, origin: string): string {
  const link = `${origin}/contests`;
  if (data.type === 'winner') {
    return encodeURIComponent(
      `🏆 فزت في مسابقة WeNova!\n` +
      `الجائزة: ${data.prizeNova} Nova ≈ ${data.prizeLocal.toFixed(0)} ${data.currencySymbolAr}\n` +
      `${data.contestDate}\n${link}`
    );
  }
  if (data.type === 'participant') {
    return encodeURIComponent(
      `💪 شاركت في مسابقة WeNova اليوم!\n` +
      `وصلت للمركز ${data.rank} من ${data.totalParticipants} مشترك\n` +
      `كنت قريب — المرة الجاية أقرب 🔥\n${link}`
    );
  }
  // spectator
  return encodeURIComponent(
    `🔥 اليوم ${data.totalParticipants} شخص تنافسوا على ${data.prizeLocal.toFixed(0)} ${data.currencySymbolAr} في WeNova!\n` +
    `أنت كنت ممكن تكون فيهم 👀\nانضم الحين: ${link}`
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface ContestShareCardProps {
  data: ContestShareCardData;
  className?: string;
}

export function ContestShareCard({ data, className }: ContestShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar';

  const filename = `wenova-${data.type}-${Date.now()}.png`;
  const waText = buildWhatsAppText(data, window.location.origin);
  const waLink = `https://wa.me/?text=${waText}`;

  const handleInstagram = () => {
    if (!cardRef.current) return;
    shareToInstagram(cardRef.current, filename, showSuccess, showError, isRTL);
  };

  const handleDownload = () => {
    if (!cardRef.current) return;
    downloadCard(cardRef.current, filename, showSuccess, showError, isRTL);
  };

  return (
    <div className={className}>
      {/* Visual card (captured by html2canvas) */}
      <div ref={cardRef} className="inline-block">
        {data.type === 'winner' && <WinnerVisualCard d={data} isRTL={isRTL} />}
        {data.type === 'participant' && <ParticipantVisualCard d={data} isRTL={isRTL} />}
        {data.type === 'spectator' && <SpectatorVisualCard d={data} isRTL={isRTL} />}
      </div>

      {/* Share buttons */}
      <div className="flex gap-2 mt-3 justify-center">
        {/* WhatsApp */}
        <Button
          size="sm"
          className="bg-[#25D366] hover:bg-[#1ebe5d] text-white gap-1.5"
          asChild
        >
          <a href={waLink} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            {isRTL ? 'واتساب' : 'WhatsApp'}
          </a>
        </Button>

        {/* Instagram */}
        <Button
          size="sm"
          className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white gap-1.5 border-0"
          onClick={handleInstagram}
        >
          <Instagram className="h-4 w-4" />
          {isRTL ? 'إنستغرام' : 'Instagram'}
        </Button>

        {/* Download */}
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Spectator CTA */}
      {data.type === 'spectator' && (
        <div className="mt-3 text-center">
          <Button asChild className="w-full max-w-[340px]">
            <Link to="/contests">
              🏆 {isRTL ? 'اشترك الحين' : 'Join Now'}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

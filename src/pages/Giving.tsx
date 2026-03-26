/**
 * Giving Page — Browse needy families and donate Nova to support them.
 * Features: Country trends, Favorites (localStorage), filter tabs
 */
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Users, MapPin, Star, TrendingUp, Bookmark, BookmarkCheck, X, CheckCircle2, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useBanner } from '@/contexts/BannerContext';
import { useGiving, SUPPORT_AMOUNTS, type Family, type SupportAmount } from '@/hooks/useGiving';
import { PINVerifyDialog } from '@/components/security/PINVerifyDialog';

function NeedBar({ score }: { score: number }) {
  const color =
    score >= 90 ? 'bg-red-500' : score >= 70 ? 'bg-orange-400' : 'bg-yellow-400';
  return (
    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
}

function FamilyCard({
  family,
  isRTL,
  isFav,
  onSelect,
  onToggleFav,
}: {
  family: Family;
  isRTL: boolean;
  isFav: boolean;
  onSelect: (f: Family) => void;
  onToggleFav: (id: string) => void;
}) {
  const { t } = useTranslation();
  const cover = family.media?.[0]?.url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => onSelect(family)}
      >
        {cover && (
          <div className="relative h-44 bg-muted overflow-hidden">
            <img
              src={cover}
              alt={family.head_name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 start-3 end-3">
              <p className="text-white font-bold text-base leading-tight">{family.head_name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-white/80" />
                <span className="text-white/80 text-xs">{family.city}, {family.country}</span>
              </div>
            </div>
            {/* Need score badge */}
            <div className="absolute top-2 end-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {family.need_score}%
            </div>
            {/* Favorite button */}
            <button
              className="absolute top-2 start-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm transition-colors hover:bg-black/60"
              onClick={(e) => { e.stopPropagation(); onToggleFav(family.id); }}
            >
              {isFav
                ? <BookmarkCheck className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                : <Bookmark className="h-4 w-4 text-white" />}
            </button>
          </div>
        )}

        <CardContent className="p-4 space-y-3">
          {!cover && (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-base">{family.head_name}</p>
                <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="text-xs">{family.city}, {family.country}</span>
                </div>
              </div>
              {/* Favorite button (no-cover variant) */}
              <button
                className="p-1.5 rounded-full bg-muted transition-colors hover:bg-muted/70"
                onClick={(e) => { e.stopPropagation(); onToggleFav(family.id); }}
              >
                {isFav
                  ? <BookmarkCheck className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  : <Bookmark className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          )}

          <p className="text-sm text-muted-foreground line-clamp-2">{family.story}</p>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('giving.needScore')}</span>
              <span className="font-semibold text-foreground">{family.need_score}/100</span>
            </div>
            <NeedBar score={family.need_score} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>{family.members_count} {t('giving.members')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-500" />
                <span>{family.total_received} Nova</span>
              </div>
            </div>
            <Button size="sm" variant="default" className="gap-1.5" onClick={(e) => { e.stopPropagation(); onSelect(family); }}>
              <Heart className="h-3.5 w-3.5" />
              {t('giving.supportNow')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Country trend row
function CountryTrendRow({ country, novaTotal, rank }: { country: string; novaTotal: number; rank: number }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-7 text-center shrink-0 text-base">{medal}</span>
      <span className="flex-1 font-medium">{country}</span>
      <span className="text-xs text-nova font-bold">{novaTotal.toLocaleString()} Nova</span>
    </div>
  );
}

export default function GivingPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const { families, loading, supporting, favorites, fetchFamilies, supportFamily, toggleFavorite } = useGiving();

  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<SupportAmount>(5);
  const [done, setDone] = useState(false);
  const [tab, setTab] = useState<'all' | 'favorites'>('all');
  const [pinOpen, setPinOpen] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  // Country trends: sum total_received per country, top 5
  const countryTrends = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of families) {
      if (f.country) map.set(f.country, (map.get(f.country) ?? 0) + f.total_received);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, novaTotal], i) => ({ country, novaTotal, rank: i + 1 }));
  }, [families]);

  const displayed = tab === 'favorites'
    ? families.filter((f) => favorites.has(f.id))
    : families;

  const executeSupport = async () => {
    if (!selectedFamily) return;
    const result = await supportFamily(selectedFamily.id, selectedAmount);
    if (result.success) {
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setSelectedFamily(null);
      }, 2000);
      showSuccess(t('giving.thankYou'));
    } else {
      showError(result.error || t('common.error'));
    }
  };

  const handleSupport = () => {
    if (!selectedFamily) return;
    setPinOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <InnerPageHeader title={t('giving.title')} />

      <div className="px-4 pt-4 space-y-4">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-5 text-white text-center shadow-md">
          <Heart className="h-8 w-8 mx-auto mb-2 fill-white" />
          <p className="font-bold text-lg">{t('giving.title')}</p>
          <Link
            to="/giving/register"
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            {isRTL ? 'تسجيل عائلة محتاجة' : 'Register a Family in Need'}
          </Link>
          <p className="text-sm text-white/80 mt-1">{t('giving.subtitle')}</p>
        </div>

        {/* Country Trends */}
        {!loading && countryTrends.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-rose-500" />
                  <p className="font-bold text-sm">
                    {isRTL ? 'أكثر الدول تبرعاً' : 'Top Giving Countries'}
                  </p>
                </div>
                <div className="space-y-2">
                  {countryTrends.map((c) => (
                    <CountryTrendRow key={c.country} {...c} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('all')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border bg-card hover:bg-muted'
            }`}
          >
            {isRTL ? 'الكل' : 'All'}
          </button>
          <button
            onClick={() => setTab('favorites')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'favorites'
                ? 'bg-yellow-500 text-white border-yellow-500'
                : 'border-border bg-card hover:bg-muted'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            {isRTL ? 'المفضلة' : 'Favorites'}
            {favorites.size > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                tab === 'favorites' ? 'bg-white/20' : 'bg-yellow-500/15 text-yellow-600'
              }`}>
                {favorites.size}
              </span>
            )}
          </button>
        </div>

        {/* Families List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-muted animate-pulse h-48" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{tab === 'favorites' ? (isRTL ? 'لا توجد عائلات مفضلة بعد' : 'No favorites yet') : t('giving.noFamilies')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map((family) => (
              <FamilyCard
                key={family.id}
                family={family}
                isRTL={isRTL}
                isFav={favorites.has(family.id)}
                onSelect={setSelectedFamily}
                onToggleFav={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      {/* Support Dialog */}
      <Dialog open={!!selectedFamily} onOpenChange={(open) => { if (!open) { setSelectedFamily(null); setDone(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              {t('giving.support')}
            </DialogTitle>
            {selectedFamily && (
              <DialogDescription>
                {selectedFamily.head_name} — {selectedFamily.city}
              </DialogDescription>
            )}
          </DialogHeader>

          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-3 py-6 text-center"
              >
                <CheckCircle2 className="h-14 w-14 text-green-500" />
                <p className="font-semibold text-base">{t('giving.thankYou')}</p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {selectedFamily && (
                  <div className="space-y-4">
                    {/* Family photo strip */}
                    {(selectedFamily.media?.length ?? 0) > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {selectedFamily.media!.slice(0, 3).map((m) => (
                          <img
                            key={m.id}
                            src={m.url}
                            alt=""
                            className="h-20 w-28 object-cover rounded-lg flex-shrink-0"
                          />
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground">{selectedFamily.story}</p>

                    <div>
                      <p className="text-sm font-medium mb-2">{t('giving.chooseAmount')}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {SUPPORT_AMOUNTS.map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setSelectedAmount(amt)}
                            className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                              selectedAmount === amt
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-card text-foreground hover:border-primary/50'
                            }`}
                          >
                            {amt}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-center">Nova</p>
                    </div>

                    <Button
                      className="w-full gap-2"
                      onClick={handleSupport}
                      disabled={supporting}
                    >
                      <Heart className="h-4 w-4" />
                      {t('giving.confirm')} {selectedAmount} Nova
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      <PINVerifyDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        onVerified={executeSupport}
        actionLabel={`Donate ${selectedAmount} Nova`}
        actionLabelAr={`تبرع بـ ${selectedAmount} Nova`}
      />

      <BottomNav />
    </div>
  );
}

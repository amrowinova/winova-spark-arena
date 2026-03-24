/**
 * Giving Page — Browse needy families and donate Nova to support them.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Users, MapPin, Star, ChevronRight, X, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  onSelect,
}: {
  family: Family;
  isRTL: boolean;
  onSelect: (f: Family) => void;
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
          </div>
        )}

        <CardContent className="p-4 space-y-3">
          {!cover && (
            <div>
              <p className="font-bold text-base">{family.head_name}</p>
              <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="text-xs">{family.city}, {family.country}</span>
              </div>
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

export default function GivingPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const { families, loading, supporting, fetchFamilies, supportFamily } = useGiving();

  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<SupportAmount>(5);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const handleSupport = async () => {
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <InnerPageHeader title={t('giving.title')} />

      <div className="px-4 pt-4 space-y-4">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-5 text-white text-center shadow-md">
          <Heart className="h-8 w-8 mx-auto mb-2 fill-white" />
          <p className="font-bold text-lg">{t('giving.title')}</p>
          <p className="text-sm text-white/80 mt-1">{t('giving.subtitle')}</p>
        </div>

        {/* Families List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-muted animate-pulse h-48" />
            ))}
          </div>
        ) : families.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t('giving.noFamilies')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {families.map((family) => (
              <FamilyCard
                key={family.id}
                family={family}
                isRTL={isRTL}
                onSelect={setSelectedFamily}
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

      <BottomNav />
    </div>
  );
}

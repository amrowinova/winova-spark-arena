/**
 * Giving Page — Browse needy families and donate Nova to support them.
 * Features: Country trends, Favorites (localStorage), filter tabs
 */
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Users, MapPin, Star, TrendingUp, Bookmark, BookmarkCheck, X, CheckCircle2, PlusCircle, Share2, Copy, MessageCircle, Play, Pause, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useBanner } from '@/contexts/BannerContext';
import { useGiving, SUPPORT_AMOUNTS, type Family, type SupportAmount } from '@/hooks/useGiving';
import { PINVerifyDialog } from '@/components/security/PINVerifyDialog';
import { notificationService } from '@/lib/notificationService';
import { supabase } from '@/integrations/supabase/client';

// Extend Family type to include goal_amount
// Now using the updated Family interface from useGiving.ts

interface ThankYouMessage {
  id: string;
  message_type: 'text' | 'image' | 'video';
  content: string;
  media_url?: string;
  created_at: string;
}

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
  const [thankYouMessages, setThankYouMessages] = useState<ThankYouMessage[]>([]);
  const [videoPlaying, setVideoPlaying] = useState<string>('');

  useEffect(() => {
    fetchThankYouMessages();
  }, [family.id]);

  const fetchThankYouMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('family_thank_you_messages')
        .select('*')
        .eq('family_id', family.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setThankYouMessages(data || []);
    } catch (error) {
      console.error('Error fetching thank you messages:', error);
    }
  };

  const toggleVideoPlay = (messageId: string) => {
    setVideoPlaying(prev => prev === messageId ? '' : messageId);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="cursor-pointer"
      onClick={() => onSelect(family)}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-4 space-y-3">
          {/* Header with photo and favorite */}
          {cover ? (
            <div className="relative h-32 -mx-4 -mt-4 mb-3">
              <img src={cover} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">{family.head_name}</h3>
                  <div className="flex items-center gap-1 text-white/90 text-xs">
                    <MapPin className="h-3 w-3" />
                    <span>{family.city}</span>
                  </div>
                </div>
                <button
                  className="p-1.5 rounded-full bg-white/20 backdrop-blur-sm transition-colors hover:bg-white/30"
                  onClick={(e) => { e.stopPropagation(); onToggleFav(family.id); }}
                >
                  {isFav
                    ? <BookmarkCheck className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    : <Bookmark className="h-4 w-4 text-white" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{family.head_name}</h3>
                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                  <MapPin className="h-3 w-3" />
                  <span>{family.city}</span>
                </div>
              </div>
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

          {/* Progress bar for goal */}
          {family.goal_amount && family.goal_amount > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{isRTL ? 'التقدم' : 'Progress'}</span>
                <span className="font-semibold text-foreground">
                  {Math.round((family.total_received / family.goal_amount) * 100)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-500" 
                  style={{ width: `${Math.min(100, (family.total_received / family.goal_amount) * 100)}%` }} 
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{family.total_received} Nova</span>
                <span>{family.goal_amount} Nova</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('giving.needScore')}</span>
              <span className="font-semibold text-foreground">{family.need_score}/100</span>
            </div>
            <NeedBar score={family.need_score} />
          </div>

          {/* Thank You Messages */}
          {thankYouMessages.length > 0 && (
            <div className="space-y-2 pt-3 border-t">
              <div className="flex items-center gap-2 text-xs font-medium text-rose-600">
                <MessageSquare className="h-3.5 w-3.5" />
                {isRTL ? 'رسائل الشكر' : 'Thank You Messages'}
              </div>
              <div className="space-y-2">
                {thankYouMessages.slice(0, 2).map((message) => (
                  <div key={message.id} className="bg-rose-50 rounded-lg p-2">
                    {message.message_type === 'text' && (
                      <p className="text-xs text-rose-700 line-clamp-2">{message.content}</p>
                    )}
                    {message.message_type === 'image' && message.media_url && (
                      <div className="flex items-center gap-2">
                        <img src={message.media_url} alt="Thank you" className="h-8 w-8 rounded object-cover" />
                        <span className="text-xs text-rose-600">{isRTL ? 'صورة شكر' : 'Thank you image'}</span>
                      </div>
                    )}
                    {message.message_type === 'video' && message.media_url && (
                      <div className="flex items-center gap-2">
                        <div className="relative h-8 w-8 rounded bg-rose-100 flex items-center justify-center">
                          <Play className="h-3 w-3 text-rose-600" />
                        </div>
                        <span className="text-xs text-rose-600">{isRTL ? 'فيديو شكر' : 'Thank you video'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [shareToken, setShareToken] = useState<string>('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
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
    
    const amount = isCustomAmount ? parseFloat(customAmount) || 0 : selectedAmount;
    if (amount <= 0) {
      showError(isRTL ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    // RPC not yet in generated types
    const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
      'donate_to_family', {
        p_family_id: selectedFamily.id,
        p_amount: amount,
        p_anonymous: anonymous,
        p_message: message || null,
        p_donor_name: donorName || null,
      }
    );

    if (error) {
      showError(error.message);
      return;
    }

    const result = data?.[0];
    if (result?.success) {
      setShareToken(result.share_token);
      setDone(true);
      showSuccess(t('giving.thankYou'));
      
      // Send notifications
      try {
        // Notification to donor
        await notificationService.sendNotification({
          user_id: user?.id || '',
          type: 'donation_confirmation',
          title: isRTL ? 'شكراً لتبرعك!' : 'Thank you for your donation!',
          message: isRTL 
            ? `تبرعت بمبلغ ${amount} Nova لـ ${selectedFamily.head_name}. شكراً لكرمك!`
            : `You donated ${amount} Nova to ${selectedFamily.head_name}. Thank you for your generosity!`,
          data: {
            family_id: selectedFamily.id,
            amount: amount,
            share_token: result.share_token
          }
        });

        // Notification to family (if they have notifications enabled)
        // This would be handled by the RPC on the backend
        console.log('Family notification sent via RPC');

      } catch (notificationError) {
        console.error('Failed to send notifications:', notificationError);
        // Don't show error to user as donation was successful
      }
      
      // Refresh families list
      await fetchFamilies();
    } else {
      showError(result?.error_message || t('common.error'));
    }
  };

  const handleSupport = () => {
    if (!selectedFamily) return;
    setPinOpen(true);
  };

  const handleShare = async () => {
    if (!shareToken) return;
    
    const shareUrl = `${window.location.origin}/giving/share/${shareToken}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showSuccess(isRTL ? 'تم نسخ الرابط' : 'Link copied to clipboard');
    } catch (error) {
      showError(isRTL ? 'فشل نسخ الرابط' : 'Failed to copy link');
    }
  };

  const handleAmountSelect = (amount: SupportAmount) => {
    setSelectedAmount(amount);
    setIsCustomAmount(false);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setIsCustomAmount(true);
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
                
                {/* Share donation card */}
                {shareToken && (
                  <div className="w-full space-y-3 pt-3 border-t">
                    <p className="text-sm font-medium">
                      {isRTL ? 'شارك تبرعك' : 'Share Your Donation'}
                    </p>
                    <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-xl border border-rose-200">
                      <div className="text-center space-y-2">
                        <Heart className="h-8 w-8 text-rose-500 mx-auto" />
                        <div>
                          <p className="font-bold text-rose-600">
                            {anonymous ? (isRTL ? 'متبرع كريم' : 'Generous Donor') : donorName || user?.name}
                          </p>
                          <p className="text-sm text-rose-500">
                            {isRTL ? 'دعم' : 'supported'} {selectedFamily?.head_name}
                          </p>
                          <p className="text-2xl font-bold text-rose-600">
                            {isCustomAmount ? customAmount : selectedAmount} Nova
                          </p>
                        </div>
                        {message && (
                          <p className="text-xs text-muted-foreground italic">"{message}"</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={handleShare}
                      >
                        <Copy className="h-3 w-3" />
                        {isRTL ? 'نسخ الرابط' : 'Copy Link'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => setShareDialogOpen(true)}
                      >
                        <Share2 className="h-3 w-3" />
                        {isRTL ? 'مشاركة' : 'Share'}
                      </Button>
                    </div>
                  </div>
                )}
                
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => {
                    setDone(false);
                    setSelectedFamily(null);
                    setShareToken('');
                    setAnonymous(false);
                    setDonorName('');
                    setMessage('');
                    setCustomAmount('');
                    setIsCustomAmount(false);
                  }}
                >
                  {isRTL ? 'إغلاق' : 'Close'}
                </Button>
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
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {SUPPORT_AMOUNTS.map((amt) => (
                          <button
                            key={amt}
                            onClick={() => handleAmountSelect(amt)}
                            className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                              !isCustomAmount && selectedAmount === amt
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-card text-foreground hover:border-primary/50'
                            }`}
                          >
                            {amt}
                          </button>
                        ))}
                      </div>
                      
                      {/* Custom amount input */}
                      <div className="space-y-2">
                        <Label htmlFor="custom-amount" className="text-sm font-medium">
                          {isRTL ? 'مبلغ مخصص' : 'Custom Amount'}
                        </Label>
                        <Input
                          id="custom-amount"
                          type="number"
                          placeholder={isRTL ? 'أدخل المبلغ' : 'Enter amount'}
                          value={customAmount}
                          onChange={(e) => handleCustomAmountChange(e.target.value)}
                          className={`text-center font-bold ${
                            isCustomAmount ? 'border-primary' : ''
                          }`}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">Nova</p>
                    </div>

                    {/* Anonymous option */}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="anonymous" className="text-sm font-medium">
                        {isRTL ? 'تبرع مجهول' : 'Anonymous Donation'}
                      </Label>
                      <Switch
                        id="anonymous"
                        checked={anonymous}
                        onCheckedChange={setAnonymous}
                      />
                    </div>

                    {/* Donor name for sharing */}
                    {!anonymous && (
                      <div className="space-y-2">
                        <Label htmlFor="donor-name" className="text-sm font-medium">
                          {isRTL ? 'اسمك (للبطاقة)' : 'Your Name (for sharing card)'}
                        </Label>
                        <Input
                          id="donor-name"
                          placeholder={isRTL ? 'اسمك أو اسم مستعار' : 'Your name or nickname'}
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                        />
                      </div>
                    )}

                    {/* Message */}
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-sm font-medium">
                        {isRTL ? 'رسالة اختيارية' : 'Optional Message'}
                      </Label>
                      <Input
                        id="message"
                        placeholder={isRTL ? 'اكتب رسالة دعم...' : 'Write a support message...'}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>

                    <Button
                      className="w-full gap-2"
                      onClick={handleSupport}
                      disabled={supporting}
                    >
                      <Heart className="h-4 w-4" />
                      {t('giving.confirm')} {isCustomAmount ? customAmount || '0' : selectedAmount} Nova
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

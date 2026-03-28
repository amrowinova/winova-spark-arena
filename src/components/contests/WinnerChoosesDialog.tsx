import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trophy, X, Share2, CheckCircle2, Sparkles, Users, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useBanner } from '@/contexts/BannerContext';
import { useGiving } from '@/hooks/useGiving';
import { supabase } from '@/integrations/supabase/client';

interface WinnerChoosesDialogProps {
  open: boolean;
  onClose: () => void;
  contestId: string;
  prizeAmount: number;
  contestTitle: string;
}

export function WinnerChoosesDialog({
  open,
  onClose,
  contestId,
  prizeAmount,
  contestTitle
}: WinnerChoosesDialogProps) {
  const { language } = useLanguage();
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useBanner();
  const { families } = useGiving();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [donationPercentage, setDonationPercentage] = useState<number>(10);
  const [donating, setDonating] = useState(false);
  const [shareToken, setShareToken] = useState<string>('');
  const [showShareCard, setShowShareCard] = useState(false);
  const [donationResult, setDonationResult] = useState<any>(null);

  const donationAmount = (prizeAmount * donationPercentage) / 100;

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setSelectedFamily('');
      setDonationPercentage(10);
      setShareToken('');
      setShowShareCard(false);
      setDonationResult(null);
    }
  }, [open]);

  const handleDonate = async () => {
    if (!selectedFamily) {
      showError(isRTL ? 'يرجى اختيار عائلة' : 'Please select a family');
      return;
    }

    const pct = Number(donationPercentage);
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
      showError(isRTL ? 'نسبة التبرع يجب أن تكون بين 1% و100%' : 'Donation percentage must be between 1% and 100%');
      return;
    }

    setDonating(true);
    try {
      // RPC not yet in generated types
      const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
        'winner_donate_to_family', {
          p_contest_id: contestId,
          p_family_id: selectedFamily,
          p_donation_percentage: donationPercentage,
        }
      );

      if (error) {
        showError(error.message);
        return;
      }

      const result = data?.[0];
      if (result?.success) {
        setDonationResult(result);
        setShareToken(result.share_token);
        setShowShareCard(true);
        showSuccess(isRTL ? 'شكراً لكرمك!' : 'Thank you for your generosity!');
      } else {
        showError(result?.error_message || (isRTL ? 'فشل التبرع' : 'Donation failed'));
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : (isRTL ? 'فشل التبرع' : 'Donation failed'));
    } finally {
      setDonating(false);
    }
  };

  const handleShare = async () => {
    if (!shareToken) return;

    const shareUrl = `${window.location.origin}/giving/share/${shareToken}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      showSuccess(isRTL ? 'تم نسخ الرابط' : 'Link copied to clipboard');
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccess(isRTL ? 'تم نسخ الرابط' : 'Link copied to clipboard');
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <span>{isRTL ? 'الفائز يختار' : 'Winner Chooses'}</span>
          </DialogTitle>
          <DialogDescription>
            {isRTL 
              ? 'مبروك فوزك! اختر عائلة لتتبرع بجزء من جائزتك' 
              : 'Congratulations on your win! Choose a family to donate part of your prize'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!showShareCard ? (
            <motion.div
              key="donation-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Contest Info */}
              <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-yellow-800">{contestTitle}</h3>
                      <p className="text-sm text-yellow-600">
                        {isRTL ? 'جائزتك:' : 'Your Prize:'} {prizeAmount} Nova
                      </p>
                    </div>
                    <Trophy className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Donation Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Heart className="h-5 w-5 text-rose-500" />
                  {isRTL ? 'إعدادات التبرع' : 'Donation Settings'}
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="percentage">
                      {isRTL ? 'نسبة التبرع' : 'Donation Percentage'}
                    </Label>
                    <Input
                      id="percentage"
                      type="number"
                      min="1"
                      max="100"
                      value={donationPercentage}
                      onChange={(e) => setDonationPercentage(Number(e.target.value))}
                      className="text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {isRTL ? 'مبلغ التبرع' : 'Donation Amount'}
                    </Label>
                    <div className="px-3 py-2 bg-muted rounded-md text-center font-semibold">
                      {donationAmount} Nova
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {[10, 15, 20, 25].map((percent) => (
                    <Button
                      key={percent}
                      variant={donationPercentage === percent ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDonationPercentage(percent)}
                      className="flex-1"
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* Family Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  {isRTL ? 'اختر العائلة' : 'Choose Family'}
                </h3>

                <div className="grid gap-3 max-h-64 overflow-y-auto">
                  {families.filter(f => f.status === 'active').map((family) => (
                    <Card
                      key={family.id}
                      className={`cursor-pointer transition-all ${
                        selectedFamily === family.id
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedFamily(family.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{family.head_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {family.members_count} {isRTL ? 'أفراد' : 'members'} • {family.country}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Target className="h-3 w-3 text-rose-500" />
                              <span className="text-xs text-rose-600">
                                {family.need_score}/100 {isRTL ? 'احتياج' : 'need'}
                              </span>
                            </div>
                          </div>
                          {family.media?.[0]?.url && (
                            <img
                              src={family.media[0].url}
                              alt={family.head_name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleDonate}
                  disabled={!selectedFamily || donating}
                  className="flex-1 gap-2"
                >
                  <Heart className="h-4 w-4" />
                  {donating 
                    ? (isRTL ? 'جاري التبرع...' : 'Donating...')
                    : (isRTL ? 'تبرع الآن' : 'Donate Now')
                  }
                </Button>
                <Button variant="outline" onClick={onClose}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="share-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-6"
            >
              {/* Success Message */}
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-green-800 mb-2">
                    {isRTL ? 'شكراً لكرمك!' : 'Thank you for your generosity!'}
                  </h3>
                  <p className="text-green-600">
                    {isRTL 
                      ? `تبرعت بمبلغ ${donationAmount} Nova (${donationPercentage}%) من جائزتك. ستحدث فرقاً حقيقياً في حياة هذه العائلة.`
                      : `You donated ${donationAmount} Nova (${donationPercentage}% of your prize). This will make a real difference in this family's life.`
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Share Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Sparkles className="h-5 w-5 text-yellow-500" />
                      <h4 className="font-semibold">
                        {isRTL ? 'شارك كرمك' : 'Share Your Generosity'}
                      </h4>
                      <Sparkles className="h-5 w-5 text-yellow-500" />
                    </div>

                    <div className="bg-gradient-to-r from-rose-100 to-pink-100 rounded-lg p-4 border border-rose-200">
                      <p className="text-sm text-rose-800 font-medium mb-2">
                        {isRTL ? 'فائز مسابقة يتبرع بكرمه!' : 'Contest winner donates with generosity!'}
                      </p>
                      <p className="text-xs text-rose-600">
                        {isRTL 
                          ? `تبرعت بمبلغ ${donationAmount} Nova لعائلة محتاجة من جائزتي في مسابقة ${contestTitle}`
                          : `I donated ${donationAmount} Nova to a needy family from my prize in the ${contestTitle} contest`
                        }
                      </p>
                    </div>

                    <Button
                      onClick={handleShare}
                      className="w-full gap-2"
                      variant="outline"
                    >
                      <Share2 className="h-4 w-4" />
                      {isRTL ? 'نسخ رابط المشاركة' : 'Copy Share Link'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Impact Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-blue-600">{donationAmount}</p>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'Nova تبرعت' : 'Nova Donated'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-green-600">{donationPercentage}%</p>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'من الجائزة' : 'Of Prize'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-rose-600">1</p>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'عائلة ساعدتها' : 'Family Helped'}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <Button onClick={onClose} className="w-full">
                {isRTL ? 'إغلاق' : 'Close'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

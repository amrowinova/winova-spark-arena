import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Users, TrendingUp, Share2, Copy, MessageCircle, Calendar, Award, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useBanner } from '@/contexts/BannerContext';
import { supabase } from '@/integrations/supabase/client';

interface DonationImpact {
  totalDonated: number;
  familiesSupported: number;
  shares: number;
  mealsFed: number;
  votesCast: number;
  recentDonations: Array<{
    amount: number;
    family_name: string;
    created_at: string;
    anonymous: boolean;
    share_token: string;
  }>;
}

export default function MyImpactPage() {
  const { language } = useLanguage();
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [impact, setImpact] = useState<DonationImpact | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string>('');

  useEffect(() => {
    fetchImpact();
  }, []);

  const fetchImpact = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // RPC not yet in generated types — cast to unknown first then to expected shape
      const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
        'get_user_donation_impact', { p_user_id: user.id }
      );

      if (error) throw error;

      const rows = data as Array<Record<string, unknown>>;
      const impactData = rows?.[0] ?? null;
      setImpact(impactData as typeof impact);

      // Generate share URL for total impact
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/giving/impact/${user.id}`);

    } catch (error) {
      console.error('Error fetching impact:', error);
      showError(isRTL ? 'فشل تحميل بيانات الأثر' : 'Failed to load impact data');
    } finally {
      setLoading(false);
    }
  };

  const handleShareImpact = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showSuccess(isRTL ? 'تم نسخ رابط الأثر' : 'Impact link copied');
    } catch (error) {
      showError(isRTL ? 'فشل نسخ الرابط' : 'Failed to copy link');
    }
  };

  const handleShareDonation = async (shareToken: string) => {
    const donationUrl = `${window.location.origin}/giving/share/${shareToken}`;
    try {
      await navigator.clipboard.writeText(donationUrl);
      showSuccess(isRTL ? 'تم نسخ رابط التبرع' : 'Donation link copied');
    } catch (error) {
      showError(isRTL ? 'فشل نسخ الرابط' : 'Failed to copy link');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <InnerPageHeader title={isRTL ? 'أثري الشخصي' : 'My Impact'} />
        <main className="flex-1 p-4 pb-20">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!impact) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <InnerPageHeader title={isRTL ? 'أثري الشخصي' : 'My Impact'} />
        <main className="flex-1 p-4 pb-20">
          <div className="text-center py-16">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-xl font-semibold mb-2">
              {isRTL ? 'ابدأ في إحداث تأثير' : 'Start Making an Impact'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {isRTL ? 'تبرع بالعائلات المحتاجة وتبع أثرك الإيجابي' : 'Donate to families in need and track your positive impact'}
            </p>
            <Link to="/giving">
              <Button className="gap-2">
                <Heart className="h-4 w-4" />
                {isRTL ? 'ابدأ التبرع' : 'Start Giving'}
              </Button>
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader title={isRTL ? 'أثري الشخصي' : 'My Impact'} />

      <main className="flex-1 p-4 space-y-6 pb-20">
        {/* Hero Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-rose-500 to-pink-600 p-6 rounded-2xl text-white shadow-lg"
        >
          <div className="text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 fill-white" />
            <h2 className="text-2xl font-bold mb-2">
              {isRTL ? 'أثرك الإيجابي' : 'Your Positive Impact'}
            </h2>
            <p className="text-white/80 mb-6">
              {isRTL ? 'كل تبرع يحدث فرقاً حقيقياً' : 'Every donation makes a real difference'}
            </p>
            
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p className="text-2xl font-bold">{impact.totalDonated}</p>
                <p className="text-xs text-white/80">Nova</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p className="text-2xl font-bold">{impact.familiesSupported}</p>
                <p className="text-xs text-white/80">
                  {isRTL ? 'عائلة' : 'Families'}
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p className="text-2xl font-bold">{impact.shares}</p>
                <p className="text-xs text-white/80">
                  {isRTL ? 'مشاركة' : 'Shares'}
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p className="text-2xl font-bold">{impact.mealsFed}</p>
                <p className="text-xs text-white/80">
                  {isRTL ? 'وجبة' : 'Meals'}
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              onClick={handleShareImpact}
            >
              <Share2 className="h-4 w-4 mr-2" />
              {isRTL ? 'مشاركة الأثر' : 'Share Impact'}
            </Button>
          </div>
        </motion.div>

        {/* Achievement Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                {isRTL ? 'الإنجازات' : 'Achievements'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {impact.totalDonated >= 100 && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    💛 {isRTL ? 'متبرع ذهبي' : 'Gold Donor'}
                  </Badge>
                )}
                {impact.familiesSupported >= 5 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    🤝 {isRTL ? 'داعم العائلات' : 'Family Supporter'}
                  </Badge>
                )}
                {impact.shares >= 3 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    📢 {isRTL ? 'ناشط اجتماعي' : 'Social Activist'}
                  </Badge>
                )}
                {impact.mealsFed >= 10 && (
                  <Badge variant="secondary" className="bg-rose-100 text-rose-800">
                    🍽️ {isRTL ? 'مطعم أطفال' : 'Child Feeder'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Donations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-rose-500" />
                {isRTL ? 'آخر التبرعات' : 'Recent Donations'}
              </h3>
              
              {impact.recentDonations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{isRTL ? 'لا توجد تبرعات بعد' : 'No donations yet'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {impact.recentDonations.map((donation, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 rounded-full">
                          <Heart className="h-4 w-4 text-rose-500" />
                        </div>
                        <div>
                          <p className="font-medium">{donation.family_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(donation.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-600">
                          {donation.amount} Nova
                        </span>
                        {donation.share_token && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleShareDonation(donation.share_token)}
                            >
                              <Share2 className="h-3 w-3" />
                            </Button>
                            <Link to={`/giving/share/${donation.share_token}`}>
                              <Button size="sm" variant="outline">
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link to="/giving">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Target className="h-12 w-12 mx-auto mb-3 text-rose-500" />
                <h3 className="font-semibold mb-2">
                  {isRTL ? 'واصل إحداث التأثير' : 'Continue Making an Impact'}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {isRTL ? 'اكتشف المزيد من العائلات التي تحتاج دعمك' : 'Discover more families that need your support'}
                </p>
                <Button className="w-full gap-2">
                  <Heart className="h-4 w-4" />
                  {isRTL ? 'تبرع الآن' : 'Donate Now'}
                </Button>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}

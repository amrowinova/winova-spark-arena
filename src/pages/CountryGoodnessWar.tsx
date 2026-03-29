import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Flag, Users, Heart, Target, AlertCircle, Crown } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useBanner } from '@/contexts/BannerContext';
import { supabase } from '@/integrations/supabase/client';

interface CountryStats {
  country_code: string;
  country_name: string;
  total_donations: number;
  total_votes: number;
  total_families_supported: number;
  weekly_rank: number;
  last_rank_update: string;
}

// Type for Supabase result
interface ResultOne {
  country_code: string;
  country_name: string;
  total_donations: number;
  total_votes: number;
  total_families_supported: number;
  weekly_rank: number;
  last_rank_update: string;
}

export default function CountryGoodnessWarPage() {
  const { language } = useLanguage();
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [countries, setCountries] = useState<CountryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [userCountry, setUserCountry] = useState<CountryStats | null>(null);

  useEffect(() => {
    fetchCountryStats();
    const interval = setInterval(fetchCountryStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchCountryStats = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('country_goodness_stats')
        .select('*')
        .order('weekly_rank', { ascending: true })
        .limit(20);

      if (error) throw error;

      const countryData = (data as ResultOne[] as CountryStats[]) || [];
      setCountries(countryData);
      setLastUpdated(new Date().toLocaleTimeString());

      // Find user's country
      if (user) {
        const userCountryData = countryData.find(c => 
          c.country_code === user.country
        );
        setUserCountry(userCountryData as CountryStats || null);
      }
    } catch (error) {
      console.error('Error fetching country stats:', error);
      showError(isRTL ? 'فشل تحميل إحصائيات الدول' : 'Failed to load country statistics');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Trophy className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Target className="h-4 w-4 text-orange-600" />;
    return <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{rank}</div>;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (rank === 2) return 'text-gray-600 bg-gray-50 border-gray-200';
    if (rank === 3) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-muted-foreground bg-muted border-border';
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US').format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <InnerPageHeader title={isRTL ? 'حرب الخير بين الدول' : 'Country Goodness War'} />
        <main className="flex-1 p-4 pb-20">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader title={isRTL ? 'حرب الخير بين الدول' : 'Country Goodness War'} />
      
      <main className="flex-1 px-4 py-4 pb-20 space-y-6">
        {/* User Country Card */}
        {userCountry && (
          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{userCountry.country_name}</div>
                  <Badge className="bg-blue-500 text-white">
                    #{userCountry.weekly_rank}
                  </Badge>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {isRTL ? 'دولتك' : 'Your country'}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatNumber(userCountry.total_donations)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isRTL ? 'Nova تبرعت' : 'Nova donated'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatNumber(userCountry.total_families_supported)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isRTL ? 'عائلة مدعومة' : 'Families supported'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatNumber(userCountry.total_votes)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isRTL ? 'أصوات' : 'Votes cast'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                {isRTL ? 'ترتيب الدول الخير' : 'Country Goodness Rankings'}
              </h3>
              <div className="text-sm text-muted-foreground">
                {isRTL ? `آخر تحديث: ${lastUpdated}` : `Last updated: ${lastUpdated}`}
              </div>
            </div>

            <div className="space-y-3">
              {countries.map((country, index) => (
                <motion.div
                  key={country.country_code}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    country.weekly_rank === 1 ? 'bg-yellow-50 border-yellow-200' :
                    country.weekly_rank === 2 ? 'bg-gray-50 border-gray-200' :
                    country.weekly_rank === 3 ? 'bg-orange-50 border-orange-200' :
                    'bg-muted border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getRankIcon(country.weekly_rank)}
                      <div>
                        <div className="font-semibold">{country.country_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {isRTL ? `#${country.weekly_rank} عالمياً` : `#${country.weekly_rank} globally`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {formatNumber(country.total_donations)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isRTL ? 'Nova' : 'Nova'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatNumber(country.total_families_supported)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isRTL ? 'عائلات' : 'Families'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">
                        {formatNumber(country.total_votes)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isRTL ? 'أصوات' : 'Votes'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {country.weekly_rank <= 3 && (
                      <Badge className={`${getRankColor(country.weekly_rank)} animate-pulse`}>
                        {country.weekly_rank === 1 && (isRTL ? '🏆 الفائز' : '🏆 Winner')}
                        {country.weekly_rank === 2 && (isRTL ? '🥈 الوصيف' : '🥈 Runner-up')}
                        {country.weekly_rank === 3 && (isRTL ? '🥉 المركز الثالث' : '🥉 Third place')}
                      </Badge>
                    )}
                    
                    {country.weekly_rank > 3 && country.weekly_rank <= 10 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {isRTL ? '🌟 أفضل 10' : '🌟 Top 10'}
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Prize Info */}
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-600" />
                <h3 className="text-lg font-bold text-yellow-800">
                  {isRTL ? 'جائزة أسبوعية' : 'Weekly Prize'}
                </h3>
              </div>
              <p className="text-yellow-700">
                {isRTL 
                  ? 'الدولة الفائزة أسبوعياً ستحصل على دعم 10 عائلات إضافية!'
                  : 'The winning country each week will get support for 10 additional families!'
                }
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Users className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-800 font-medium">
                  {isRTL ? '10 عائلات إضافية' : '10 additional families'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card>
          <CardContent className="p-4">
            <div className="text-center space-y-4">
              <Heart className="h-12 w-12 mx-auto mb-4 text-rose-500" />
              <h3 className="text-xl font-bold mb-2">
                {isRTL ? 'ساهم في فوز دولتك!' : 'Help your country win!'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isRTL 
                  ? 'كل تبرع وصوت يرفع من ترتيب دولتك في حرب الخير بين الدول'
                  : 'Every donation and vote raises your country in the Country Goodness War'
                }
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => window.location.href = '/giving'}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  {isRTL ? 'تبرع الآن' : 'Donate Now'}
                </Button>
                <Button 
                  onClick={() => window.location.href = '/contests'}
                  variant="outline"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  {isRTL ? 'صوت في المسابقة' : 'Vote in Contest'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}

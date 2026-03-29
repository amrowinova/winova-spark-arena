/**
 * AgentsPage - Completely rebuilt for simplicity and reliability
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, MapPin, Star, Shield, Phone, MessageSquare, 
  Filter, RefreshCw, Users, Store, PlusCircle, ArrowLeftRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBanner } from '@/contexts/BannerContext';
import { useUser } from '@/contexts/UserContext';
import { useAgents, type AgentProfile } from '@/hooks/useAgentsRebuilt';
import { ApplyAgentForm } from '@/components/agents/ApplyAgentForm';
import { cn } from '@/lib/utils';

export default function AgentsPage() {
  const { language } = useLanguage();
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useBanner();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const {
    agents, loading, error, myAgentProfile,
    countries, cities,
    getActiveAgents, getAllAgentsForAdmin, applyAsAgent,
    getMyAgentProfile, getCountries, getCities,
  } = useAgents();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('find');

  // Load initial data
  useEffect(() => {
    console.log('🚀 AgentsPage: Loading initial data...');
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        getMyAgentProfile(),
        getCountries(),
        getActiveAgents(),
      ]);
      console.log('✅ AgentsPage: Initial data loaded successfully');
    } catch (e) {
      console.error('❌ AgentsPage: Error loading initial data:', e);
    }
  };

  // Manual refresh
  const handleRefresh = async () => {
    console.log('🔄 AgentsPage: Manual refresh...');
    setRefreshing(true);
    try {
      await getActiveAgents();
      showSuccess(isRTL ? '✅ تم تحديث القائمة' : '✅ List refreshed');
    } catch (e) {
      console.error('❌ AgentsPage: Error refreshing:', e);
      showError(isRTL ? '❌ فشل التحديث' : '❌ Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = !searchQuery || 
      agent.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.country.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCountry = !selectedCountry || agent.country === selectedCountry;
    const matchesCity = !selectedCity || agent.city === selectedCity;
    
    return matchesSearch && matchesCountry && matchesCity;
  });

  // Handle country change
  const handleCountryChange = async (countryCode: string) => {
    setSelectedCountry(countryCode);
    setSelectedCity('');
    if (countryCode) {
      await getCities(countryCode);
    }
  };

  // Handle agent selection
  const handleAgentClick = (agent: AgentProfile) => {
    console.log('👆 AgentsPage: Agent clicked:', agent.id);
    // Navigate to agent detail or start chat
    navigate(`/chat?agent=${agent.id}`);
  };

  // Handle apply success
  const handleApplySuccess = async () => {
    showSuccess(
      isRTL 
        ? '🎉 تم إرسال طلبك بنجاح! سيقوم فريق WINOVA بمراجعته خلال 24 ساعة.'
        : '🎉 Application submitted successfully! The WINOVA team will review it within 24 hours.'
    );
    await getMyAgentProfile();
    setActiveTab('find');
  };

  // Render loading state
  if (loading && agents.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-nova border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="p-6 max-w-md">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
              {isRTL ? 'إعادة المحاولة' : 'Retry'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-nova" />
            <h1 className="font-bold text-lg">{isRTL ? 'الوكلاء' : 'Agents'}</h1>
            <Badge variant="secondary" className="text-xs">
              {filteredAgents.length} {isRTL ? 'وكيل' : 'agents'}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="find" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              {isRTL ? 'البحث عن وكلاء' : 'Find Agents'}
            </TabsTrigger>
            <TabsTrigger value="apply" className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              {isRTL ? 'تقديم طلب' : 'Apply'}
            </TabsTrigger>
          </TabsList>

          {/* Find Agents Tab */}
          <TabsContent value="find" className="space-y-4">
            {/* Search and Filters */}
            <Card className="p-4 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={isRTL ? 'ابحث عن وكيل...' : 'Search agents...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 ps-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedCountry} onValueChange={handleCountryChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={isRTL ? 'جميع الدول' : 'All countries'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{isRTL ? 'جميع الدول' : 'All countries'}</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {isRTL ? country.name_ar : country.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedCountry}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={isRTL ? 'جميع المدن' : 'All cities'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{isRTL ? 'جميع المدن' : 'All cities'}</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {isRTL ? city.name_ar : city.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Agents List */}
            <div className="space-y-3">
              {filteredAgents.length === 0 ? (
                <Card className="p-8">
                  <div className="text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery || selectedCountry || selectedCity
                        ? (isRTL ? 'لا يوجد وكلاء مطابقون للبحث' : 'No agents match your search')
                        : (isRTL ? 'لا يوجد وكلاء نشطين حالياً' : 'No active agents at the moment')
                      }
                    </p>
                  </div>
                </Card>
              ) : (
                <AnimatePresence>
                  {filteredAgents.map((agent, index) => (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleAgentClick(agent)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{agent.shop_name}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {agent.city}, {agent.country}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span>{agent.avg_rating.toFixed(1)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Shield className="w-4 h-4 text-green-500" />
                                <span>{agent.trust_score}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="w-4 h-4 text-blue-500" />
                                <span>{agent.whatsapp}</span>
                              </div>
                            </div>

                            {agent.bio && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {agent.bio}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant="outline" className="text-xs">
                                {agent.commission_pct}% {isRTL ? 'عمولة' : 'fee'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {agent.total_completed} {isRTL ? 'مكتملة' : 'completed'}
                              </Badge>
                            </div>
                          </div>

                          <Button size="sm" className="shrink-0">
                            <MessageSquare className="w-4 h-4 mr-1" />
                            {isRTL ? 'تواصل' : 'Contact'}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </TabsContent>

          {/* Apply Tab */}
          <TabsContent value="apply">
            <ApplyAgentForm onSuccess={handleApplySuccess} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

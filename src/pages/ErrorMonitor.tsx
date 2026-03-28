import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Shield,
  Database,
  Wifi,
  Server,
  Users,
  Eye,
  Download,
  ChevronRight,
  Calendar,
  BarChart3
} from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBanner } from '@/contexts/BannerContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ErrorLog {
  id: string;
  error_type: 'critical' | 'warning' | 'info';
  message: string;
  component: string;
  user_id?: string;
  created_at: string;
  resolved: boolean;
  count: number;
  stack_trace?: string;
}

interface ErrorStats {
  total_errors: number;
  critical_errors: number;
  warning_errors: number;
  info_errors: number;
  resolved_errors: number;
  active_errors: number;
  errors_today: number;
  errors_this_week: number;
  top_components: Array<{
    component: string;
    count: number;
  }>;
}

export default function ErrorMonitorPage() {
  const { language } = useLanguage();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'resolved'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchErrorData();
    const interval = setInterval(fetchErrorData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchErrorData = async () => {
    try {
      const [errorsResult, statsResult] = await Promise.all([
        supabase
          .from('error_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.rpc('get_error_stats')
      ]);

      if (errorsResult.error) throw errorsResult.error;
      if (statsResult.error) throw statsResult.error;

      setErrors(errorsResult.data || []);
      setStats(statsResult.data);
    } catch (error) {
      console.error('Error fetching error data:', error);
      showError(isRTL ? 'فشل تحميل بيانات الأخطاء' : 'Failed to load error data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchErrorData();
  };

  const handleResolveError = async (errorId: string) => {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({ resolved: true })
        .eq('id', errorId);

      if (error) throw error;

      showSuccess(isRTL ? 'تم حل الخطأ بنجاح' : 'Error resolved successfully');
      fetchErrorData();
    } catch (error) {
      showError(isRTL ? 'فشل حل الخطأ' : 'Failed to resolve error');
    }
  };

  const handleExportErrors = () => {
    const csvContent = [
      ['ID', 'Type', 'Message', 'Component', 'Date', 'Resolved', 'Count'],
      ...errors.map(error => [
        error.id,
        error.error_type,
        error.message,
        error.component,
        new Date(error.created_at).toLocaleString(),
        error.resolved ? 'Yes' : 'No',
        error.count.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showSuccess(isRTL ? 'تم تصدير السجلات بنجاح' : 'Logs exported successfully');
  };

  const filteredErrors = errors.filter(error => {
    const matchesSearch = searchQuery === '' || 
      error.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      error.component.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || error.error_type === filterType;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && !error.resolved) ||
      (filterStatus === 'resolved' && error.resolved);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getErrorColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return isRTL ? 'الآن' : 'Just now';
    if (diffMins < 60) return isRTL ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    if (diffHours < 24) return isRTL ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    return isRTL ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <InnerPageHeader title={isRTL ? 'مراقبة الأخطاء' : 'Error Monitor'} />
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
      <InnerPageHeader title={isRTL ? 'مراقبة الأخطاء' : 'Error Monitor'} />
      
      <main className="flex-1 px-4 py-4 pb-20 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.critical_errors}</div>
                    <div className="text-xs text-muted-foreground">
                      {isRTL ? 'خطأ حرج' : 'Critical'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.warning_errors}</div>
                    <div className="text-xs text-muted-foreground">
                      {isRTL ? 'تحذير' : 'Warning'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.resolved_errors}</div>
                    <div className="text-xs text-muted-foreground">
                      {isRTL ? 'تم حلها' : 'Resolved'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.errors_today}</div>
                    <div className="text-xs text-muted-foreground">
                      {isRTL ? 'اليوم' : 'Today'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={isRTL ? 'بحث في الأخطاء...' : 'Search errors...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full md:w-64"
                  />
                </div>

                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-full md:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                    <SelectItem value="critical">{isRTL ? 'حرج' : 'Critical'}</SelectItem>
                    <SelectItem value="warning">{isRTL ? 'تحذير' : 'Warning'}</SelectItem>
                    <SelectItem value="info">{isRTL ? 'معلومات' : 'Info'}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="w-full md:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                    <SelectItem value="active">{isRTL ? 'نشط' : 'Active'}</SelectItem>
                    <SelectItem value="resolved">{isRTL ? 'تم الحل' : 'Resolved'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {isRTL ? 'تحديث' : 'Refresh'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportErrors}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isRTL ? 'تصدير' : 'Export'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Components */}
        {stats?.top_components && stats.top_components.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {isRTL ? 'أكثر المكونات تسبباً في الأخطاء' : 'Top Error-Prone Components'}
              </h3>
              <div className="space-y-2">
                {stats.top_components.map((component, index) => (
                  <div key={component.component} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <span className="font-medium">{component.component}</span>
                    </div>
                    <Badge variant="secondary">{component.count} {isRTL ? 'خطأ' : 'errors'}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error List */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {filteredErrors.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <h3 className="font-semibold mb-2">
                    {isRTL ? 'لا توجد أخطاء' : 'No errors found'}
                  </h3>
                  <p className="text-muted-foreground">
                    {isRTL ? 'جميع الأنظمة تعمل بشكل جيد' : 'All systems are running smoothly'}
                  </p>
                </div>
              ) : (
                filteredErrors.map((error) => (
                  <motion.div
                    key={error.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-lg border",
                      error.resolved ? "bg-muted/50 border-muted" : "bg-background border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {getErrorIcon(error.error_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getErrorColor(error.error_type)}>
                              {error.error_type}
                            </Badge>
                            {error.resolved && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {isRTL ? 'تم الحل' : 'Resolved'}
                              </Badge>
                            )}
                            {error.count > 1 && (
                              <Badge variant="secondary">
                                {error.count}x
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium mb-1 truncate">
                            {error.message}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{error.component}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(error.created_at)}
                            </span>
                          </div>
                          {error.stack_trace && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                {isRTL ? 'عرض التفاصيل' : 'View details'}
                              </summary>
                              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                                {error.stack_trace}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!error.resolved && (
                          <Button
                            size="sm"
                            onClick={() => handleResolveError(error.id)}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {isRTL ? 'حل' : 'Resolve'}
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}

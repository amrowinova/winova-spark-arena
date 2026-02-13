import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSupport, SupportTicket } from '@/hooks/useSupport';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Ticket, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Users,
  MessageSquare,
  Search,
  Filter,
  Star,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

export default function SupportDashboard() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  const { tickets, isLoading, getStats } = useSupport();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const stats = getStats();

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'open') return matchesSearch && ticket.status === 'open';
    if (activeTab === 'in_progress') return matchesSearch && ticket.status === 'in_progress';
    if (activeTab === 'resolved') return matchesSearch && (ticket.status === 'resolved' || ticket.status === 'closed');
    if (activeTab === 'urgent') return matchesSearch && ticket.priority === 'urgent';
    return matchesSearch;
  });

  const getStatusBadge = (status: SupportTicket['status']) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      open: { variant: 'secondary' as const, label: isRTL ? 'مفتوحة' : 'Open' },
      in_progress: { variant: 'default' as const, label: isRTL ? 'قيد المعالجة' : 'In Progress' },
      resolved: { variant: 'outline' as const, label: isRTL ? 'تم الحل' : 'Resolved' },
      closed: { variant: 'outline' as const, label: isRTL ? 'مغلقة' : 'Closed' },
    };
    const config = variants[status] || variants.open;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: SupportTicket['priority']) => {
    if (priority === 'urgent') {
      return <Badge variant="destructive">{isRTL ? 'عاجل' : 'Urgent'}</Badge>;
    }
    if (priority === 'high') {
      return <Badge variant="destructive" className="bg-orange-500">{isRTL ? 'مرتفع' : 'High'}</Badge>;
    }
    return null;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'p2p': return '💱';
      case 'transfer': return '💸';
      case 'contest': return '🏆';
      case 'account': return '👤';
      default: return '📋';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader 
        title={isRTL ? 'لوحة الدعم' : 'Support Panel'}
      />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-3 text-center">
            <Ticket className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">{isRTL ? 'الكل' : 'Total'}</p>
          </Card>
          <Card className="p-3 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-xl font-bold">{stats.open}</p>
            <p className="text-[10px] text-muted-foreground">{isRTL ? 'مفتوحة' : 'Open'}</p>
          </Card>
          <Card className="p-3 text-center">
            <MessageSquare className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-xl font-bold">{stats.inProgress}</p>
            <p className="text-[10px] text-muted-foreground">{isRTL ? 'جارٍ' : 'Active'}</p>
          </Card>
          <Card className="p-3 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-destructive" />
            <p className="text-xl font-bold">{stats.urgent}</p>
            <p className="text-[10px] text-muted-foreground">{isRTL ? 'عاجل' : 'Urgent'}</p>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isRTL ? 'بحث في التذاكر...' : 'Search tickets...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => navigate('/support/disputes')}
          >
            <AlertTriangle className="w-4 h-4 me-2" />
            {isRTL ? 'نزاعات P2P' : 'P2P Disputes'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => navigate('/support/users')}
          >
            <Users className="w-4 h-4 me-2" />
            {isRTL ? 'المستخدمين' : 'Users'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => navigate('/support/staff-ratings')}
          >
            <Star className="w-4 h-4 me-2" />
            {isRTL ? 'التقييمات' : 'Ratings'}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="all" className="text-xs">{isRTL ? 'الكل' : 'All'}</TabsTrigger>
            <TabsTrigger value="open" className="text-xs">{isRTL ? 'جديد' : 'New'}</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs">{isRTL ? 'جارٍ' : 'Active'}</TabsTrigger>
            <TabsTrigger value="urgent" className="text-xs">{isRTL ? 'عاجل' : 'Urgent'}</TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs">{isRTL ? 'منتهي' : 'Done'}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                {isRTL ? 'جارٍ التحميل...' : 'Loading...'}
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-8">
                <Ticket className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">
                  {isRTL ? 'لا توجد تذاكر' : 'No tickets found'}
                </p>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/support/ticket/${ticket.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{getCategoryIcon(ticket.category)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                      <h3 className="font-medium text-foreground truncate">
                        {ticket.title}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {ticket.user_name} • #{ticket.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(ticket.created_at), {
                          addSuffix: true,
                          locale: isRTL ? ar : enUS,
                        })}
                      </p>
                    </div>
                    {ticket.assigned_to ? (
                      <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500 shrink-0" />
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

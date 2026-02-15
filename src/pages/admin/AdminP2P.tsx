import { useNavigate } from 'react-router-dom';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useP2PControlTower } from '@/hooks/useP2PControlTower';
import { GlobalKPIs } from '@/components/p2p-tower/GlobalKPIs';
import { LiveMarketTable } from '@/components/p2p-tower/LiveMarketTable';
import { OrderInspector } from '@/components/p2p-tower/OrderInspector';
import { RiskEnginePanel } from '@/components/p2p-tower/RiskEnginePanel';
import { P2PFiltersBar } from '@/components/p2p-tower/P2PFiltersBar';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

export default function AdminP2P() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();

  const {
    kpis, kpisLoading,
    orders, ordersLoading,
    anomalies, anomaliesLoading,
    orderDetail, detailLoading,
    selectedOrderId, setSelectedOrderId,
    filters, setFilters, resetFilters,
    countries,
  } = useP2PControlTower();

  return (
    <div className="min-h-screen bg-background">
      <InnerPageHeader
        title={isAr ? 'برج مراقبة P2P' : 'P2P Control Tower'}
        onBack={() => navigate('/admin')}
        rightAction={
          <Badge variant="destructive" className="text-[10px]">
            <Shield className="w-3 h-3 me-1" /> LIVE
          </Badge>
        }
      />

      <div className="container pb-24 pt-4 space-y-4">
        {/* Global KPIs */}
        <GlobalKPIs kpis={kpis} loading={kpisLoading} />

        {/* Filters */}
        <P2PFiltersBar
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          countries={countries}
        />

        {/* Risk Engine */}
        <RiskEnginePanel anomalies={anomalies} loading={anomaliesLoading} />

        {/* Live Market Table */}
        <LiveMarketTable
          orders={orders}
          loading={ordersLoading}
          onInspect={setSelectedOrderId}
        />

        {/* Order Inspector Sheet */}
        <OrderInspector
          open={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          data={orderDetail}
          loading={detailLoading}
        />
      </div>
    </div>
  );
}

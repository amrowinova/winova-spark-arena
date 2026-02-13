import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { StaffMetricsCard } from '@/components/admin/StaffMetricsCard';

export default function SupportStaffRatings() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader title={isRTL ? 'تقييمات الموظفين' : 'Staff Ratings'} />
      <div className="flex-1 p-4 pb-20">
        <StaffMetricsCard />
      </div>
    </div>
  );
}

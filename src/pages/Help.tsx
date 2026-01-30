import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeftRight, 
  Users, 
  ShoppingCart, 
  KeyRound, 
  UserCog, 
  Trophy,
  MessageCircle,
  ChevronRight,
  Headphones
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SupportCategory {
  id: string;
  icon: React.ElementType;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  color: string;
}

const supportCategories: SupportCategory[] = [
  {
    id: 'transfers',
    icon: ArrowLeftRight,
    titleEn: 'Transfers',
    titleAr: 'التحويلات',
    descriptionEn: 'Nova transfer issues, delays, failures, receipts',
    descriptionAr: 'مشاكل تحويل Nova، التأخير، الفشل، الإيصالات',
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    id: 'people',
    icon: Users,
    titleEn: 'People',
    titleAr: 'الأشخاص',
    descriptionEn: 'User search, chat issues, block/report',
    descriptionAr: 'البحث عن مستخدم، مشاكل المحادثات، حظر/إبلاغ',
    color: 'bg-purple-500/10 text-purple-500',
  },
  {
    id: 'p2p',
    icon: ShoppingCart,
    titleEn: 'P2P Trading',
    titleAr: 'P2P',
    descriptionEn: 'Buy/sell Nova, payment confirmation, disputes',
    descriptionAr: 'شراء/بيع Nova، تأكيد الدفع، النزاعات',
    color: 'bg-green-500/10 text-green-500',
  },
  {
    id: 'account',
    icon: KeyRound,
    titleEn: 'Login & Account',
    titleAr: 'الدخول والحساب',
    descriptionEn: 'Login, signup, password, Google/Apple issues',
    descriptionAr: 'تسجيل الدخول، إنشاء حساب، كلمة المرور',
    color: 'bg-orange-500/10 text-orange-500',
  },
  {
    id: 'team',
    icon: UserCog,
    titleEn: 'Team & Managers',
    titleAr: 'الفريق والمسؤولين',
    descriptionEn: 'Direct manager, promotions, team distribution',
    descriptionAr: 'المسؤول المباشر، الترقية، توزيع الفريق',
    color: 'bg-indigo-500/10 text-indigo-500',
  },
  {
    id: 'contests',
    icon: Trophy,
    titleEn: 'Contests & Lucky',
    titleAr: 'المسابقات والمحظوظين',
    descriptionEn: 'Entry, voting, results, prizes',
    descriptionAr: 'الاشتراك، التصويت، النتائج، الجوائز',
    color: 'bg-amber-500/10 text-amber-500',
  },
];

// Mock support agent data
const SUPPORT_AGENT = {
  id: 'support-agent',
  name: 'فريق الدعم',
  nameEn: 'Support Team',
  username: 'support',
  avatar: '🎧',
};

export default function Help() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const handleCategoryClick = (category: SupportCategory) => {
    // Navigate to chat with support context
    const categoryTitle = isRTL ? category.titleAr : category.titleEn;
    navigate('/chat', { 
      state: { 
        supportTicket: {
          category: category.id,
          categoryTitle,
          isSupport: true,
          agent: SUPPORT_AGENT,
        }
      }
    });
  };

  const handleDirectSupport = () => {
    navigate('/chat', { 
      state: { 
        supportTicket: {
          category: 'general',
          categoryTitle: isRTL ? 'دعم عام' : 'General Support',
          isSupport: true,
          agent: SUPPORT_AGENT,
        }
      }
    });
  };

  return (
    <AppLayout title={isRTL ? 'مركز المساعدة' : 'Help Center'}>
      <div className="flex flex-col min-h-[calc(100vh-120px)]">
        {/* Header Section */}
        <div className="px-4 py-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Headphones className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold mb-2">
            {isRTL ? 'كيف نقدر نساعدك؟' : 'How can we help you?'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRTL 
              ? 'اختر نوع المشكلة ليتم توجيهك إلى الدعم المختص بسرعة'
              : 'Choose the issue type to be directed to the right support quickly'}
          </p>
        </div>

        {/* Categories Grid */}
        <div className="flex-1 px-4 pb-4">
          <div className="grid gap-3">
            {supportCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Card
                  key={category.id}
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.98]"
                  onClick={() => handleCategoryClick(category)}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      category.color
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-0.5">
                        {isRTL ? category.titleAr : category.titleEn}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {isRTL ? category.descriptionAr : category.descriptionEn}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className={cn(
                      "w-5 h-5 text-muted-foreground shrink-0",
                      isRTL && "rotate-180"
                    )} />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Direct Support Button - Sticky Bottom */}
        <div className="sticky bottom-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
          <Button 
            onClick={handleDirectSupport}
            className="w-full h-14 gap-3 text-base font-semibold shadow-lg"
            size="lg"
          >
            <MessageCircle className="w-5 h-5" />
            {isRTL ? 'تواصل مع الدعم مباشرة' : 'Contact Support Directly'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

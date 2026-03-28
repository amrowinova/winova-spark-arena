import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ApplyAgentForm } from '@/components/agents/ApplyAgentForm';
import { Button } from '@/components/ui/button';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';

export default function ApplyAgentPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const isRTL = language === 'ar';

  const handleSuccess = () => {
    setSubmitted(true);
  };

  const handleBack = () => {
    navigate('/p2p');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <InnerPageHeader title={isRTL ? 'طلب الوكالة' : 'Agent Application'} />
        
        <main className="flex-1 px-4 py-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto text-center space-y-6"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Store className="w-10 h-10 text-green-600" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-green-600">
                {isRTL ? 'تم إرسال طلبك!' : 'Application Submitted!'}
              </h1>
              <p className="text-muted-foreground">
                {isRTL 
                  ? 'شكراً لتقديمك طلب成为一名 WeNova agent. سيقوم فريقنا بمراجعة طلبك والتواصل معك قريباً.'
                  : 'Thank you for applying to become a WeNova agent. Our team will review your application and contact you soon.'
                }
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button onClick={handleBack} className="w-full">
                {isRTL ? 'العودة إلى P2P' : 'Back to P2P'}
              </Button>
            </div>
          </motion.div>
        </main>
        
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader title={isRTL ? 'طلب الوكالة' : 'Agent Application'} />
      
      <main className="flex-1 px-4 py-8 pb-20">
        <div className="max-w-md mx-auto space-y-6">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isRTL ? 'العودة' : 'Back'}
          </Button>

          {/* Application form */}
          <ApplyAgentForm onSuccess={handleSuccess} />
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}

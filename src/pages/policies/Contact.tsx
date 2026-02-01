import { useTranslation } from 'react-i18next';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Mail, Clock, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Contact() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage.direction === 'rtl';
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleOpenSupport = () => {
    if (user) {
      navigate('/chat?tab=support');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={t('policies.contact.title')} />
      
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex-1 p-4"
      >
        <div className="space-y-4">
          <Card>
            <CardContent className={cn("p-6 space-y-4", isRTL && "text-right")}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {t('policies.contact.email.title')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    support@winova.app
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className={cn("p-6 space-y-4", isRTL && "text-right")}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {t('policies.contact.response.title')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('policies.contact.response.content')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className={cn("p-6", isRTL && "text-right")}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {t('policies.contact.inApp.title')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('policies.contact.inApp.content')}
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={handleOpenSupport}
                className="w-full"
              >
                {t('policies.contact.inApp.button')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.main>
    </div>
  );
}

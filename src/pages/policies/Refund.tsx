import { useTranslation } from 'react-i18next';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Refund() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage.direction === 'rtl';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={t('policies.refund.title')} />
      
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex-1 p-4"
      >
        <ScrollArea className="h-[calc(100vh-120px)]">
          <Card>
            <CardContent className={cn("p-6 space-y-6", isRTL && "text-right")}>
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('policies.refund.lastUpdated')}: {t('policies.refund.updateDate')}
                </p>
              </div>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.refund.sections.novaBalance.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.refund.sections.novaBalance.content')}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.refund.sections.noAutoRefund.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.refund.sections.noAutoRefund.content')}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.refund.sections.manualRefund.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.refund.sections.manualRefund.content')}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.refund.sections.rejectionCases.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.refund.sections.rejectionCases.content')}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.refund.sections.fraudCases.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.refund.sections.fraudCases.content')}
                </p>
              </section>
            </CardContent>
          </Card>
        </ScrollArea>
      </motion.main>
    </div>
  );
}

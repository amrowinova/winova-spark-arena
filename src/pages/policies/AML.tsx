import { useTranslation } from 'react-i18next';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AML() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage.direction === 'rtl';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={t('policies.aml.title')} />
      
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
                  {t('policies.aml.lastUpdated')}: {t('policies.aml.updateDate')}
                </p>
              </div>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.aml.sections.combating.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.aml.sections.combating.content')}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.aml.sections.freezeRights.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.aml.sections.freezeRights.content')}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.aml.sections.manualReview.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.aml.sections.manualReview.content')}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.aml.sections.authorities.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.aml.sections.authorities.content')}
                </p>
              </section>
            </CardContent>
          </Card>
        </ScrollArea>
      </motion.main>
    </div>
  );
}

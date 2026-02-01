import { useTranslation } from 'react-i18next';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Terms() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const isRTL = currentLanguage.direction === 'rtl';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={t('policies.terms.title')} />
      
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
                  {t('policies.terms.lastUpdated')}: {t('policies.terms.updateDate')}
                </p>
              </div>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.terms.sections.platform.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.terms.sections.platform.content')}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.terms.sections.nova.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.terms.sections.nova.content')}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.terms.sections.userResponsibilities.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.terms.sections.userResponsibilities.content')}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.terms.sections.fraud.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.terms.sections.fraud.content')}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.terms.sections.adminRights.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.terms.sections.adminRights.content')}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.terms.sections.disclaimer.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.terms.sections.disclaimer.content')}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('policies.terms.sections.law.title')}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('policies.terms.sections.law.content')}
                </p>
              </section>
            </CardContent>
          </Card>
        </ScrollArea>
      </motion.main>
    </div>
  );
}

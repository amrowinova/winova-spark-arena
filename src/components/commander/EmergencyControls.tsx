import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEmergencyControls } from '@/hooks/useCommander';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { OctagonX, Pause, Snowflake, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

const CONTROLS = [
  {
    key: 'FREEZE_EXECUTION',
    icon: Pause,
    label: 'Halt Autonomous Actions',
    labelAr: 'إيقاف العمليات التلقائية',
    desc: 'Immediately stops all auto-approved executions',
    descAr: 'يوقف فوراً جميع العمليات المعتمدة تلقائياً',
  },
  {
    key: 'FREEZE_EVOLUTION',
    icon: Snowflake,
    label: 'Freeze Learning',
    labelAr: 'تجميد التعلم',
    desc: 'Stops the system from updating its behavioral model',
    descAr: 'يوقف تحديث النموذج السلوكي',
  },
  {
    key: 'KILL_ALL_AGENTS',
    icon: OctagonX,
    label: 'Emergency Stop All',
    labelAr: 'إيقاف طوارئ شامل',
    desc: 'Immediately disables all AI agents. Requires manual restart.',
    descAr: 'يعطل جميع الوكلاء فوراً. يتطلب إعادة تشغيل يدوية.',
  },
];

export function EmergencyControls() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { status, isLoading, toggle } = useEmergencyControls();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState<string | null>(null);

  const anyActive = Object.values(status).some(v => v === true);

  const handleToggle = (key: string, currentlyEnabled: boolean) => {
    if (!currentlyEnabled) {
      // Activating requires confirmation
      if (confirming !== key) {
        setConfirming(key);
        return;
      }
    }
    setConfirming(null);
    toggle.mutate({ key, enabled: !currentlyEnabled }, {
      onSuccess: () => {
        toast({
          title: isAr ? 'تم التنفيذ' : 'Executed',
          description: currentlyEnabled
            ? (isAr ? 'تم إلغاء التجميد' : 'Control deactivated')
            : (isAr ? 'تم التفعيل فوراً' : 'Control activated immediately'),
        });
      },
    });
  };

  return (
    <Card className={anyActive ? 'border-destructive/50 bg-destructive/5' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${anyActive ? 'text-destructive' : 'text-muted-foreground'}`} />
          {isAr ? 'ضوابط الطوارئ' : 'Emergency Controls'}
          {anyActive && (
            <Badge variant="destructive" className="text-[10px]">{isAr ? 'نشط' : 'ACTIVE'}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : (
          CONTROLS.map(ctrl => {
            const isActive = status[ctrl.key] === true;
            const isConfirmingThis = confirming === ctrl.key;
            const Icon = ctrl.icon;

            return (
              <div key={ctrl.key} className={`rounded-lg border p-3 flex items-center gap-3 ${isActive ? 'border-destructive/40 bg-destructive/10' : ''}`}>
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-destructive' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{isAr ? ctrl.labelAr : ctrl.label}</p>
                  <p className="text-[10px] text-muted-foreground">{isAr ? ctrl.descAr : ctrl.desc}</p>
                </div>
                <Button
                  size="sm"
                  variant={isActive ? 'outline' : isConfirmingThis ? 'destructive' : 'secondary'}
                  className="text-[10px] h-7 px-3 shrink-0"
                  onClick={() => handleToggle(ctrl.key, isActive)}
                  disabled={toggle.isPending}
                >
                  {isActive
                    ? (isAr ? 'إلغاء' : 'Deactivate')
                    : isConfirmingThis
                    ? (isAr ? 'تأكيد التفعيل' : 'Confirm')
                    : (isAr ? 'تفعيل' : 'Activate')
                  }
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

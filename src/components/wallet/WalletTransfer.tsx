import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Send, QrCode, Link2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';

interface WalletTransferProps {
  onTransferOpen: () => void;
  onQROpen: () => void;
  onConvertOpen: () => void;
  disabled?: boolean;
}

export function WalletTransfer({
  onTransferOpen,
  onQROpen,
  onConvertOpen,
  disabled = false
}: WalletTransferProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useUser();
  const isRTL = language === 'ar';

  const transferActions = [
    {
      icon: Send,
      label: isRTL ? 'تحويل Nova' : 'Transfer Nova',
      description: isRTL ? 'أرسل Nova للمستخدمين' : 'Send Nova to users',
      color: 'text-nova',
      bgColor: 'bg-nova/10',
      borderColor: 'border-nova/30',
      onClick: onTransferOpen,
    },
    {
      icon: QrCode,
      label: isRTL ? 'رمز الاستلام' : 'Receive QR',
      description: isRTL ? 'احصل على رمز QR للاستلام' : 'Get QR code to receive',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
      onClick: onQROpen,
    },
    {
      icon: Link2,
      label: isRTL ? 'تحويل العملات' : 'Convert',
      description: isRTL ? 'حول Nova ↔ Aura' : 'Convert Nova ↔ Aura',
      color: 'text-aura',
      bgColor: 'bg-aura/10',
      borderColor: 'border-aura/30',
      onClick: onConvertOpen,
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        {isRTL ? 'التحويلات والمعاملات' : 'Transfers & Actions'}
      </h2>

      <div className="grid gap-3">
        {transferActions.map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${action.bgColor} ${action.borderColor} border`}
              onClick={action.onClick}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${action.bgColor} flex items-center justify-center`}>
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {action.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="p-4 bg-muted/30 border-border">
        <h3 className="font-medium text-foreground mb-3">
          {isRTL ? 'إجراءات سريعة' : 'Quick Actions'}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onTransferOpen}
            disabled={disabled}
            className="h-auto py-3 flex-col gap-1"
          >
            <Send className="h-4 w-4" />
            <span className="text-xs">{isRTL ? 'تحويل' : 'Send'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onQROpen}
            disabled={disabled}
            className="h-auto py-3 flex-col gap-1"
          >
            <QrCode className="h-4 w-4" />
            <span className="text-xs">{isRTL ? 'استلام' : 'Receive'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onConvertOpen}
            disabled={disabled}
            className="h-auto py-3 flex-col gap-1"
          >
            <Link2 className="h-4 w-4" />
            <span className="text-xs">{isRTL ? 'تحويل' : 'Convert'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-auto py-3 flex-col gap-1"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{isRTL ? 'مساعدة' : 'Help'}</span>
          </Button>
        </div>
      </Card>

      {/* User Info */}
      {user && (
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {user.name?.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{user.username}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'المعرف' : 'ID'}
              </p>
              <p className="text-sm font-mono text-foreground">
                {user.novaId}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

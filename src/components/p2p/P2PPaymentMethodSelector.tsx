import { useState } from 'react';
import { Check, ChevronDown, Plus, Pencil, Trash2, Star, AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { SavedPaymentMethod, PAYMENT_METHOD_TYPES } from './P2PPaymentMethodsManager';
import { cn } from '@/lib/utils';

interface P2PPaymentMethodSelectorProps {
  methods: SavedPaymentMethod[];
  selectedMethodId: string;
  onSelect: (id: string) => void;
  onAddNew: () => void;
  onEdit: (method: SavedPaymentMethod) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  disabled?: boolean;
}

export function P2PPaymentMethodSelector({
  methods,
  selectedMethodId,
  onSelect,
  onAddNew,
  onEdit,
  onDelete,
  onSetDefault,
  disabled = false,
}: P2PPaymentMethodSelectorProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [isOpen, setIsOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [manageMode, setManageMode] = useState(false);

  const selectedMethod = methods.find(m => m.id === selectedMethodId);
  
  const getTypeConfig = (type: string) => 
    PAYMENT_METHOD_TYPES.find(t => t.id === type);

  const handleSelect = (id: string) => {
    onSelect(id);
    setIsOpen(false);
    setManageMode(false);
  };

  const handleDeleteConfirm = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
    if (selectedMethodId === id && methods.length > 1) {
      const remaining = methods.filter(m => m.id !== id);
      if (remaining.length > 0) {
        onSelect(remaining[0].id);
      }
    }
  };

  // Empty state
  if (methods.length === 0) {
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {isRTL ? 'حساب استلام المبلغ' : 'Payment Receiving Account'}
          <span className="text-destructive ms-1">*</span>
        </Label>
        <Card className="p-4 bg-warning/10 border-warning/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-warning">
                  {isRTL ? 'لا توجد حسابات بنكية' : 'No bank accounts'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isRTL 
                    ? 'أضف حساب بنكي لاستلام المدفوعات من المشتري'
                    : 'Add a bank account to receive payments from buyer'
                  }
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-warning/50 text-warning hover:bg-warning/10 hover:text-warning"
                onClick={onAddNew}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 me-2" />
                {isRTL ? 'إضافة حساب بنكي' : 'Add Bank Account'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {isRTL ? 'حساب استلام المبلغ' : 'Payment Receiving Account'}
          <span className="text-destructive ms-1">*</span>
        </Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-muted-foreground"
          onClick={onAddNew}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5" />
          {isRTL ? 'إضافة' : 'Add'}
        </Button>
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={cn(
              "w-full justify-between h-auto min-h-[56px] py-2",
              !selectedMethod && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            {selectedMethod ? (
              <div className="flex items-center gap-3 text-start">
                <div className="text-xl">
                  {getTypeConfig(selectedMethod.type)?.icon || '🏦'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {isRTL ? selectedMethod.providerNameAr : selectedMethod.providerName}
                    </span>
                    {selectedMethod.isDefault && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        <Star className="h-2.5 w-2.5 me-0.5 fill-current" />
                        {isRTL ? 'افتراضي' : 'Default'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedMethod.fullName} • {selectedMethod.accountNumber || selectedMethod.phoneNumber}
                  </p>
                </div>
              </div>
            ) : (
              <span>{isRTL ? 'اختر حساب...' : 'Select account...'}</span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2 border-b border-border">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground px-2">
                {isRTL ? 'الحسابات المحفوظة' : 'Saved Accounts'}
                {' '}({methods.length})
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setManageMode(!manageMode)}
              >
                {manageMode 
                  ? (isRTL ? 'تم' : 'Done')
                  : (isRTL ? 'إدارة' : 'Manage')
                }
              </Button>
            </div>
          </div>
          
          <div className="max-h-[240px] overflow-y-auto p-1">
            {methods.map((method) => {
              const typeConfig = getTypeConfig(method.type);
              const isSelected = selectedMethodId === method.id;
              
              return (
                <div
                  key={method.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                    isSelected 
                      ? "bg-primary/10" 
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => !manageMode && handleSelect(method.id)}
                >
                  {!manageMode && (
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                    )}>
                      {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                  )}
                  
                  <div className="text-lg shrink-0">
                    {typeConfig?.icon || '🏦'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm truncate">
                        {isRTL ? method.providerNameAr : method.providerName}
                      </span>
                      {method.isDefault && (
                        <Star className="h-3 w-3 text-warning fill-warning shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {method.fullName}
                    </p>
                  </div>
                  
                  {manageMode ? (
                    <div className="flex items-center gap-1 shrink-0">
                      {!method.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetDefault(method.id);
                          }}
                          title={isRTL ? 'تعيين كافتراضي' : 'Set as default'}
                        >
                          <Star className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(method);
                          setIsOpen(false);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(method.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground font-mono shrink-0">
                      {(method.accountNumber || method.phoneNumber || '').slice(-4)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-primary"
              onClick={() => {
                onAddNew();
                setIsOpen(false);
              }}
            >
              <Plus className="h-4 w-4" />
              {isRTL ? 'إضافة حساب جديد' : 'Add New Account'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Info message */}
      {selectedMethod && (
        <div className="flex items-start gap-2 p-2 bg-info/10 rounded-md border border-info/20">
          <CreditCard className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <p className="text-xs text-info">
            {isRTL 
              ? `سيتم استلام المبلغ على حساب "${isRTL ? selectedMethod.providerNameAr : selectedMethod.providerName}" باسم "${selectedMethod.fullName}"`
              : `Amount will be received on "${selectedMethod.providerName}" account in name of "${selectedMethod.fullName}"`
            }
          </p>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? 'حذف الحساب؟' : 'Delete Account?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL 
                ? 'هل أنت متأكد من حذف هذا الحساب؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this account? This action cannot be undone.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDeleteConfirm(deleteConfirmId)}
            >
              {isRTL ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

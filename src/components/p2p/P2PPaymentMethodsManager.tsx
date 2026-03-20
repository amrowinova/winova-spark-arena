import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, CreditCard, Building, Phone, User, Hash, FileText, Wallet, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { CountryConfig } from './P2PCountrySelector';
import { cn } from '@/lib/utils';

// Payment method types
export type PaymentMethodType = 'bank' | 'wallet' | 'instant';

export interface PaymentMethodTypeConfig {
  id: PaymentMethodType;
  labelEn: string;
  labelAr: string;
  icon: string;
}

export const PAYMENT_METHOD_TYPES: PaymentMethodTypeConfig[] = [
  { id: 'bank', labelEn: 'Bank Transfer', labelAr: 'تحويل بنكي', icon: '🏦' },
  { id: 'wallet', labelEn: 'Mobile Wallet', labelAr: 'محفظة إلكترونية', icon: '📱' },
  { id: 'instant', labelEn: 'Instant Transfer', labelAr: 'تحويل فوري', icon: '⚡' },
];

// Saved payment method structure
export interface SavedPaymentMethod {
  id: string;
  countryCode: string;
  type: PaymentMethodType;
  // Common fields
  providerName: string; // Bank name or Wallet name
  providerNameAr?: string;
  fullName: string;
  // Bank-specific fields
  accountNumber?: string;
  iban?: string;
  // Wallet-specific fields
  phoneNumber?: string;
  // Common optional
  notes?: string;
  isDefault?: boolean;
  createdAt: Date;
}

// Country-specific providers
export interface PaymentProvider {
  id: string;
  name: string;
  nameAr: string;
  type: PaymentMethodType;
  icon: string;
}

export const COUNTRY_PROVIDERS: Record<string, PaymentProvider[]> = {
  SA: [
    { id: 'rajhi', name: 'Al Rajhi Bank', nameAr: 'بنك الراجحي', type: 'bank', icon: '🏦' },
    { id: 'ncb', name: 'Al Ahli Bank (NCB)', nameAr: 'البنك الأهلي', type: 'bank', icon: '🏦' },
    { id: 'samba', name: 'Samba Bank', nameAr: 'بنك سامبا', type: 'bank', icon: '🏦' },
    { id: 'riyad', name: 'Riyad Bank', nameAr: 'بنك الرياض', type: 'bank', icon: '🏦' },
    { id: 'stcpay', name: 'STC Pay', nameAr: 'STC Pay', type: 'wallet', icon: '📱' },
    { id: 'urpay', name: 'URPay', nameAr: 'يو آر باي', type: 'wallet', icon: '📱' },
  ],
  EG: [
    { id: 'cib', name: 'CIB', nameAr: 'البنك التجاري الدولي', type: 'bank', icon: '🏦' },
    { id: 'nbe', name: 'National Bank of Egypt', nameAr: 'البنك الأهلي المصري', type: 'bank', icon: '🏦' },
    { id: 'banquemisr', name: 'Banque Misr', nameAr: 'بنك مصر', type: 'bank', icon: '🏦' },
    { id: 'vodafone', name: 'Vodafone Cash', nameAr: 'فودافون كاش', type: 'wallet', icon: '📱' },
    { id: 'etisalat', name: 'Etisalat Cash', nameAr: 'اتصالات كاش', type: 'wallet', icon: '📱' },
    { id: 'orange', name: 'Orange Cash', nameAr: 'اورانج كاش', type: 'wallet', icon: '📱' },
    { id: 'instapay', name: 'InstaPay', nameAr: 'إنستاباي', type: 'instant', icon: '⚡' },
  ],
  AE: [
    { id: 'adcb', name: 'ADCB', nameAr: 'أبوظبي التجاري', type: 'bank', icon: '🏦' },
    { id: 'enbd', name: 'Emirates NBD', nameAr: 'الإمارات دبي الوطني', type: 'bank', icon: '🏦' },
    { id: 'fab', name: 'FAB', nameAr: 'بنك أبوظبي الأول', type: 'bank', icon: '🏦' },
    { id: 'adpay', name: 'AD Pay', nameAr: 'أبوظبي باي', type: 'wallet', icon: '📱' },
  ],
  JO: [
    { id: 'abc', name: 'Arab Bank', nameAr: 'البنك العربي', type: 'bank', icon: '🏦' },
    { id: 'hbtf', name: 'Housing Bank', nameAr: 'بنك الإسكان', type: 'bank', icon: '🏦' },
    { id: 'cliq', name: 'CliQ', nameAr: 'كليك', type: 'instant', icon: '⚡' },
    { id: 'zain', name: 'Zain Cash', nameAr: 'زين كاش', type: 'wallet', icon: '📱' },
  ],
};

interface P2PPaymentMethodsManagerProps {
  country: CountryConfig;
  onMethodsChange?: (methods: SavedPaymentMethod[]) => void;
}

export function P2PPaymentMethodsManager({
  country,
  onMethodsChange,
}: P2PPaymentMethodsManagerProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingMethod, setEditingMethod] = useState<SavedPaymentMethod | null>(null);
  const [viewingMethod, setViewingMethod] = useState<SavedPaymentMethod | null>(null);

  // Form state
  const [selectedType, setSelectedType] = useState<PaymentMethodType | ''>('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Load saved methods via RPC (returns decrypted data for current user only)
  const loadMethods = async () => {
    const { data, error } = await supabase.rpc('get_my_payment_methods');
    if (error) return;
    const mapped: SavedPaymentMethod[] = (data || []).map((m: any) => ({
      id: m.id,
      countryCode: m.country,
      type: (m.type || 'bank') as PaymentMethodType,
      providerName: m.provider_name,
      providerNameAr: m.provider_name_ar || undefined,
      fullName: m.full_name,
      accountNumber: m.account_number || undefined,
      iban: m.iban || undefined,
      phoneNumber: m.phone_number || undefined,
      notes: m.notes || undefined,
      isDefault: m.is_default,
      createdAt: new Date(m.created_at),
    }));
    setSavedMethods(mapped);
    onMethodsChange?.(mapped);
  };

  useEffect(() => {
    loadMethods();
  }, []);

  const countryMethods = savedMethods.filter(m => m.countryCode === country.code);
  const countryProviders = COUNTRY_PROVIDERS[country.code] || [];
  const filteredProviders = selectedType 
    ? countryProviders.filter(p => p.type === selectedType)
    : countryProviders;

  const selectedProvider = countryProviders.find(p => p.id === selectedProviderId);
  const isBank = selectedProvider?.type === 'bank';
  const isWallet = selectedProvider?.type === 'wallet';
  const isInstant = selectedProvider?.type === 'instant';

  const resetForm = () => {
    setSelectedType('');
    setSelectedProviderId('');
    setFullName('');
    setAccountNumber('');
    setIban('');
    setPhoneNumber('');
    setNotes('');
  };

  const handleAdd = async () => {
    if (!selectedProvider || !fullName) return;
    if (isBank && !accountNumber) return;
    if ((isWallet || isInstant) && !phoneNumber) return;

    const { data, error } = await supabase.rpc('upsert_payment_method', {
      p_country:         country.code,
      p_type:            selectedProvider.type,
      p_provider_name:   selectedProvider.name,
      p_provider_name_ar: selectedProvider.nameAr,
      p_full_name:       fullName,
      p_account_number:  isBank ? accountNumber : null,
      p_iban:            isBank && iban ? iban : null,
      p_phone_number:    (isWallet || isInstant) ? phoneNumber : null,
      p_notes:           notes || null,
      p_is_default:      countryMethods.length === 0,
    });

    if (error || !data?.success) return;

    resetForm();
    setIsAddDialogOpen(false);
    await loadMethods();
  };

  const handleEdit = async () => {
    if (!editingMethod || !fullName) return;
    const isEditBank = editingMethod.type === 'bank';
    const isEditWallet = editingMethod.type === 'wallet' || editingMethod.type === 'instant';

    if (isEditBank && !accountNumber) return;
    if (isEditWallet && !phoneNumber) return;

    const { data, error } = await supabase.rpc('upsert_payment_method', {
      p_id:             editingMethod.id,
      p_full_name:      fullName,
      p_account_number: isEditBank ? accountNumber : null,
      p_iban:           isEditBank && iban ? iban : null,
      p_phone_number:   isEditWallet ? phoneNumber : null,
      p_notes:          notes || null,
    });

    if (error || !data?.success) return;

    resetForm();
    setEditingMethod(null);
    setIsEditDialogOpen(false);
    await loadMethods();
  };

  const handleDelete = async (id: string) => {
    const deletedWasDefault = savedMethods.find(m => m.id === id)?.isDefault;

    const { data, error } = await supabase.rpc('delete_payment_method', { p_id: id });
    if (error || !data?.success) return;

    // If we deleted the default, make first remaining one default
    if (deletedWasDefault) {
      const remaining = savedMethods.filter(m => m.id !== id && m.countryCode === country.code);
      if (remaining.length > 0) {
        await supabase.rpc('set_default_payment_method', {
          p_id: remaining[0].id,
          p_country: country.code,
        });
      }
    }

    setDeleteConfirmId(null);
    await loadMethods();
  };

  const handleSetDefault = async (id: string) => {
    const { data, error } = await supabase.rpc('set_default_payment_method', {
      p_id: id,
      p_country: country.code,
    });
    if (error || !data?.success) return;
    await loadMethods();
  };

  const openEditDialog = (method: SavedPaymentMethod) => {
    setEditingMethod(method);
    setFullName(method.fullName);
    setAccountNumber(method.accountNumber || '');
    setIban(method.iban || '');
    setPhoneNumber(method.phoneNumber || '');
    setNotes(method.notes || '');
    setIsEditDialogOpen(true);
  };

  const openViewSheet = (method: SavedPaymentMethod) => {
    setViewingMethod(method);
    setIsViewSheetOpen(true);
  };

  const getTypeConfig = (type: PaymentMethodType) => 
    PAYMENT_METHOD_TYPES.find(t => t.id === type);

  const canSubmitAdd = selectedProvider && fullName.trim() && (
    (isBank && accountNumber.trim()) ||
    ((isWallet || isInstant) && phoneNumber.trim())
  );

  const canSubmitEdit = editingMethod && fullName.trim() && (
    (editingMethod.type === 'bank' && accountNumber.trim()) ||
    ((editingMethod.type === 'wallet' || editingMethod.type === 'instant') && phoneNumber.trim())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">
            {isRTL ? 'طرق الدفع P2P' : 'P2P Payment Methods'}
          </h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {country.flag} {country.currency}
        </Badge>
      </div>

      {/* Add Button */}
      <Button 
        onClick={() => setIsAddDialogOpen(true)} 
        className="w-full gap-2"
        variant="outline"
      >
        <Plus className="h-4 w-4" />
        {isRTL ? 'إضافة طريقة دفع جديدة' : 'Add New Payment Method'}
      </Button>

      {/* Methods List */}
      {countryMethods.length === 0 ? (
        <Card className="p-6 text-center border-dashed">
          <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm mb-1">
            {isRTL 
              ? 'لا توجد طرق دفع محفوظة'
              : 'No saved payment methods'
            }
          </p>
          <p className="text-xs text-muted-foreground">
            {isRTL 
              ? 'أضف طريقة دفع لتتمكن من بيع Nova'
              : 'Add a payment method to start selling Nova'
            }
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {countryMethods.map((method) => {
            const typeConfig = getTypeConfig(method.type);
            return (
              <Card 
                key={method.id} 
                className={cn(
                  "p-3 transition-all",
                  method.isDefault && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {typeConfig?.icon || '💳'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">
                        {isRTL ? method.providerNameAr : method.providerName}
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        {isRTL ? typeConfig?.labelAr : typeConfig?.labelEn}
                      </Badge>
                      {method.isDefault && (
                        <Badge variant="default" className="text-[10px] bg-primary">
                          {isRTL ? 'افتراضي' : 'Default'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{method.fullName}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      {method.type === 'bank' 
                        ? method.accountNumber 
                        : method.phoneNumber
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openViewSheet(method)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(method)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(method.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {!method.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full text-xs"
                    onClick={() => handleSetDefault(method.id)}
                  >
                    {isRTL ? 'تعيين كافتراضي' : 'Set as Default'}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {isRTL ? 'إضافة طريقة دفع' : 'Add Payment Method'}
            </DialogTitle>
            <DialogDescription>
              {country.flag} {isRTL ? country.nameAr : country.name} • {country.currency}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step 1: Payment Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                {isRTL ? 'نوع طريقة الدفع' : 'Payment Type'}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHOD_TYPES.map((type) => (
                  <Button
                    key={type.id}
                    type="button"
                    variant={selectedType === type.id ? 'default' : 'outline'}
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => {
                      setSelectedType(type.id);
                      setSelectedProviderId('');
                    }}
                  >
                    <span className="text-xl">{type.icon}</span>
                    <span className="text-xs">
                      {isRTL ? type.labelAr : type.labelEn}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Step 2: Provider Selection */}
            {selectedType && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  {isRTL 
                    ? (selectedType === 'bank' ? 'اختر البنك' : 'اختر المحفظة')
                    : (selectedType === 'bank' ? 'Select Bank' : 'Select Provider')
                  }
                </Label>
                <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? 'اختر...' : 'Select...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProviders.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <span className="flex items-center gap-2">
                          <span>{provider.icon}</span>
                          <span>{isRTL ? provider.nameAr : provider.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 3: Dynamic Fields */}
            {selectedProvider && (
              <>
                {/* Full Name - Always shown */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {isRTL ? 'الاسم الكامل لصاحب الحساب' : 'Account Holder Full Name'}
                  </Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isRTL ? 'الاسم كما يظهر في الحساب' : 'Name as it appears on account'}
                  />
                </div>

                {/* Bank-specific fields */}
                {isBank && (
                  <>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        {isRTL ? 'رقم الحساب' : 'Account Number'}
                      </Label>
                      <Input
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder={isRTL ? 'رقم الحساب البنكي' : 'Bank account number'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        {isRTL ? 'IBAN (اختياري)' : 'IBAN (optional)'}
                      </Label>
                      <Input
                        value={iban}
                        onChange={(e) => setIban(e.target.value)}
                        placeholder="SA..."
                      />
                    </div>
                  </>
                )}

                {/* Wallet/Instant-specific fields */}
                {(isWallet || isInstant) && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {isRTL ? 'رقم الهاتف / المحفظة' : 'Phone / Wallet Number'}
                    </Label>
                    <Input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+966..."
                      dir="ltr"
                    />
                  </div>
                )}

                {/* Notes - Always shown */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {isRTL ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={isRTL ? 'أي ملاحظات إضافية...' : 'Any additional notes...'}
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setIsAddDialogOpen(false); }}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleAdd} disabled={!canSubmitAdd}>
              {isRTL ? 'حفظ طريقة الدفع' : 'Save Payment Method'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              {isRTL ? 'تعديل طريقة الدفع' : 'Edit Payment Method'}
            </DialogTitle>
            {editingMethod && (
              <DialogDescription className="flex items-center gap-2">
                <span>{getTypeConfig(editingMethod.type)?.icon}</span>
                {isRTL ? editingMethod.providerNameAr : editingMethod.providerName}
              </DialogDescription>
            )}
          </DialogHeader>

          {editingMethod && (
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {isRTL ? 'الاسم الكامل' : 'Full Name'}
                </Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              {/* Bank fields */}
              {editingMethod.type === 'bank' && (
                <>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      {isRTL ? 'رقم الحساب' : 'Account Number'}
                    </Label>
                    <Input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      IBAN
                    </Label>
                    <Input
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Wallet fields */}
              {(editingMethod.type === 'wallet' || editingMethod.type === 'instant') && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {isRTL ? 'رقم الهاتف' : 'Phone Number'}
                  </Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    dir="ltr"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {isRTL ? 'ملاحظات' : 'Notes'}
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setIsEditDialogOpen(false); }}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleEdit} disabled={!canSubmitEdit}>
              {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Sheet (Readonly) */}
      <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {isRTL ? 'تفاصيل طريقة الدفع' : 'Payment Method Details'}
            </SheetTitle>
            {viewingMethod && (
              <SheetDescription className="flex items-center gap-2">
                <span>{getTypeConfig(viewingMethod.type)?.icon}</span>
                {isRTL ? viewingMethod.providerNameAr : viewingMethod.providerName}
              </SheetDescription>
            )}
          </SheetHeader>

          {viewingMethod && (
            <div className="mt-6 space-y-4">
              <Card className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'النوع' : 'Type'}
                  </p>
                  <p className="font-medium flex items-center gap-2">
                    <span>{getTypeConfig(viewingMethod.type)?.icon}</span>
                    {isRTL 
                      ? getTypeConfig(viewingMethod.type)?.labelAr 
                      : getTypeConfig(viewingMethod.type)?.labelEn
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL 
                      ? (viewingMethod.type === 'bank' ? 'البنك' : 'المحفظة')
                      : (viewingMethod.type === 'bank' ? 'Bank' : 'Provider')
                    }
                  </p>
                  <p className="font-medium">
                    {isRTL ? viewingMethod.providerNameAr : viewingMethod.providerName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'الاسم الكامل' : 'Full Name'}
                  </p>
                  <p className="font-medium">{viewingMethod.fullName}</p>
                </div>

                {viewingMethod.type === 'bank' && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? 'رقم الحساب' : 'Account Number'}
                      </p>
                      <p className="font-mono font-medium">{viewingMethod.accountNumber}</p>
                    </div>

                    {viewingMethod.iban && (
                      <div>
                        <p className="text-xs text-muted-foreground">IBAN</p>
                        <p className="font-mono font-medium text-sm">{viewingMethod.iban}</p>
                      </div>
                    )}
                  </>
                )}

                {(viewingMethod.type === 'wallet' || viewingMethod.type === 'instant') && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'رقم الهاتف' : 'Phone Number'}
                    </p>
                    <p className="font-mono font-medium" dir="ltr">{viewingMethod.phoneNumber}</p>
                  </div>
                )}

                {viewingMethod.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'ملاحظات' : 'Notes'}
                    </p>
                    <p className="text-sm">{viewingMethod.notes}</p>
                  </div>
                )}
              </Card>

              {viewingMethod.isDefault && (
                <Badge className="w-full justify-center py-2">
                  {isRTL ? 'طريقة الدفع الافتراضية' : 'Default Payment Method'}
                </Badge>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? 'حذف طريقة الدفع؟' : 'Delete Payment Method?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL 
                ? 'هل أنت متأكد من حذف طريقة الدفع هذه؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this payment method? This action cannot be undone.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              {isRTL ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Hook to get saved payment methods via decryption RPC
export function useSavedPaymentMethods(countryCode?: string) {
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.rpc('get_my_payment_methods');
      if (error) return;

      const mapped = (data || []).map((m: any) => ({
        id: m.id,
        countryCode: m.country,
        type: (m.type || 'bank') as PaymentMethodType,
        providerName: m.provider_name,
        providerNameAr: m.provider_name_ar || undefined,
        fullName: m.full_name,
        accountNumber: m.account_number || undefined,
        iban: m.iban || undefined,
        phoneNumber: m.phone_number || undefined,
        notes: m.notes || undefined,
        isDefault: m.is_default,
        createdAt: new Date(m.created_at),
      }));

      setMethods(countryCode ? mapped.filter((m: SavedPaymentMethod) => m.countryCode === countryCode) : mapped);
    };
    load();
  }, [countryCode]);

  return methods;
}

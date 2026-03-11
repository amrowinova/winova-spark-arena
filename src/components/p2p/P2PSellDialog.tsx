import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, Timer, AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { P2PAmountSelector } from './P2PAmountSelector';
import { P2POffer } from './P2POfferCard';
import { P2PPaymentMethodSelector } from './P2PPaymentMethodSelector';
import { 
  SavedPaymentMethod, 
  useSavedPaymentMethods, 
  COUNTRY_PROVIDERS, 
  PAYMENT_METHOD_TYPES,
  PaymentMethodType,
} from './P2PPaymentMethodsManager';
import { cn } from '@/lib/utils';



interface P2PSellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: P2POffer | null; // This is a BUY offer from a buyer
  onConfirm: (amount: number, selectedPaymentMethod: SavedPaymentMethod) => void;
  isSubmitting?: boolean;
}

export function P2PSellDialog({
  open,
  onOpenChange,
  offer,
  onConfirm,
  isSubmitting = false,
}: P2PSellDialogProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const paymentMethods = useSavedPaymentMethods(offer?.country.code);

  const [amount, setAmount] = useState<number | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  
  // Inline add/edit account state
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form state
  const [selectedType, setSelectedType] = useState<PaymentMethodType | ''>('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Refresh payment methods
  const [localMethods, setLocalMethods] = useState<SavedPaymentMethod[]>([]);
  
  useEffect(() => {
    if (offer) {
      refreshMethods();
    }
  }, [offer, paymentMethods]);

  // Auto-select default payment method when dialog opens
  useEffect(() => {
    if (open && localMethods.length > 0 && !selectedPaymentMethodId) {
      const defaultMethod = localMethods.find(m => m.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethodId(defaultMethod.id);
      } else {
        setSelectedPaymentMethodId(localMethods[0].id);
      }
    }
  }, [open, localMethods, selectedPaymentMethodId]);
  
  const refreshMethods = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let query = supabase.from('payment_methods').select('*').eq('user_id', user.id);
    if (offer?.country.code) {
      query = query.eq('country', offer.country.code);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Failed to load payment methods:', error);
      return;
    }
    setLocalMethods((data || []).map((m: any) => ({
      id: m.id,
      countryCode: m.country,
      type: (m.type || 'bank') as PaymentMethodType,
      providerName: m.provider_name,
      providerNameAr: m.provider_name_ar || undefined,
      fullName: m.full_name,
      accountNumber: m.account_number || undefined,
      phoneNumber: m.phone_number || undefined,
      isDefault: m.is_default,
      createdAt: new Date(m.created_at),
    })));
  };

  const handleSetDefault = async (id: string) => {
    const countryMethodIds = localMethods.map(m => m.id);
    for (const mid of countryMethodIds) {
      await supabase.from('payment_methods').update({ is_default: mid === id }).eq('id', mid);
    }
    await refreshMethods();
  };

  if (!offer) return null;

  const countryProviders = COUNTRY_PROVIDERS[offer.country.code] || [];
  const filteredProviders = selectedType 
    ? countryProviders.filter(p => p.type === selectedType)
    : countryProviders;
  const selectedProvider = countryProviders.find(p => p.id === selectedProviderId);
  const isBank = selectedProvider?.type === 'bank';
  const isWallet = selectedProvider?.type === 'wallet' || selectedProvider?.type === 'instant';

  const selectedPaymentMethod = localMethods.find(m => m.id === selectedPaymentMethodId);
  const total = amount ? amount * offer.price : 0;
  const canConfirm = amount && amount <= offer.amount && selectedPaymentMethod;

  const resetForm = () => {
    setSelectedType('');
    setSelectedProviderId('');
    setFullName('');
    setAccountNumber('');
    setPhoneNumber('');
  };

  const handleConfirm = () => {
    if (!canConfirm || !selectedPaymentMethod) return;
    onConfirm(amount!, selectedPaymentMethod);
    setAmount(null);
    setSelectedPaymentMethodId('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAmount(null);
      setSelectedPaymentMethodId('');
      setIsAddingAccount(false);
      setEditingAccountId(null);
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleAddAccount = async () => {
    if (!selectedProvider || !fullName) return;
    if (isBank && !accountNumber) return;
    if (isWallet && !phoneNumber) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from('payment_methods').insert({
      user_id: user.id,
      country: offer.country.code,
      type: selectedProvider.type,
      provider_name: selectedProvider.name,
      provider_name_ar: selectedProvider.nameAr,
      full_name: fullName,
      account_number: isBank ? accountNumber : null,
      phone_number: isWallet ? phoneNumber : null,
      is_default: localMethods.length === 0,
    }).select('id').single();

    resetForm();
    setIsAddingAccount(false);
    await refreshMethods();
    if (data) setSelectedPaymentMethodId(data.id);
  };

  const handleEditAccount = async () => {
    if (!editingAccountId || !fullName) return;
    const editingMethod = localMethods.find(m => m.id === editingAccountId);
    if (!editingMethod) return;
    
    const isEditBank = editingMethod.type === 'bank';
    const isEditWallet = editingMethod.type === 'wallet' || editingMethod.type === 'instant';
    
    if (isEditBank && !accountNumber) return;
    if (isEditWallet && !phoneNumber) return;

    await supabase.from('payment_methods').update({
      full_name: fullName,
      account_number: isEditBank ? accountNumber : null,
      phone_number: isEditWallet ? phoneNumber : null,
    }).eq('id', editingAccountId);
    
    resetForm();
    setEditingAccountId(null);
    await refreshMethods();
  };

  const handleDeleteAccount = async (id: string) => {
    await supabase.from('payment_methods').delete().eq('id', id);
    
    if (selectedPaymentMethodId === id) {
      setSelectedPaymentMethodId('');
    }
    setDeleteConfirmId(null);
    await refreshMethods();
  };

  const openEditForm = (method: SavedPaymentMethod) => {
    setEditingAccountId(method.id);
    setFullName(method.fullName);
    setAccountNumber(method.accountNumber || '');
    setPhoneNumber(method.phoneNumber || '');
  };

  const canSubmitAdd = selectedProvider && fullName.trim() && (
    (isBank && accountNumber.trim()) ||
    (isWallet && phoneNumber.trim())
  );

  const editingMethod = localMethods.find(m => m.id === editingAccountId);
  const canSubmitEdit = editingMethod && fullName.trim() && (
    (editingMethod.type === 'bank' && accountNumber.trim()) ||
    ((editingMethod.type === 'wallet' || editingMethod.type === 'instant') && phoneNumber.trim())
  );

  const getTypeConfig = (type: PaymentMethodType) => 
    PAYMENT_METHOD_TYPES.find(t => t.id === type);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'بيع Nova' : 'Sell Nova'}
            </DialogTitle>
            <DialogDescription>
              {isRTL ? 'إلى' : 'To'} {isRTL ? offer.user.nameAr : offer.user.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Buyer Info */}
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center text-2xl border border-border">
                    {offer.user.avatar}
                  </div>
                  <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full bg-success border-2 border-card" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">
                    {isRTL ? offer.user.nameAr : offer.user.name}
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-warning">
                      <Star className="h-4 w-4 fill-warning" />
                      <span className="font-semibold">{(offer.user.rating * 20).toFixed(0)}%</span>
                    </div>
                    <span className="text-muted-foreground">
                      {offer.user.completedTrades} {isRTL ? 'صفقة' : 'trades'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Offer Details */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {isRTL ? 'السعر' : 'Price'}
                </p>
                <p className="text-lg font-bold">
                  {offer.currencySymbol} {offer.price.toFixed(2)}
                </p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {isRTL ? 'يريد شراء' : 'Wants to buy'}
                </p>
                <p className="text-lg font-bold text-nova">
                  И {offer.amount}
                </p>
              </Card>
            </div>

            {/* Payment Methods Buyer Accepts */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {isRTL ? 'طرق الدفع المقبولة للمشتري' : 'Buyer Accepts'}
              </p>
              <div className="flex flex-wrap gap-2">
                {offer.paymentMethods.map((method) => (
                  <Badge key={method.id} variant="secondary" className="gap-1.5 py-1.5">
                    <span>{method.icon}</span>
                    <span>{isRTL ? method.nameAr : method.name}</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Select Your Bank Account - New Improved Selector */}
            <P2PPaymentMethodSelector
              methods={localMethods}
              selectedMethodId={selectedPaymentMethodId}
              onSelect={setSelectedPaymentMethodId}
              onAddNew={() => setIsAddingAccount(true)}
              onEdit={(method) => openEditForm(method)}
              onDelete={(id) => handleDeleteAccount(id)}
              onSetDefault={handleSetDefault}
            />

            {/* Inline Add Account Form */}
            {isAddingAccount && (
              <Card className="p-4 border-primary/50 bg-primary/5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      {isRTL ? 'إضافة حساب جديد' : 'Add New Account'}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs"
                      onClick={() => { resetForm(); setIsAddingAccount(false); }}
                    >
                      {isRTL ? 'إلغاء' : 'Cancel'}
                    </Button>
                  </div>
                  
                  {/* Payment Type */}
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHOD_TYPES.map((type) => (
                      <Button
                        key={type.id}
                        type="button"
                        variant={selectedType === type.id ? 'default' : 'outline'}
                        className="h-auto py-2 flex-col gap-1"
                        size="sm"
                        onClick={() => {
                          setSelectedType(type.id);
                          setSelectedProviderId('');
                        }}
                      >
                        <span className="text-lg">{type.icon}</span>
                        <span className="text-[10px]">
                          {isRTL ? type.labelAr : type.labelEn}
                        </span>
                      </Button>
                    ))}
                  </div>

                  {/* Provider */}
                  {selectedType && (
                    <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                      <SelectTrigger className="h-9">
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
                  )}

                  {/* Dynamic Fields */}
                  {selectedProvider && (
                    <>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={isRTL ? 'الاسم الكامل' : 'Full Name'}
                        className="h-9"
                      />
                      {isBank && (
                        <Input
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder={isRTL ? 'رقم الحساب' : 'Account Number'}
                          className="h-9"
                        />
                      )}
                      {isWallet && (
                        <Input
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder={isRTL ? 'رقم الهاتف' : 'Phone Number'}
                          className="h-9"
                          dir="ltr"
                        />
                      )}
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={handleAddAccount}
                        disabled={!canSubmitAdd}
                      >
                        {isRTL ? 'حفظ الحساب' : 'Save Account'}
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* Inline Edit Account Form */}
            {editingAccountId && editingMethod && (
              <Card className="p-4 border-primary/50 bg-primary/5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm flex items-center gap-2">
                      <Pencil className="h-4 w-4" />
                      {isRTL ? 'تعديل الحساب' : 'Edit Account'}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs"
                      onClick={() => { resetForm(); setEditingAccountId(null); }}
                    >
                      {isRTL ? 'إلغاء' : 'Cancel'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{getTypeConfig(editingMethod.type)?.icon}</span>
                    <span>{isRTL ? editingMethod.providerNameAr : editingMethod.providerName}</span>
                  </div>
                  
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isRTL ? 'الاسم الكامل' : 'Full Name'}
                    className="h-9"
                  />
                  
                  {editingMethod.type === 'bank' && (
                    <Input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder={isRTL ? 'رقم الحساب' : 'Account Number'}
                      className="h-9"
                    />
                  )}
                  
                  {(editingMethod.type === 'wallet' || editingMethod.type === 'instant') && (
                    <Input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder={isRTL ? 'رقم الهاتف' : 'Phone Number'}
                      className="h-9"
                      dir="ltr"
                    />
                  )}
                  
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={handleEditAccount}
                    disabled={!canSubmitEdit}
                  >
                    {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
                  </Button>
                </div>
              </Card>
            )}

            {/* Amount Selector */}
            <P2PAmountSelector
              value={amount}
              onChange={setAmount}
              maxAmount={offer.amount}
            />

            {/* Order Summary */}
            {amount && (
              <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'ستبيع' : "You'll sell"}
                    </p>
                    <p className="text-xl font-bold text-nova">И {amount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'ستستلم' : "You'll receive"}
                    </p>
                    <p className="text-xl font-bold text-success">
                      {offer.currencySymbol} {total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Warning about escrow */}
            <Card className="p-3 bg-info/10 border-info/30">
              <div className="flex items-start gap-2">
                <Timer className="h-4 w-4 text-info shrink-0 mt-0.5" />
                <p className="text-xs text-info">
                  {isRTL 
                    ? `سيتم حجز Nova في الضمان حتى يؤكد المشتري الدفع. المهلة: ${offer.timeLimit} دقيقة`
                    : `Nova will be held in escrow until buyer confirms payment. Time limit: ${offer.timeLimit} minutes`
                  }
                </p>
              </div>
            </Card>

            {/* Confirm Button */}
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleConfirm}
              disabled={!canConfirm || isSubmitting}
            >
              {isSubmitting ? (isRTL ? 'جاري الإنشاء...' : 'Creating...') : (isRTL ? 'متابعة وبدء الصفقة' : 'Continue & Start Trade')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? 'حذف الحساب؟' : 'Delete Account?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL 
                ? 'هل أنت متأكد من حذف هذا الحساب؟'
                : 'Are you sure you want to delete this account?'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDeleteAccount(deleteConfirmId)}
            >
              {isRTL ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

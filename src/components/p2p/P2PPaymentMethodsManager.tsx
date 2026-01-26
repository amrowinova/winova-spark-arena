import { useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard, Building, Phone, User, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { useLanguage } from '@/contexts/LanguageContext';
import { CountryConfig, PaymentMethod } from './P2PCountrySelector';
import { cn } from '@/lib/utils';

export interface SavedPaymentMethod {
  id: string;
  countryCode: string;
  methodId: string;
  methodName: string;
  methodNameAr: string;
  methodIcon: string;
  fullName: string;
  accountNumber: string;
  iban?: string;
  phoneNumber?: string;
  isDefault?: boolean;
  createdAt: Date;
}

interface P2PPaymentMethodsManagerProps {
  country: CountryConfig;
  savedMethods: SavedPaymentMethod[];
  onAddMethod: (method: Omit<SavedPaymentMethod, 'id' | 'createdAt'>) => void;
  onEditMethod: (id: string, method: Partial<SavedPaymentMethod>) => void;
  onDeleteMethod: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export function P2PPaymentMethodsManager({
  country,
  savedMethods,
  onAddMethod,
  onEditMethod,
  onDeleteMethod,
  onSetDefault,
}: P2PPaymentMethodsManagerProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingMethod, setEditingMethod] = useState<SavedPaymentMethod | null>(null);

  // Form state
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const countryMethods = savedMethods.filter(m => m.countryCode === country.code);

  const resetForm = () => {
    setSelectedMethodId('');
    setFullName('');
    setAccountNumber('');
    setIban('');
    setPhoneNumber('');
  };

  const handleAdd = () => {
    const method = country.paymentMethods.find(m => m.id === selectedMethodId);
    if (!method || !fullName || !accountNumber) return;

    onAddMethod({
      countryCode: country.code,
      methodId: method.id,
      methodName: method.name,
      methodNameAr: method.nameAr,
      methodIcon: method.icon,
      fullName,
      accountNumber,
      iban: iban || undefined,
      phoneNumber: phoneNumber || undefined,
      isDefault: countryMethods.length === 0,
    });

    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEdit = () => {
    if (!editingMethod || !fullName || !accountNumber) return;

    onEditMethod(editingMethod.id, {
      fullName,
      accountNumber,
      iban: iban || undefined,
      phoneNumber: phoneNumber || undefined,
    });

    resetForm();
    setEditingMethod(null);
    setIsEditDialogOpen(false);
  };

  const openEditDialog = (method: SavedPaymentMethod) => {
    setEditingMethod(method);
    setFullName(method.fullName);
    setAccountNumber(method.accountNumber);
    setIban(method.iban || '');
    setPhoneNumber(method.phoneNumber || '');
    setIsEditDialogOpen(true);
  };

  const canSubmit = selectedMethodId && fullName.trim() && accountNumber.trim();
  const canEditSubmit = fullName.trim() && accountNumber.trim();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">
            {isRTL ? 'طرق الدفع المحفوظة' : 'Saved Payment Methods'}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {country.flag} {country.currency}
          </Badge>
        </div>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" />
          {isRTL ? 'إضافة' : 'Add'}
        </Button>
      </div>

      {/* Methods List */}
      {countryMethods.length === 0 ? (
        <Card className="p-6 text-center border-dashed">
          <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">
            {isRTL 
              ? 'لا توجد طرق دفع محفوظة لهذه الدولة'
              : 'No saved payment methods for this country'
            }
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 me-1" />
            {isRTL ? 'إضافة طريقة دفع' : 'Add Payment Method'}
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {countryMethods.map((method) => (
            <Card 
              key={method.id} 
              className={cn(
                "p-3 transition-all",
                method.isDefault && "border-primary/50 bg-primary/5"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{method.methodIcon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {isRTL ? method.methodNameAr : method.methodName}
                    </p>
                    {method.isDefault && (
                      <Badge variant="default" className="text-[10px]">
                        {isRTL ? 'افتراضي' : 'Default'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{method.fullName}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    {method.accountNumber}
                  </p>
                  {method.iban && (
                    <p className="text-xs font-mono text-muted-foreground">
                      IBAN: {method.iban}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!method.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onSetDefault(method.id)}
                      title={isRTL ? 'تعيين كافتراضي' : 'Set as default'}
                    >
                      <Badge variant="outline" className="text-[10px]">
                        {isRTL ? 'افتراضي' : 'Default'}
                      </Badge>
                    </Button>
                  )}
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
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
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
            {/* Payment Method Select */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                {isRTL ? 'نوع طريقة الدفع' : 'Payment Method Type'}
              </Label>
              <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'اختر طريقة الدفع' : 'Select payment method'} />
                </SelectTrigger>
                <SelectContent>
                  {country.paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      <span className="flex items-center gap-2">
                        <span>{method.icon}</span>
                        <span>{isRTL ? method.nameAr : method.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {isRTL ? 'الاسم الكامل' : 'Full Name'}
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isRTL ? 'الاسم كما يظهر في الحساب' : 'Name as it appears on account'}
              />
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                {isRTL ? 'رقم الحساب / المحفظة' : 'Account / Wallet Number'}
              </Label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={isRTL ? 'رقم الحساب أو المحفظة' : 'Account or wallet number'}
              />
            </div>

            {/* IBAN (optional) */}
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

            {/* Phone Number (optional) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {isRTL ? 'رقم الهاتف (اختياري)' : 'Phone Number (optional)'}
              </Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+966..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setIsAddDialogOpen(false); }}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleAdd} disabled={!canSubmit}>
              {isRTL ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              {isRTL ? 'تعديل طريقة الدفع' : 'Edit Payment Method'}
            </DialogTitle>
            {editingMethod && (
              <DialogDescription className="flex items-center gap-2">
                <span>{editingMethod.methodIcon}</span>
                {isRTL ? editingMethod.methodNameAr : editingMethod.methodName}
              </DialogDescription>
            )}
          </DialogHeader>

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

            {/* Account Number */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                {isRTL ? 'رقم الحساب / المحفظة' : 'Account / Wallet Number'}
              </Label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>

            {/* IBAN */}
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

            {/* Phone Number */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {isRTL ? 'رقم الهاتف' : 'Phone Number'}
              </Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setIsEditDialogOpen(false); }}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleEdit} disabled={!canEditSubmit}>
              {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              onClick={() => {
                if (deleteConfirmId) {
                  onDeleteMethod(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              {isRTL ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

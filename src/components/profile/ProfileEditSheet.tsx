import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Link as LinkIcon, Plus, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { banner } from '@/contexts/BannerContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ProfileEditSheetProps {
  open: boolean;
  onClose: () => void;
}

// Real function to check username availability in database
const checkUsernameAvailability = async (username: string, currentUserId?: string): Promise<boolean> => {
  try {
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase());
    
    // Exclude current user from check
    if (currentUserId) {
      query = query.neq('user_id', currentUserId);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) {
      console.error('Error checking username:', error);
      return false;
    }
    
    return !data; // Available if no matching user found
  } catch {
    return false;
  }
};

export function ProfileEditSheet({ open, onClose }: ProfileEditSheetProps) {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const { user: authUser } = useAuth();
  const isRTL = i18n.language === 'ar';
  
  // Form state
  const [avatar, setAvatar] = useState(user.avatar);
  const [displayName, setDisplayName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState('');
  const [links, setLinks] = useState<string[]>(['']);
  
  // Username validation state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);

  // Check username availability with debounce
  useEffect(() => {
    if (username === user.username) {
      setUsernameAvailable(null);
      setUsernameError('');
      return;
    }

    if (username.length < 3) {
      setUsernameAvailable(null);
      setUsernameError(username.length > 0 ? (isRTL ? 'يجب أن يكون 3 أحرف على الأقل' : 'Must be at least 3 characters') : '');
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      setUsernameAvailable(null);
      setUsernameError(isRTL ? 'أحرف وأرقام و _ فقط' : 'Letters, numbers, and _ only');
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      setUsernameError('');
      try {
        const available = await checkUsernameAvailability(username, authUser?.id);
        setUsernameAvailable(available);
        if (!available) {
          setUsernameError(isRTL ? 'اسم المستخدم محجوز' : 'Username is taken');
        }
      } catch {
        setUsernameError(isRTL ? 'خطأ في التحقق' : 'Error checking availability');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, user.username, isRTL]);

  const handleAvatarChange = () => {
    // In a real app, this would open a file picker
    banner.info(isRTL ? 'سيتم دعم تحميل الصور قريباً' : 'Image upload coming soon');
  };

  const addLink = () => {
    if (links.length < 5) {
      setLinks([...links, '']);
    }
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const handleSave = async () => {
    // Validation
    if (!displayName.trim()) {
      banner.error(isRTL ? 'الاسم مطلوب' : 'Name is required');
      return;
    }

    if (username !== user.username && !usernameAvailable) {
      banner.error(isRTL ? 'اسم المستخدم غير متاح' : 'Username is not available');
      return;
    }

    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real app, you would update the user context here
    banner.success(isRTL ? 'تم حفظ التغييرات' : 'Changes saved');
    setIsSaving(false);
    onClose();
  };

  const handleCancel = () => {
    // Reset form to original values
    setAvatar(user.avatar);
    setDisplayName(user.name);
    setUsername(user.username);
    setBio('');
    setLinks(['']);
    setUsernameAvailable(null);
    setUsernameError('');
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] rounded-t-3xl overflow-hidden flex flex-col"
      >
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-center">
            {isRTL ? 'تعديل الملف الشخصي' : 'Edit Profile'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={avatar} alt={displayName} />
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarChange}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleAvatarChange}
              className="mt-2 text-sm text-primary font-medium"
            >
              {isRTL ? 'تغيير الصورة' : 'Change Photo'}
            </button>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">
              {isRTL ? 'الاسم' : 'Name'}
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={isRTL ? 'أدخل اسمك' : 'Enter your name'}
              className="h-12"
              maxLength={50}
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">
              {isRTL ? 'اسم المستخدم' : 'Username'}
            </Label>
            <div className="relative">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder={isRTL ? 'اسم المستخدم' : 'username'}
                className={cn(
                  "h-12 pr-10",
                  usernameError && "border-destructive focus-visible:ring-destructive"
                )}
                maxLength={30}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isCheckingUsername && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!isCheckingUsername && usernameAvailable === true && (
                  <Check className="h-4 w-4 text-success" />
                )}
                {!isCheckingUsername && usernameAvailable === false && (
                  <X className="h-4 w-4 text-destructive" />
                )}
              </div>
            </div>
            {usernameError && (
              <p className="text-xs text-destructive">{usernameError}</p>
            )}
            {!isCheckingUsername && usernameAvailable === true && (
              <p className="text-xs text-success">
                {isRTL ? 'اسم المستخدم متاح ✓' : 'Username is available ✓'}
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">
              {isRTL ? 'السيرة الذاتية' : 'Bio'}
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={isRTL ? 'اكتب شيئاً عن نفسك...' : 'Write something about yourself...'}
              className="min-h-[100px] resize-none"
              maxLength={150}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/150
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <Label>
              {isRTL ? 'الروابط' : 'Links'}
              <span className="text-muted-foreground text-xs mx-2">
                ({isRTL ? 'اختياري' : 'optional'})
              </span>
            </Label>
            
            {links.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={link}
                    onChange={(e) => updateLink(index, e.target.value)}
                    placeholder="https://"
                    className="h-11 pl-10"
                  />
                </div>
                {links.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLink(index)}
                    className="h-11 w-11 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            {links.length < 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={addLink}
                className="text-primary"
              >
                <Plus className="h-4 w-4 mr-1" />
                {isRTL ? 'إضافة رابط' : 'Add Link'}
              </Button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-border pt-4 pb-safe flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={handleCancel}
            disabled={isSaving}
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            className="flex-1 h-12 bg-primary hover:bg-primary/90"
            onClick={handleSave}
            disabled={isSaving || (username !== user.username && !usernameAvailable)}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isRTL ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              isRTL ? 'حفظ التغييرات' : 'Save Changes'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Shield, Crown, UserCog, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserRoleManagerProps {
  userId: string;
  currentRoles: string[];
  onRolesChange?: () => void;
}

type AppRole = 'admin' | 'support' | 'moderator' | 'user';

const ROLE_CONFIG: Record<AppRole, { 
  icon: React.ElementType; 
  labelEn: string; 
  labelAr: string; 
  color: string;
  description: string;
  descriptionAr: string;
}> = {
  admin: {
    icon: Crown,
    labelEn: 'Admin',
    labelAr: 'مدير',
    color: 'bg-destructive/10 text-destructive border-destructive/30',
    description: 'Full system access',
    descriptionAr: 'وصول كامل للنظام',
  },
  support: {
    icon: Shield,
    labelEn: 'Support',
    labelAr: 'دعم فني',
    color: 'bg-primary/10 text-primary border-primary/30',
    description: 'Handle tickets & disputes',
    descriptionAr: 'التعامل مع التذاكر والنزاعات',
  },
  moderator: {
    icon: UserCog,
    labelEn: 'Moderator',
    labelAr: 'مشرف',
    color: 'bg-warning/10 text-warning border-warning/30',
    description: 'Content moderation',
    descriptionAr: 'إدارة المحتوى',
  },
  user: {
    icon: UserCog,
    labelEn: 'User',
    labelAr: 'مستخدم',
    color: 'bg-muted text-muted-foreground border-border',
    description: 'Default role',
    descriptionAr: 'الدور الافتراضي',
  },
};

export function UserRoleManager({ userId, currentRoles, onRolesChange }: UserRoleManagerProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [roles, setRoles] = useState<string[]>(currentRoles);
  const [loading, setLoading] = useState<string | null>(null);

  const toggleRole = async (role: AppRole) => {
    if (role === 'user') return; // User role is always present
    
    setLoading(role);
    const hasRole = roles.includes(role);

    try {
      if (hasRole) {
        // Remove role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);

        if (error) throw error;
        
        setRoles(prev => prev.filter(r => r !== role));
        toast.success(
          isRTL 
            ? `تم إزالة دور ${ROLE_CONFIG[role].labelAr}` 
            : `Removed ${ROLE_CONFIG[role].labelEn} role`
        );
      } else {
        // Add role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });

        if (error) throw error;
        
        setRoles(prev => [...prev, role]);
        toast.success(
          isRTL 
            ? `تم إضافة دور ${ROLE_CONFIG[role].labelAr}` 
            : `Added ${ROLE_CONFIG[role].labelEn} role`
        );
      }
      
      onRolesChange?.();
    } catch (error) {
      console.error('Error toggling role:', error);
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setLoading(null);
    }
  };

  const manageableRoles: AppRole[] = ['admin', 'support', 'moderator'];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">{isRTL ? 'إدارة الأدوار' : 'Role Management'}</h3>
      </div>

      {/* Current Roles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {roles.map((role) => {
          const config = ROLE_CONFIG[role as AppRole] || ROLE_CONFIG.user;
          const Icon = config.icon;
          return (
            <Badge key={role} variant="outline" className={config.color}>
              <Icon className="w-3 h-3 me-1" />
              {isRTL ? config.labelAr : config.labelEn}
            </Badge>
          );
        })}
      </div>

      {/* Role Toggles */}
      <div className="space-y-3">
        {manageableRoles.map((role) => {
          const config = ROLE_CONFIG[role];
          const Icon = config.icon;
          const hasRole = roles.includes(role);
          const isLoading = loading === role;

          return (
            <div 
              key={role}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {isRTL ? config.labelAr : config.labelEn}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? config.descriptionAr : config.description}
                  </p>
                </div>
              </div>
              
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={hasRole}
                  onCheckedChange={() => toggleRole(role)}
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDirectLeader } from '@/hooks/useDirectLeader';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, User, Crown, UserCheck } from 'lucide-react';

const rankLabels: Record<string, { en: string; ar: string; color: string }> = {
  subscriber: { en: 'Subscriber', ar: 'مشترك', color: 'bg-muted text-muted-foreground' },
  marketer: { en: 'Marketer', ar: 'مسوق', color: 'bg-primary/10 text-primary' },
  leader: { en: 'Leader', ar: 'قائد', color: 'bg-success/10 text-success' },
  manager: { en: 'Manager', ar: 'مدير', color: 'bg-warning/10 text-warning' },
  president: { en: 'President', ar: 'رئيس', color: 'bg-destructive/10 text-destructive' },
};

export function DirectLeaderCard() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  
  const { leader, hasLeader, loading } = useDirectLeader();

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-5 w-5 text-primary" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </Card>
    );
  }

  if (!hasLeader || !leader) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">
            {isRTL ? 'مسؤولك المباشر' : 'My Direct Leader'}
          </h3>
        </div>
        <div className="flex items-center gap-3 py-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'لم يتم تعيين مسؤول بعد' : 'No leader assigned yet'}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {isRTL ? 'سيتم ربطك تلقائيًا عند التسجيل' : 'You will be linked automatically upon signup'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const rankInfo = rankLabels[leader.rank] || rankLabels.subscriber;

  const handleMessage = () => {
    // Navigate to DM with this user
    navigate(`/chat?dm=${leader.user_id}`);
  };

  const handleViewProfile = () => {
    navigate(`/user/${leader.username}`);
  };

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Crown className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-sm">
          {isRTL ? 'مسؤولك المباشر' : 'My Direct Leader'}
        </h3>
        <UserCheck className="h-4 w-4 text-success ms-auto" />
      </div>

      {/* Leader Info */}
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-primary/20">
          <AvatarImage src={leader.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {leader.name?.charAt(0) || '👤'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{leader.name}</p>
            <Badge variant="outline" className={`text-[10px] ${rankInfo.color} border-0`}>
              {isRTL ? rankInfo.ar : rankInfo.en}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">@{leader.username}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 gap-1.5"
          onClick={handleMessage}
        >
          <MessageCircle className="h-4 w-4" />
          {isRTL ? 'مراسلة' : 'Message'}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 gap-1.5"
          onClick={handleViewProfile}
        >
          <User className="h-4 w-4" />
          {isRTL ? 'الملف الشخصي' : 'Profile'}
        </Button>
      </div>
    </Card>
  );
}

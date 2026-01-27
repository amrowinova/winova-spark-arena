import { ArrowLeft, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface ProfileHeaderProps {
  username?: string;
}

export function ProfileHeader({ username }: ProfileHeaderProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const handleShare = async () => {
    const shareUrl = username 
      ? `${window.location.origin}/profile/${username}`
      : window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: isRTL ? 'الملف الشخصي' : 'Profile',
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9"
          onClick={handleShare}
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

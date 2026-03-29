import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Copy, Check, Download, QrCode, User, Trophy, Star, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { getCountryFlag } from '@/lib/countryFlags';
import { toast } from 'sonner';
import { RankBadge } from '@/components/common/RankBadge';

interface ShareProfileCardProps {
  username: string;
  name: string;
  avatar?: string;
  country: string;
  rank: string;
  stats: {
    contests: number;
    wins: number;
    followers: number;
  };
  onClose?: () => void;
}

export function ShareProfileCard({
  username,
  name,
  avatar,
  country,
  rank,
  stats,
  onClose
}: ShareProfileCardProps) {
  const { language } = useLanguage();
  const { user } = useUser();
  const isRTL = language === 'ar';
  
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  const profileUrl = `${window.location.origin}/user/${username}`;
  const shareText = isRTL 
    ? `شاهد بروفايل ${name} على Winova! ${profileUrl}`
    : `Check out ${name}'s profile on Winova! ${profileUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast(isRTL ? 'تم نسخ الرابط!' : 'Link copied!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: isRTL ? `بروفايل ${name}` : `${name}'s Profile`,
          text: shareText,
          url: profileUrl
        });
      } else {
        handleCopyLink();
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        handleCopyLink();
      }
    }
  };

  const handleDownloadCard = async () => {
    // This would generate and download a shareable image
    // For now, just copy the link
    handleCopyLink();
  };

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <CardContent className="p-0">
        {/* Share Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              <h3 className="font-semibold">
                {isRTL ? 'مشاركة البروفايل' : 'Share Profile'}
              </h3>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                ×
              </Button>
            )}
          </div>
        </div>

        {/* Profile Preview */}
        <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                <AvatarImage src={avatar} />
                <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1">
                <Star className="h-3 w-3 text-white" />
              </div>
            </div>
            
            <div className="flex-1">
              <h4 className="font-bold text-lg text-gray-900">{name}</h4>
              <p className="text-sm text-gray-600">@{username}</p>
              <div className="flex items-center gap-2 mt-1">
                {getCountryFlag(country)}
                <RankBadge rank={rank} size="sm" />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-purple-600">
                <Trophy className="h-4 w-4" />
                <span className="font-bold text-lg">{stats.wins}</span>
              </div>
              <p className="text-xs text-gray-600">{isRTL ? 'فوز' : 'Wins'}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-pink-600">
                <User className="h-4 w-4" />
                <span className="font-bold text-lg">{stats.followers}</span>
              </div>
              <p className="text-xs text-gray-600">{isRTL ? 'متابعون' : 'Followers'}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-purple-600">
                <Heart className="h-4 w-4" />
                <span className="font-bold text-lg">{stats.contests}</span>
              </div>
              <p className="text-xs text-gray-600">{isRTL ? 'مسابقات' : 'Contests'}</p>
            </div>
          </div>

          {/* QR Code Preview */}
          {showQR && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-4 rounded-lg text-center"
            >
              <QrCode className="h-32 w-32 mx-auto mb-2" />
              <p className="text-xs text-gray-600">{profileUrl}</p>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleShare}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
            >
              <Share2 className="h-4 w-4 mr-2" />
              {isRTL ? 'مشاركة' : 'Share'}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="border-purple-500 text-purple-600 hover:bg-purple-50"
            >
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? (isRTL ? 'تم!' : 'Copied!') : (isRTL ? 'نسخ' : 'Copy')}
            </Button>
          </div>

          {/* Additional Options */}
          <div className="mt-4 pt-4 border-t border-purple-200">
            <div className="flex justify-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQR(!showQR)}
                className="text-purple-600 hover:bg-purple-50"
              >
                <QrCode className="h-4 w-4 mr-1" />
                {showQR ? (isRTL ? 'إخفاء' : 'Hide') : (isRTL ? 'عرض' : 'Show')} QR
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadCard}
                className="text-purple-600 hover:bg-purple-50"
              >
                <Download className="h-4 w-4 mr-1" />
                {isRTL ? 'تحميل' : 'Download'}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 text-center">
          <p className="text-xs text-gray-600">
            {isRTL ? 'انضم إلى Winova وابدأ رحلتك!' : 'Join Winova and start your journey!'}
          </p>
          <p className="text-xs text-purple-600 font-medium mt-1">
            winova.app
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

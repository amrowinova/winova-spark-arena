import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MapPin, Pencil, Circle, Copy, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getCountryFlag } from '@/lib/countryFlags';
import { RankBadge } from '@/components/common/RankBadge';

interface ProfileUserInfoProps {
  user: any;
  isOwnProfile: boolean;
  isLoading: boolean;
  novaIdCopied: boolean;
  setNovaIdCopied: (copied: boolean) => void;
  onEdit: () => void;
  isRTL: boolean;
  t: (key: string) => string;
}

export function ProfileUserInfo({
  user,
  isOwnProfile,
  isLoading,
  novaIdCopied,
  setNovaIdCopied,
  onEdit,
  isRTL,
  t
}: ProfileUserInfoProps) {
  const copyNovaId = () => {
    if (!user.novaId) return;
    navigator.clipboard.writeText(user.novaId).then(() => {
      setNovaIdCopied(true);
      setTimeout(() => setNovaIdCopied(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Avatar and Basic Info Skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        
        {/* Stats Skeleton */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* User Info Section */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-2xl">
              {getCountryFlag(user.country || '')}
              {user.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          {/* Online Status */}
          {user.isOnline && (
            <div className="absolute bottom-1 right-1 h-6 w-6 bg-green-500 rounded-full border-2 border-background" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{user.name}</h1>
          
          {/* Username and Badge */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-muted-foreground">@{user.username}</span>
            {user.rank && <RankBadge rank={user.rank} size="sm" />}
          </div>

          {/* Location */}
          {user.country && (
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{user.country}</span>
            </div>
          )}

          {/* Bio */}
          {user.bio && (
            <p className="text-sm text-muted-foreground max-w-md">
              {isRTL ? user.bioAr || user.bio : user.bio}
            </p>
          )}

          {/* Engagement Status Badge */}
          <Badge
            className={cn(
              user.engagementStatus === 'both' 
                ? "bg-success/15 text-success border-success/30" 
                : user.engagementStatus === 'contest' || user.engagementStatus === 'vote'
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-muted/50 text-muted-foreground border-border"
            )}
            variant="outline"
          >
            <Circle className={cn(
              "h-2 w-2 fill-current",
              user.engagementStatus === 'both' 
                ? "text-success" 
                : user.engagementStatus === 'contest' || user.engagementStatus === 'vote'
                  ? "text-primary"
                  : "text-muted-foreground"
            )} />
            {t(`profile.engagement.${user.engagementStatus}`)}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isOwnProfile && (
            <Button onClick={onEdit} variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              {isRTL ? 'تعديل' : 'Edit'}
            </Button>
          )}
          
          {/* Nova ID Copy */}
          <Button
            onClick={copyNovaId}
            variant="outline"
            size="sm"
            className="font-mono"
          >
            {novaIdCopied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {user.novaId}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Trophy, Users, Gift, Zap, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useSocialFeed } from '@/hooks/useSocialFeed';
import { getCountryFlag } from '@/lib/countryFlags';
import { formatDistanceToNow } from '@/lib/utils';

interface FeedItem {
  id: string;
  type: 'achievement' | 'contest_win' | 'milestone' | 'team_earning' | 'referral';
  userId: string;
  username: string;
  avatar?: string;
  country: string;
  message: string;
  metadata?: {
    prize?: number;
    achievement?: string;
    milestone?: string;
    earnings?: number;
    referrals?: number;
  };
  timestamp: Date;
  likes: number;
  comments: number;
  isLiked: boolean;
}

export function SocialFeed() {
  const { language } = useLanguage();
  const { user } = useUser();
  const isRTL = language === 'ar';
  
  const { feedItems, isLoading, likeItem, commentItem } = useSocialFeed();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to top on new items
    if (scrollAreaRef.current && feedItems.length > 0) {
      scrollAreaRef.current.scrollTop = 0;
    }
  }, [feedItems]);

  const handleLike = async (itemId: string) => {
    await likeItem(itemId);
  };

  const handleComment = async (itemId: string) => {
    await commentItem(itemId);
  };

  const getFeedIcon = (type: FeedItem['type']) => {
    switch (type) {
      case 'achievement':
        return <Trophy className="h-4 w-4 text-purple-500" />;
      case 'contest_win':
        return <Gift className="h-4 w-4 text-yellow-500" />;
      case 'milestone':
        return <Zap className="h-4 w-4 text-orange-500" />;
      case 'team_earning':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'referral':
        return <Users className="h-4 w-4 text-blue-500" />;
      default:
        return <Heart className="h-4 w-4 text-gray-500" />;
    }
  };

  const getFeedColor = (type: FeedItem['type']) => {
    switch (type) {
      case 'achievement':
        return 'border-purple-500/20 bg-purple-500/5';
      case 'contest_win':
        return 'border-yellow-500/20 bg-yellow-500/5';
      case 'milestone':
        return 'border-orange-500/20 bg-orange-500/5';
      case 'team_earning':
        return 'border-green-500/20 bg-green-500/5';
      case 'referral':
        return 'border-blue-500/20 bg-blue-500/5';
      default:
        return 'border-gray-500/20 bg-gray-500/5';
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">
              {isRTL ? 'النشاط الاجتماعي' : 'Social Activity'}
            </h3>
          </div>
          
          <Badge variant="secondary" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            {isRTL ? 'حي' : 'Live'}
          </Badge>
        </div>

        {/* Feed */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="space-y-4">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="p-4 rounded-lg border border-border animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-24 mb-2" />
                      <div className="h-3 bg-muted rounded w-16" />
                    </div>
                  </div>
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              ))
            ) : (
              <AnimatePresence>
                {feedItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${getFeedColor(item.type)}`}
                  >
                    {/* User Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={item.avatar} />
                          <AvatarFallback className="text-sm">
                            {item.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {item.username}
                            </span>
                            {item.country && (
                              <span>{getCountryFlag(item.country)}</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(item.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {getFeedIcon(item.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-foreground mb-3">
                      {item.message}
                    </p>

                    {/* Metadata */}
                    {item.metadata && (
                      <div className="mb-3">
                        {item.metadata.prize && (
                          <Badge variant="secondary" className="text-xs">
                            <Gift className="h-3 w-3 mr-1" />
                            {item.metadata.prize} И
                          </Badge>
                        )}
                        {item.metadata.achievement && (
                          <Badge variant="secondary" className="text-xs">
                            <Trophy className="h-3 w-3 mr-1" />
                            {item.metadata.achievement}
                          </Badge>
                        )}
                        {item.metadata.earnings && (
                          <Badge variant="secondary" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {item.metadata.earnings} И
                          </Badge>
                        )}
                        {item.metadata.referrals && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {item.metadata.referrals} {isRTL ? 'إحالات' : 'referrals'}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-3 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(item.id)}
                        className={`flex items-center gap-1 ${item.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
                      >
                        <Heart className={`h-4 w-4 ${item.isLiked ? 'fill-current' : ''}`} />
                        <span className="text-xs">{item.likes}</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleComment(item.id)}
                        className="flex items-center gap-1 text-muted-foreground"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-xs">{item.comments}</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1 text-muted-foreground"
                      >
                        <Share2 className="h-4 w-4" />
                        <span className="text-xs">{isRTL ? 'مشاركة' : 'Share'}</span>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {/* Empty state */}
            {!isLoading && feedItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {isRTL ? 'لا يوجد نشاط حالياً' : 'No activity yet'}
                </p>
                <p className="text-xs mt-1">
                  {isRTL ? 'كن أول من يشارك إنجازاته!' : 'Be the first to share achievements!'}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {feedItems.length} {isRTL ? 'نشاط' : 'activities'}
            </span>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>{isRTL ? 'محدث كل ثانية' : 'Updated every second'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

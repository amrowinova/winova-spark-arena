import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export function useSocialFeed() {
  const { user: authUser } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!authUser) return;

    // Subscribe to real-time feed updates
    const channel = supabase
      .channel('social-feed')
      .on('broadcast', { event: 'new_activity' }, (payload) => {
        const newItem: FeedItem = {
          id: payload.payload.id || Date.now().toString(),
          type: payload.payload.type,
          userId: payload.payload.userId,
          username: payload.payload.username,
          avatar: payload.payload.avatar,
          country: payload.payload.country,
          message: payload.payload.message,
          metadata: payload.payload.metadata,
          timestamp: new Date(payload.payload.timestamp),
          likes: 0,
          comments: 0,
          isLiked: false,
        };
        
        setFeedItems(prev => [newItem, ...prev].slice(0, 49)); // Keep last 50 items
      })
      .on('broadcast', { event: 'like_update' }, (payload) => {
        setFeedItems(prev => prev.map(item => 
          item.id === payload.payload.itemId
            ? { ...item, likes: payload.payload.likes, isLiked: payload.payload.isLiked }
            : item
        ));
      })
      .on('broadcast', { event: 'comment_update' }, (payload) => {
        setFeedItems(prev => prev.map(item => 
          item.id === payload.payload.itemId
            ? { ...item, comments: payload.payload.comments }
            : item
        ));
      })
      .subscribe((status) => {
        setIsLoading(false);
      });

    channelRef.current = channel;

    // Load initial feed
    loadFeedData();

    return () => {
      channel.unsubscribe();
    };
  }, [authUser]);

  const loadFeedData = async () => {
    try {
      // Simulate initial feed data
      const mockFeed: FeedItem[] = [
        {
          id: '1',
          type: 'contest_win',
          userId: 'user1',
          username: 'Ahmed',
          country: 'SA',
          message: 'فزت في مسابقة اليوم! 🎉',
          metadata: { prize: 500 },
          timestamp: new Date(Date.now() - 300000),
          likes: 23,
          comments: 5,
          isLiked: false,
        },
        {
          id: '2',
          type: 'achievement',
          userId: 'user2',
          username: 'Sarah',
          country: 'AE',
          message: 'حققت إنجاز "Super Voter"! 🏆',
          metadata: { achievement: 'Super Voter' },
          timestamp: new Date(Date.now() - 600000),
          likes: 15,
          comments: 3,
          isLiked: true,
        },
        {
          id: '3',
          type: 'team_earning',
          userId: 'user3',
          username: 'Mohammed',
          country: 'EG',
          message: 'فريقي كسب 1500 Nova هذا الأسبوع! 💰',
          metadata: { earnings: 1500 },
          timestamp: new Date(Date.now() - 900000),
          likes: 8,
          comments: 2,
          isLiked: false,
        },
        {
          id: '4',
          type: 'referral',
          userId: 'user4',
          username: 'Fatima',
          country: 'JO',
          message: 'أحلت 5 أصدقاء جدد! 🎯',
          metadata: { referrals: 5 },
          timestamp: new Date(Date.now() - 1200000),
          likes: 12,
          comments: 4,
          isLiked: false,
        },
        {
          id: '5',
          type: 'milestone',
          userId: 'user5',
          username: 'Omar',
          country: 'QA',
          message: 'وصلت لـ 100 يوم متتالي! 🔥',
          metadata: { milestone: '100 Days' },
          timestamp: new Date(Date.now() - 1500000),
          likes: 45,
          comments: 8,
          isLiked: true,
        },
      ];
      
      setFeedItems(mockFeed);
    } catch (error) {
      console.error('Error loading feed data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const likeItem = async (itemId: string) => {
    if (!authUser) return;

    try {
      // Update local state optimistically
      setFeedItems(prev => prev.map(item => 
        item.id === itemId
          ? { 
              ...item, 
              likes: item.isLiked ? item.likes - 1 : item.likes + 1,
              isLiked: !item.isLiked
            }
          : item
      ));

      // Broadcast update
      channelRef.current?.send({
        type: 'broadcast',
        event: 'like_update',
        payload: {
          itemId,
          likes: feedItems.find(item => item.id === itemId)?.likes || 0,
          isLiked: !feedItems.find(item => item.id === itemId)?.isLiked || false,
        },
      });

      // In real app, save to database
      await supabase
        .from('feed_likes')
        .upsert({
          feed_item_id: itemId,
          user_id: authUser.id,
        });

    } catch (error) {
      console.error('Error liking item:', error);
      // Revert optimistic update
      setFeedItems(prev => prev.map(item => 
        item.id === itemId
          ? { 
              ...item, 
              likes: item.isLiked ? item.likes + 1 : item.likes - 1,
              isLiked: !item.isLiked
            }
          : item
      ));
    }
  };

  const commentItem = async (itemId: string) => {
    if (!authUser) return;

    try {
      // Update local state optimistically
      setFeedItems(prev => prev.map(item => 
        item.id === itemId
          ? { ...item, comments: item.comments + 1 }
          : item
      ));

      // Broadcast update
      channelRef.current?.send({
        type: 'broadcast',
        event: 'comment_update',
        payload: {
          itemId,
          comments: (feedItems.find(item => item.id === itemId)?.comments || 0) + 1,
        },
      });

      // In real app, save comment to database
      await supabase
        .from('feed_comments')
        .insert({
          feed_item_id: itemId,
          user_id: authUser.id,
          comment: 'Great!', // In real app, get from user input
        });

    } catch (error) {
      console.error('Error commenting on item:', error);
      // Revert optimistic update
      setFeedItems(prev => prev.map(item => 
        item.id === itemId
          ? { ...item, comments: item.comments - 1 }
          : item
      ));
    }
  };

  return {
    feedItems,
    isLoading,
    likeItem,
    commentItem,
  };
}

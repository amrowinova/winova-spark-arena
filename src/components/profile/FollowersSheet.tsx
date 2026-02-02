import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Users, UserPlus, UserMinus } from 'lucide-react';

interface FollowersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  initialTab?: 'followers' | 'following';
}

interface FollowUser {
  id: string;
  user_id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  country: string;
  isFollowing?: boolean;
}

export function FollowersSheet({ open, onOpenChange, userId, initialTab = 'followers' }: FollowersSheetProps) {
  const { language } = useLanguage();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      fetchData();
    }
  }, [open, userId, initialTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch followers (people who follow this user)
      const { data: followersData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId);

      // Fetch following (people this user follows)
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      // Get current user's following list for follow button state
      let currentUserFollowing: string[] = [];
      if (currentUser?.id) {
        const { data: myFollowing } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id);
        currentUserFollowing = myFollowing?.map(f => f.following_id) || [];
      }

      // Fetch follower profiles
      if (followersData && followersData.length > 0) {
        const followerIds = followersData.map(f => f.follower_id);
        const { data: followerProfiles } = await supabase
          .from('profiles')
          .select('id, user_id, name, username, avatar_url, country')
          .in('user_id', followerIds);

        setFollowers(
          followerProfiles?.map(p => ({
            ...p,
            isFollowing: currentUserFollowing.includes(p.user_id)
          })) || []
        );
      } else {
        setFollowers([]);
      }

      // Fetch following profiles
      if (followingData && followingData.length > 0) {
        const followingIds = followingData.map(f => f.following_id);
        const { data: followingProfiles } = await supabase
          .from('profiles')
          .select('id, user_id, name, username, avatar_url, country')
          .in('user_id', followingIds);

        setFollowing(
          followingProfiles?.map(p => ({
            ...p,
            isFollowing: currentUserFollowing.includes(p.user_id)
          })) || []
        );
      } else {
        setFollowing([]);
      }
    } catch (error) {
      console.error('Error fetching follow data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!currentUser?.id || currentUser.id === targetUserId) return;

    setActionLoading(targetUserId);
    try {
      await supabase
        .from('follows')
        .insert({ follower_id: currentUser.id, following_id: targetUserId });

      // Update local state
      const updateFollowState = (users: FollowUser[]) =>
        users.map(u => u.user_id === targetUserId ? { ...u, isFollowing: true } : u);

      setFollowers(updateFollowState);
      setFollowing(updateFollowState);
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!currentUser?.id) return;

    setActionLoading(targetUserId);
    try {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId);

      // Update local state
      const updateFollowState = (users: FollowUser[]) =>
        users.map(u => u.user_id === targetUserId ? { ...u, isFollowing: false } : u);

      setFollowers(updateFollowState);
      setFollowing(updateFollowState);
    } catch (error) {
      console.error('Error unfollowing user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserClick = (targetUserId: string) => {
    onOpenChange(false);
    navigate(`/user/${targetUserId}`);
  };

  const renderUserList = (users: FollowUser[]) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm">
            {activeTab === 'followers'
              ? (language === 'ar' ? 'لا يوجد متابعين بعد' : 'No followers yet')
              : (language === 'ar' ? 'لا يتابع أحداً بعد' : 'Not following anyone yet')
            }
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {users.map(user => (
          <div
            key={user.user_id}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <Avatar
              className="h-12 w-12 cursor-pointer"
              onClick={() => handleUserClick(user.user_id)}
            >
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>

            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => handleUserClick(user.user_id)}
            >
              <p className="font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
            </div>

            {currentUser?.id && currentUser.id !== user.user_id && (
              <Button
                size="sm"
                variant={user.isFollowing ? 'outline' : 'default'}
                onClick={() => user.isFollowing ? handleUnfollow(user.user_id) : handleFollow(user.user_id)}
                disabled={actionLoading === user.user_id}
                className="min-w-[80px]"
              >
                {actionLoading === user.user_id ? (
                  <span className="animate-pulse">...</span>
                ) : user.isFollowing ? (
                  <>
                    <UserMinus className="h-3 w-3 mr-1" />
                    {language === 'ar' ? 'إلغاء' : 'Unfollow'}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3 w-3 mr-1" />
                    {language === 'ar' ? 'متابعة' : 'Follow'}
                  </>
                )}
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">
            {language === 'ar' ? 'المتابعون والمتابَعون' : 'Followers & Following'}
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'followers' | 'following')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="followers" className="gap-2">
              <Users className="h-4 w-4" />
              {language === 'ar' ? 'المتابعون' : 'Followers'}
              <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                {followers.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2">
              <UserPlus className="h-4 w-4" />
              {language === 'ar' ? 'يتابع' : 'Following'}
              <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                {following.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[calc(80vh-140px)]">
            <TabsContent value="followers" className="mt-0">
              {renderUserList(followers)}
            </TabsContent>
            <TabsContent value="following" className="mt-0">
              {renderUserList(following)}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

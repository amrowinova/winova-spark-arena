import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
import { useLanguage } from '@/contexts/LanguageContext';
import type { UserRank } from '@/contexts/UserContext';
import { RankBadge } from '@/components/common/RankBadge';
import { useMessageSearch } from '@/hooks/useMessageSearch';
import { supabase } from '@/integrations/supabase/client';
import {
  User,
  Star,
  Search,
  Image,
  BellOff,
  BellRing,
  Ban,
  Flag,
  Check,
  X,
  MessageSquare,
  TrendingUp,
  ArrowLeft,
  Loader2,
  Clock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  onScrollToMessage?: (messageId: string) => void;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    rank?: UserRank;
    isOnline?: boolean;
    lastSeen?: string;
    country?: string;
    engagementStatus?: 'both' | 'contest' | 'vote' | 'none';
    p2pStats?: {
      trades: number;
      rating: number;
    };
  };
  onTransfer?: () => void;
  isStarred?: boolean;
  onToggleStar?: () => void;
}

type View = 'main' | 'search' | 'media';

interface MediaItem {
  id: string;
  image_url: string;
  created_at: string;
}

const BLOCK_STORAGE_KEY = 'winova_blocked_users';
const MUTE_STORAGE_KEY = 'winova_muted_conversations';

function getBlockedUsers(): string[] {
  try {
    return JSON.parse(localStorage.getItem(BLOCK_STORAGE_KEY) || '[]');
  } catch { return []; }
}

function getMutedConversations(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(MUTE_STORAGE_KEY) || '{}');
  } catch { return {}; }
}

export function ChatInfoSheet({
  open,
  onOpenChange,
  conversationId,
  onScrollToMessage,
  user,
  onTransfer,
  isStarred = false,
  onToggleStar,
}: ChatInfoSheetProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isAr = language === 'ar';
  const [view, setView] = useState<View>('main');
  const [muteOpen, setMuteOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  const { results: searchResults, loading: searchLoading, search, clearResults } = useMessageSearch();
  const [searchQuery, setSearchQuery] = useState('');

  // Load blocked/muted state
  useEffect(() => {
    setIsBlocked(getBlockedUsers().includes(user.id));
    if (conversationId) {
      const muted = getMutedConversations();
      setIsMuted(conversationId in muted && muted[conversationId] > Date.now());
    }
  }, [user.id, conversationId]);

  // Reset view when sheet closes
  useEffect(() => {
    if (!open) {
      setView('main');
      setSearchQuery('');
      clearResults();
    }
  }, [open, clearResults]);

  const handleViewProfile = () => {
    onOpenChange(false);
    navigate(`/user/${user.id}`);
  };

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    if (q.trim().length >= 2) {
      search(q, conversationId);
    } else {
      clearResults();
    }
  }, [search, clearResults, conversationId]);

  const handleSearchResultClick = (messageId: string) => {
    onOpenChange(false);
    setTimeout(() => onScrollToMessage?.(messageId), 300);
  };

  const loadMedia = useCallback(async () => {
    if (!conversationId || mediaItems.length > 0) return;
    setMediaLoading(true);
    try {
      const { data } = await (supabase as any)
        .from('direct_messages')
        .select('id, image_url, created_at')
        .eq('conversation_id', conversationId)
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      setMediaItems((data as MediaItem[]) || []);
    } finally {
      setMediaLoading(false);
    }
  }, [conversationId, mediaItems.length]);

  const handleOpenMedia = () => {
    setView('media');
    loadMedia();
  };

  const handleBlock = () => {
    const blocked = getBlockedUsers();
    blocked.push(user.id);
    localStorage.setItem(BLOCK_STORAGE_KEY, JSON.stringify(blocked));
    setIsBlocked(true);
    setBlockDialogOpen(false);
    onOpenChange(false);
  };

  const handleUnblock = () => {
    const blocked = getBlockedUsers().filter(id => id !== user.id);
    localStorage.setItem(BLOCK_STORAGE_KEY, JSON.stringify(blocked));
    setIsBlocked(false);
    setUnblockDialogOpen(false);
  };

  const handleMute = (durationMs: number | null) => {
    if (!conversationId) return;
    const muted = getMutedConversations();
    if (durationMs === null) {
      delete muted[conversationId];
      setIsMuted(false);
    } else {
      muted[conversationId] = Date.now() + durationMs;
      setIsMuted(true);
    }
    localStorage.setItem(MUTE_STORAGE_KEY, JSON.stringify(muted));
    setMuteOpen(false);
  };

  const isContestActive = user.engagementStatus === 'both' || user.engagementStatus === 'contest';
  const isVoteActive = user.engagementStatus === 'both' || user.engagementStatus === 'vote';

  const getStatusText = () => {
    if (user.isOnline) return isAr ? 'متصل الآن' : 'Online now';
    if (user.lastSeen) return isAr ? `آخر ظهور ${user.lastSeen}` : `Last seen ${user.lastSeen}`;
    return null;
  };

  const formatSearchTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[88vh] rounded-t-2xl p-0 overflow-hidden flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>
              {isAr ? 'معلومات جهة الاتصال' : 'Contact Info'}
            </SheetTitle>
          </SheetHeader>

          {/* ── SEARCH VIEW ── */}
          {view === 'search' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 p-3 border-b border-border shrink-0">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setView('main'); setSearchQuery(''); clearResults(); }}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder={isAr ? 'ابحث في الرسائل...' : 'Search messages...'}
                  className="flex-1"
                />
                {searchLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
              </div>
              <div className="flex-1 overflow-y-auto">
                {searchQuery.length < 2 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    {isAr ? 'اكتب حرفين على الأقل للبحث' : 'Type at least 2 characters to search'}
                  </div>
                ) : searchResults.length === 0 && !searchLoading ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    {isAr ? 'لا توجد نتائج' : 'No results found'}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {searchResults.map(result => (
                      <button
                        key={result.id}
                        onClick={() => handleSearchResultClick(result.id)}
                        className="w-full text-start px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium text-muted-foreground">{result.sender_name}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatSearchTime(result.created_at)}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2">{result.content}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MEDIA VIEW ── */}
          {view === 'media' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 p-3 border-b border-border shrink-0">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setView('main')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-medium">{isAr ? 'الوسائط المشتركة' : 'Shared Media'}</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {mediaLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : mediaItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Image className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{isAr ? 'لا توجد صور مشتركة' : 'No shared media'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {mediaItems.map(item => (
                      <a key={item.id} href={item.image_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={item.image_url}
                          alt=""
                          className="w-full aspect-square object-cover rounded-md hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MAIN VIEW ── */}
          {view === 'main' && (
            <div className="flex-1 overflow-y-auto">
              {/* Profile Section */}
              <div className="flex flex-col items-center pt-6 pb-4 px-4 bg-card">
                <div className="relative mb-3">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl">
                    {user.avatar}
                  </div>
                  {user.isOnline && (
                    <span className="absolute bottom-1 end-1 w-4 h-4 bg-success rounded-full border-2 border-card" />
                  )}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold">{user.name}</h2>
                  {user.rank && <RankBadge rank={user.rank} size="sm" />}
                </div>
                <p className="text-sm text-muted-foreground mb-1">@{user.username}</p>
                {getStatusText() && (
                  <p className={`text-xs ${user.isOnline ? 'text-success' : 'text-muted-foreground'}`}>
                    {getStatusText()}
                  </p>
                )}
                {user.country && (
                  <p className="text-xs text-muted-foreground mt-1">{user.country}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  <span className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-full ${isContestActive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {isContestActive ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {isAr ? 'مسابقة' : 'Contest'}
                  </span>
                  <span className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-full ${isVoteActive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {isVoteActive ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {isAr ? 'تصويت' : 'Vote'}
                  </span>
                </div>
                {user.p2pStats && (
                  <div className="flex items-center gap-4 mt-3 p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-1 text-xs">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      <span>{user.p2pStats.trades} {isAr ? 'صفقة' : 'trades'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <TrendingUp className="h-3 w-3 text-success" />
                      <span className="text-success">{user.p2pStats.rating}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 px-4 py-3 border-b border-border">
                {onTransfer && (
                  <Button variant="outline" className="flex-1 gap-2" onClick={onTransfer}>
                    <span className="text-sm font-bold text-primary">И</span>
                    <span>{isAr ? 'تحويل' : 'Send'}</span>
                  </Button>
                )}
                <Button variant="outline" className="flex-1 gap-2" onClick={handleViewProfile}>
                  <User className="h-4 w-4" />
                  <span>{isAr ? 'الملف الشخصي' : 'Profile'}</span>
                </Button>
                <Button
                  variant={isStarred ? 'default' : 'outline'}
                  size="icon"
                  onClick={onToggleStar}
                  className={isStarred ? 'bg-primary hover:bg-primary/90' : ''}
                >
                  <Star className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
                </Button>
              </div>

              {/* Chat Tools */}
              <div className="px-4 py-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                  {isAr ? 'أدوات المحادثة' : 'Chat Tools'}
                </p>
                <Button variant="ghost" className="w-full justify-start gap-3 h-11" onClick={() => setView('search')}>
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span>{isAr ? 'بحث في المحادثة' : 'Search in Chat'}</span>
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3 h-11" onClick={handleOpenMedia}>
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <span>{isAr ? 'الوسائط المشتركة' : 'Shared Media'}</span>
                </Button>
              </div>

              <Separator />

              {/* Notifications & Privacy */}
              <div className="px-4 py-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                  {isAr ? 'الإشعارات والخصوصية' : 'Notifications & Privacy'}
                </p>

                <DropdownMenu open={muteOpen} onOpenChange={setMuteOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start gap-3 h-11">
                      {isMuted
                        ? <BellRing className="h-4 w-4 text-muted-foreground" />
                        : <BellOff className="h-4 w-4 text-muted-foreground" />}
                      <span>{isMuted ? (isAr ? 'إلغاء الكتم' : 'Unmute') : (isAr ? 'كتم الإشعارات' : 'Mute Notifications')}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52">
                    {isMuted ? (
                      <DropdownMenuItem onClick={() => handleMute(null)}>
                        {isAr ? 'إلغاء الكتم' : 'Unmute'}
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => handleMute(8 * 60 * 60 * 1000)}>
                          {isAr ? '8 ساعات' : '8 hours'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMute(7 * 24 * 60 * 60 * 1000)}>
                          {isAr ? 'أسبوع' : '1 week'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMute(365 * 24 * 60 * 60 * 1000)}>
                          {isAr ? 'دائماً' : 'Always'}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {isBlocked ? (
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-11 text-success hover:text-success"
                    onClick={() => setUnblockDialogOpen(true)}
                  >
                    <Ban className="h-4 w-4" />
                    <span>{isAr ? 'إلغاء الحظر' : 'Unblock User'}</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive"
                    onClick={() => setBlockDialogOpen(true)}
                  >
                    <Ban className="h-4 w-4" />
                    <span>{isAr ? 'حظر المستخدم' : 'Block User'}</span>
                  </Button>
                )}

                <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive">
                  <Flag className="h-4 w-4" />
                  <span>{isAr ? 'إبلاغ' : 'Report'}</span>
                </Button>
              </div>

              <div className="h-6" />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Block Confirmation */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAr ? `حظر ${user.name}؟` : `Block ${user.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAr
                ? 'لن يتمكن هذا المستخدم من مراسلتك. يمكنك إلغاء الحظر لاحقاً.'
                : "This user won't be able to message you. You can unblock them later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleBlock}>
              {isAr ? 'حظر' : 'Block'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unblock Confirmation */}
      <AlertDialog open={unblockDialogOpen} onOpenChange={setUnblockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAr ? `إلغاء حظر ${user.name}؟` : `Unblock ${user.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAr
                ? 'سيتمكن هذا المستخدم من مراسلتك مجدداً.'
                : 'This user will be able to message you again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock}>
              {isAr ? 'إلغاء الحظر' : 'Unblock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

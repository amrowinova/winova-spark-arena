import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Users, 
  Trophy, 
  Gift, 
  TrendingUp,
  ArrowRight,
  Activity
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface ImpactItem {
  id: string;
  type: 'donation' | 'vote' | 'contest_win' | 'achievement';
  message: string;
  messageAr: string;
  user: {
    username: string;
    avatar_url?: string;
    country?: string;
  };
  amount?: number;
  timestamp: string;
}

export function LiveImpactTicker() {
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [items, setItems] = useState<ImpactItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Fetch initial impact data
    fetchImpactData();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('live-impact')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: 'type=in.(donation,contest_entry,vote_spend,aura_vote_earnings)'
      }, (payload: any) => {
        handleRealtimeUpdate(payload);
      })
      .subscribe();

    // Rotate items every 5 seconds
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.max(items.length, 1));
    }, 5000);

    return () => {
      supabase.removeChannel(subscription);
      clearInterval(interval);
    };
  }, []);

  const fetchImpactData = async () => {
    try {
      // Fetch recent transactions and activities
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          type,
          amount,
          description,
          description_ar,
          created_at,
          user_id,
          profiles!inner(
            username,
            avatar_url,
            country
          )
        `)
        .in('type', ['donation', 'contest_entry', 'vote_spend', 'aura_vote_earnings'])
        .order('created_at', { ascending: false })
        .limit(10);

      const impactItems: ImpactItem[] = (transactions || []).map((tx: any) => ({
        id: tx.id,
        type: getImpactType(tx.type),
        message: getImpactMessage(tx.type, tx.description, tx.amount),
        messageAr: getImpactMessage(tx.type, tx.description_ar, tx.amount),
        user: {
          username: tx.profiles.username,
          avatar_url: tx.profiles.avatar_url,
          country: tx.profiles.country
        },
        amount: tx.amount,
        timestamp: tx.created_at
      }));

      setItems(impactItems);
    } catch (error) {
      console.error('Error fetching impact data:', error);
    }
  };

  const handleRealtimeUpdate = (payload: any) => {
    if (payload.eventType === 'INSERT') {
      const newItem = payload.new;
      const impactItem: ImpactItem = {
        id: newItem.id,
        type: getImpactType(newItem.type),
        message: getImpactMessage(newItem.type, newItem.description, newItem.amount),
        messageAr: getImpactMessage(newItem.type, newItem.description_ar, newItem.amount),
        user: {
          username: newItem.profiles?.username || 'Anonymous',
          avatar_url: newItem.profiles?.avatar_url,
          country: newItem.profiles?.country
        },
        amount: newItem.amount,
        timestamp: newItem.created_at
      };

      setItems(prev => [impactItem, ...prev.slice(0, 9)]);
    }
  };

  const getImpactType = (transactionType: string): ImpactItem['type'] => {
    switch (transactionType) {
      case 'donation': return 'donation';
      case 'contest_entry': return 'achievement';
      case 'vote_spend': return 'vote';
      case 'aura_vote_earnings': return 'contest_win';
      default: return 'achievement';
    }
  };

  const getImpactMessage = (type: string, description: string, amount?: number) => {
    switch (type) {
      case 'donation':
        return `Donated ${amount || 0} Nova to support families`;
      case 'contest_entry':
        return 'Joined the daily contest';
      case 'vote_spend':
        return `Voted with ${amount || 0} Aura`;
      case 'aura_vote_earnings':
        return `Won ${amount || 0} Aura in contest`;
      default:
        return description || 'Made an impact';
    }
  };

  const getIcon = (type: ImpactItem['type']) => {
    switch (type) {
      case 'donation': return <Heart className="h-4 w-4 text-rose-500" />;
      case 'vote': return <Trophy className="h-4 w-4 text-blue-500" />;
      case 'contest_win': return <Gift className="h-4 w-4 text-purple-500" />;
      case 'achievement': return <Activity className="h-4 w-4 text-green-500" />;
      default: return <TrendingUp className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return isRTL ? 'الآن' : 'Just now';
    if (diffMins < 60) return isRTL ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    if (diffMins < 1440) return isRTL ? `منذ ${Math.floor(diffMins / 60)} ساعة` : `${Math.floor(diffMins / 60)}h ago`;
    return isRTL ? 'اليوم' : 'Today';
  };

  if (items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {getIcon(currentItem.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {currentItem.user.avatar_url ? (
                  <img 
                    src={currentItem.user.avatar_url} 
                    alt={currentItem.user.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  currentItem.user.username.charAt(0).toUpperCase()
                )}
              </div>
              <span className="font-medium text-sm truncate">
                {currentItem.user.username}
              </span>
              {currentItem.user.country && (
                <span className="text-xs text-muted-foreground">
                  {currentItem.user.country}
                </span>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground truncate">
              {isRTL ? currentItem.messageAr : currentItem.message}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(currentItem.timestamp)}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-2 flex gap-1">
          {items.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

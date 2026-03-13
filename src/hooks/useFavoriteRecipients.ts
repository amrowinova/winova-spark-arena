import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FavoriteRecipient {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
  country: string;
}

export function useFavoriteRecipients() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteRecipient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('user_id', user.id)
      .maybeSingle();

    const meta = (data?.metadata as Record<string, unknown>) || {};
    setFavorites((meta.favorite_recipients as FavoriteRecipient[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const addFavorite = useCallback(async (recipient: FavoriteRecipient) => {
    if (!user) return;
    const updated = [...favorites.filter(f => f.userId !== recipient.userId), recipient];
    await supabase
      .from('profiles')
      .update({ metadata: { favorite_recipients: updated } } as never)
      .eq('user_id', user.id);
    setFavorites(updated);
  }, [user, favorites]);

  const removeFavorite = useCallback(async (userId: string) => {
    if (!user) return;
    const updated = favorites.filter(f => f.userId !== userId);
    await supabase
      .from('profiles')
      .update({ metadata: { favorite_recipients: updated } } as never)
      .eq('user_id', user.id);
    setFavorites(updated);
  }, [user, favorites]);

  const isFavorite = useCallback((userId: string) => {
    return favorites.some(f => f.userId === userId);
  }, [favorites]);

  return { favorites, loading, addFavorite, removeFavorite, isFavorite, refetch: fetchFavorites };
}

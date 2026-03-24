import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FamilyMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption: string | null;
}

export interface Family {
  id: string;
  nova_id: string;
  head_name: string;
  country: string;
  city: string;
  story: string;
  members_count: number;
  need_score: number;
  status: 'active' | 'supported' | 'pending';
  total_received: number;
  created_at: string;
  media?: FamilyMedia[];
}

export const SUPPORT_AMOUNTS = [1, 5, 10, 20] as const;
export type SupportAmount = typeof SUPPORT_AMOUNTS[number];

export function useGiving() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(false);
  const [supporting, setSupporting] = useState(false);

  const fetchFamilies = useCallback(async () => {
    setLoading(true);
    try {
      const { data: fams, error } = await supabase
        .from('families')
        .select('*')
        .eq('status', 'active')
        .order('need_score', { ascending: false });

      if (error || !fams) return;

      // Fetch media for all families
      const ids = fams.map((f) => f.id);
      const { data: media } = await supabase
        .from('family_media')
        .select('*')
        .in('family_id', ids);

      const mediaMap: Record<string, FamilyMedia[]> = {};
      (media || []).forEach((m) => {
        if (!mediaMap[m.family_id]) mediaMap[m.family_id] = [];
        mediaMap[m.family_id].push(m as FamilyMedia);
      });

      setFamilies(
        fams.map((f) => ({ ...f, media: mediaMap[f.id] || [] })) as Family[]
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const supportFamily = useCallback(
    async (familyId: string, amount: SupportAmount): Promise<{ success: boolean; error?: string }> => {
      setSupporting(true);
      try {
        const { data, error } = await supabase.rpc('support_family', {
          p_family_id: familyId,
          p_amount: amount,
        });
        if (error) return { success: false, error: error.message };
        const result = data as { success: boolean; error?: string };
        if (result.success) {
          // Refresh totals locally
          setFamilies((prev) =>
            prev.map((f) =>
              f.id === familyId
                ? { ...f, total_received: f.total_received + amount }
                : f
            )
          );
        }
        return result;
      } catch (err) {
        return { success: false, error: String(err) };
      } finally {
        setSupporting(false);
      }
    },
    []
  );

  return { families, loading, supporting, fetchFamilies, supportFamily };
}

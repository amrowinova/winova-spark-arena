import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type KYCStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface KYCRequest {
  id: string;
  full_name: string;
  birth_date: string;
  id_image_url: string;
  status: KYCStatus;
  submitted_at: string;
  reviewed_at: string | null;
}

export function useKYC() {
  const { user } = useAuth();
  const [kycStatus, setKycStatus] = useState<KYCStatus>('unverified');
  const [latestRequest, setLatestRequest] = useState<KYCRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);

    const [profileRes, requestRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('kyc_status')
        .eq('user_id', user.id)
        .single(),
      (supabase.rpc as any)('get_my_kyc_request'),
    ]);

    if (profileRes.data) {
      setKycStatus(((profileRes.data as any).kyc_status as KYCStatus) ?? 'unverified');
    }
    if (requestRes.data && Array.isArray(requestRes.data) && requestRes.data.length > 0) {
      setLatestRequest(requestRes.data[0] as KYCRequest);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  /**
   * Upload the ID image to Supabase Storage and submit the KYC request.
   * Returns { error } if something went wrong.
   */
  const submitKYC = useCallback(async (params: {
    fullName: string;
    birthDate: string;     // ISO date string YYYY-MM-DD
    idImageFile: File;
  }): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };

    // 1. Upload image
    const ext = params.idImageFile.name.split('.').pop() ?? 'jpg';
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(filePath, params.idImageFile, { upsert: true });

    if (uploadError) return { error: uploadError.message };

    // 2. Get signed URL (stored in DB — not a public URL)
    const { data: signedData } = await supabase.storage
      .from('kyc-documents')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

    const imageUrl = signedData?.signedUrl ?? filePath;

    // 3. Call the server-side function (handles 18+ check, deduplication)
    const { error: rpcError } = await (supabase.rpc as any)('submit_kyc_request', {
      p_full_name:    params.fullName,
      p_birth_date:   params.birthDate,
      p_id_image_url: imageUrl,
    });

    if (rpcError) return { error: rpcError.message };

    await fetchStatus();
    return { error: null };
  }, [user, fetchStatus]);

  const isVerified  = kycStatus === 'verified';
  const isPending   = kycStatus === 'pending';
  const isRejected  = kycStatus === 'rejected';
  const isUnverified = kycStatus === 'unverified';

  /** True when user cannot do financial operations */
  const isFinanciallyBlocked = !isVerified;

  return {
    kycStatus,
    latestRequest,
    isLoading,
    isVerified,
    isPending,
    isRejected,
    isUnverified,
    isFinanciallyBlocked,
    submitKYC,
    refetch: fetchStatus,
  };
}

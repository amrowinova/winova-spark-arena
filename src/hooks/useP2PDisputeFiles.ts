import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface P2PDisputeFile {
  id: string;
  order_id: string;
  uploaded_by: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  public_url?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function useP2PDisputeFiles(orderId: string) {
  const { user } = useAuth();
  const [files, setFiles] = useState<P2PDisputeFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch files for an order
  const fetchFiles = useCallback(async () => {
    if (!orderId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('p2p_dispute_files')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get public URLs for each file
      const filesWithUrls = await Promise.all(
        (data || []).map(async (file) => {
          const { data: urlData } = await supabase.storage
            .from('p2p-disputes')
            .createSignedUrl(file.file_path, 3600); // 1 hour expiry

          return {
            ...file,
            public_url: urlData?.signedUrl,
          } as P2PDisputeFile;
        })
      );

      setFiles(filesWithUrls);
    } catch (err) {
      console.error('Error fetching dispute files:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  // Upload a file
  const uploadFile = useCallback(async (file: File): Promise<{ success: boolean; error?: string }> => {
    if (!user || !orderId) {
      return { success: false, error: 'Not authenticated or no order' };
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, error: 'File type not allowed. Use JPEG, PNG, WebP, or PDF.' };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'File too large. Maximum size is 5MB.' };
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${orderId}/${user.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('p2p-disputes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      // Insert record in database
      const { error: dbError } = await supabase
        .from('p2p_dispute_files')
        .insert({
          order_id: orderId,
          uploaded_by: user.id,
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      setUploadProgress(100);

      // Refresh files list
      await fetchFiles();

      return { success: true };
    } catch (err) {
      console.error('Error uploading file:', err);
      return { success: false, error: 'Failed to upload file' };
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [user, orderId, fetchFiles]);

  return {
    files,
    isLoading,
    isUploading,
    uploadProgress,
    fetchFiles,
    uploadFile,
  };
}

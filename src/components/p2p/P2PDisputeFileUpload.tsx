import { useState, useEffect, useRef } from 'react';
import { Upload, FileImage, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useP2PDisputeFiles, P2PDisputeFile } from '@/hooks/useP2PDisputeFiles';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface P2PDisputeFileUploadProps {
  orderId: string;
  isDisputed: boolean;
}

export function P2PDisputeFileUpload({ orderId, isDisputed }: P2PDisputeFileUploadProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    files,
    isLoading,
    isUploading,
    uploadProgress,
    fetchFiles,
    uploadFile,
  } = useP2PDisputeFiles(orderId);

  // Fetch files on mount
  useEffect(() => {
    if (orderId) {
      fetchFiles();
    }
  }, [orderId, fetchFiles]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file);

    if (result.success) {
      toast({
        title: isRTL ? 'تم رفع الملف' : 'File uploaded',
        description: isRTL ? 'تم إرفاق الإثبات بنجاح' : 'Proof attached successfully',
      });
    } else {
      toast({
        title: isRTL ? 'فشل الرفع' : 'Upload failed',
        description: result.error,
        variant: 'destructive',
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FileImage className="h-5 w-5 text-primary" />;
    }
    return <FileText className="h-5 w-5 text-warning" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Only show upload button during dispute
  if (!isDisputed && files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Upload Button - Only during dispute */}
      {isDisputed && (
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isRTL ? 'إرفاق إثبات' : 'Attach Proof'}
          </Button>

          {isUploading && (
            <div className="flex-1 max-w-32">
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </div>
      )}

      {/* Uploaded Files List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'الإثباتات المرفقة:' : 'Attached proofs:'}
            </p>
            
            {files.map((file) => (
              <FileItem key={file.id} file={file} isRTL={isRTL} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isRTL ? 'جاري التحميل...' : 'Loading...'}
        </div>
      )}
    </div>
  );
}

function FileItem({ file, isRTL }: { file: P2PDisputeFile; isRTL: boolean }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isImage = file.file_type.startsWith('image/');

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border",
          isImage && file.public_url && "cursor-pointer hover:bg-muted"
        )}
        onClick={() => isImage && file.public_url && setIsPreviewOpen(true)}
      >
        {/* Thumbnail for images */}
        {isImage && file.public_url ? (
          <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
            <img
              src={file.public_url}
              alt={file.file_name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-warning" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.file_name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.file_size)}
          </p>
        </div>

        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
      </motion.div>

      {/* Image Preview Modal */}
      {isPreviewOpen && isImage && file.public_url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div className="relative max-w-full max-h-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setIsPreviewOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={file.public_url}
              alt={file.file_name}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}

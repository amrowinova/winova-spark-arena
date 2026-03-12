import { useState, useRef } from 'react';
import { Send, Paperclip, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBanner } from '@/contexts/BannerContext';
import { supabase } from '@/integrations/supabase/client';
import { useP2PDatabase } from '@/hooks/useP2PDatabase';

interface P2PChatInputProps {
  orderId: string;
  onSendMessage: (message: string) => void;
}

export function P2PChatInput({ orderId, onSendMessage }: P2PChatInputProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { error: showError, success: showSuccess } = useBanner();
  const db = useP2PDatabase();

  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (imagePreview) {
      await handleSendImage();
      return;
    }
    if (!message.trim()) return;
    onSendMessage(message);
    setMessage('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError(isRTL ? 'يرجى اختيار صورة فقط' : 'Please select an image only');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError(isRTL ? 'الحد الأقصى 5 ميجابايت' : 'Max file size is 5MB');
      return;
    }
    setImagePreview({ file, url: URL.createObjectURL(file) });
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview.url);
      setImagePreview(null);
    }
  };

  const handleSendImage = async () => {
    if (!imagePreview) return;
    setIsUploading(true);
    try {
      const ext = imagePreview.file.name.split('.').pop() || 'jpg';
      const path = `chat/${orderId}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('p2p-disputes')
        .upload(path, imagePreview.file);

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('p2p-disputes')
        .createSignedUrl(path, 7 * 24 * 60 * 60); // 7 days

      if (urlData?.signedUrl) {
        // Send as a message with image URL
        await db.sendMessage(
          orderId,
          `📷 [image](${urlData.signedUrl})`,
          `📷 [صورة](${urlData.signedUrl})`,
          false,
          'image'
        );
        showSuccess(isRTL ? 'تم إرسال الصورة' : 'Image sent');
      }

      handleRemoveImage();
    } catch (err) {
      console.error('Error uploading image:', err);
      showError(isRTL ? 'فشل إرسال الصورة' : 'Failed to send image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 border-t border-border bg-card safe-bottom">
      {/* Image preview */}
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <img
            src={imagePreview.url}
            alt="Preview"
            className="h-20 rounded-lg border border-border object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
            onClick={handleRemoveImage}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Attachment button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'}
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isUploading}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={(!message.trim() && !imagePreview) || isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

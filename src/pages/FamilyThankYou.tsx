import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Camera, Video, MessageSquare, Send, X, Upload, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useBanner } from '@/contexts/BannerContext';
import { supabase } from '@/integrations/supabase/client';

interface ThankYouMessage {
  id: string;
  family_id: string;
  message_type: 'text' | 'image' | 'video';
  content: string;
  media_url?: string;
  created_at: string;
  status: 'active' | 'archived';
}

export default function FamilyThankYouPage() {
  const { language } = useLanguage();
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [messages, setMessages] = useState<ThankYouMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video'>('text');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState<string>('');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('family_thank_you_messages')
        .select('*')
        .eq('family_id', user.id) // Assuming user is a family member
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      showError(isRTL ? 'فشل تحميل رسائل الشكر' : 'Failed to load thank you messages');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      showError(isRTL ? 'يرجى اختيار صورة أو فيديو' : 'Please select an image or video');
      return;
    }

    // Validate file size (10MB for images, 50MB for videos)
    const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      showError(isRTL ? `حجم الملف كبير جداً (${isImage ? '10MB' : '50MB'} max)` : 
                 `File too large (${isImage ? '10MB' : '50MB'} max)`);
      return;
    }

    setMediaFile(file);
    setMessageType(isImage ? 'image' : 'video');
    
    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const uploadMedia = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `thank-you-media/${fileName}`;

    const { data, error } = await supabase.storage
      .from('family-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('family-media')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (messageType === 'text' && !newMessage.trim()) {
      showError(isRTL ? 'يرجى كتابة رسالة' : 'Please write a message');
      return;
    }

    if ((messageType === 'image' || messageType === 'video') && !mediaFile) {
      showError(isRTL ? 'يرجى اختيار ملف' : 'Please select a file');
      return;
    }

    setSubmitting(true);
    try {
      let mediaUrl = '';
      
      if (mediaFile) {
        setUploading(true);
        mediaUrl = await uploadMedia(mediaFile);
        setUploading(false);
      }

      // Submit message using RPC
      const { data, error } = await supabase.rpc('submit_family_thank_you', {
        p_family_id: user?.id,
        p_message_type: messageType,
        p_content: newMessage.trim() || (mediaUrl ? 'Media message' : ''),
        p_media_url: mediaUrl || null
      });

      if (error) throw error;

      showSuccess(isRTL ? 'تم إرسال رسالة الشكر بنجاح' : 'Thank you message sent successfully');
      
      // Reset form
      setNewMessage('');
      setMediaFile(null);
      setPreviewUrl('');
      setMessageType('text');
      
      // Refresh messages
      await fetchMessages();
      
    } catch (error) {
      console.error('Error submitting message:', error);
      showError(error instanceof Error ? error.message : (isRTL ? 'فشل إرسال الرسالة' : 'Failed to send message'));
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const toggleVideoPlay = (messageId: string) => {
    setVideoPlaying(prev => prev === messageId ? '' : messageId);
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('family_thank_you_messages')
        .update({ status: 'archived' })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
      showSuccess(isRTL ? 'تم حذف الرسالة' : 'Message deleted');
    } catch (error) {
      showError(isRTL ? 'فشل حذف الرسالة' : 'Failed to delete message');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <InnerPageHeader title={isRTL ? 'رسائل الشكر' : 'Thank You Messages'} />
        <main className="flex-1 p-4 pb-20">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader title={isRTL ? 'رسائل الشكر' : 'Thank You Messages'} />

      <main className="flex-1 p-4 space-y-6 pb-20">
        {/* Create New Message */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              {isRTL ? 'إنشاء رسالة شكر جديدة' : 'Create New Thank You Message'}
            </h3>

            {/* Message Type Selection */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={messageType === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageType('text')}
                className="flex-1"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {isRTL ? 'نص' : 'Text'}
              </Button>
              <Button
                variant={messageType === 'image' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageType('image')}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                {isRTL ? 'صورة' : 'Image'}
              </Button>
              <Button
                variant={messageType === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMessageType('video')}
                className="flex-1"
              >
                <Video className="h-4 w-4 mr-2" />
                {isRTL ? 'فيديو' : 'Video'}
              </Button>
            </div>

            {/* Text Input */}
            {messageType === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="message-text">{isRTL ? 'رسالتك' : 'Your Message'}</Label>
                <Textarea
                  id="message-text"
                  placeholder={isRTL ? 'اكتب رسالة شكر للمتبرعين...' : 'Write a thank you message to donors...'}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-end">
                  {newMessage.length}/500
                </p>
              </div>
            )}

            {/* Media Upload */}
            {(messageType === 'image' || messageType === 'video') && (
              <div className="space-y-3">
                <Label>{isRTL ? 'اختر ملف' : 'Choose File'}</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <input
                    type="file"
                    id="media-upload"
                    accept={messageType === 'image' ? 'image/*' : 'video/*'}
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="media-upload"
                    className={`flex flex-col items-center justify-center cursor-pointer ${
                      uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50'
                    } transition-colors`}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">
                      {uploading ? (isRTL ? 'جاري الرفع...' : 'Uploading...') :
                       (isRTL ? 'انقر لاختيار ملف' : 'Click to choose file')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {messageType === 'image' ? 
                        (isRTL ? 'JPG, PNG, GIF (حتى 10MB)' : 'JPG, PNG, GIF (up to 10MB)') :
                        (isRTL ? 'MP4, MOV (حتى 50MB)' : 'MP4, MOV (up to 50MB)')}
                    </p>
                  </label>
                </div>

                {/* Preview */}
                {previewUrl && (
                  <div className="relative rounded-lg overflow-hidden bg-muted">
                    {messageType === 'image' ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                    ) : (
                      <video src={previewUrl} className="w-full h-48 object-cover" controls />
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setPreviewUrl('');
                        setMediaFile(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Optional text for media */}
                <div className="space-y-2">
                  <Label htmlFor="media-caption">{isRTL ? 'وصف اختياري' : 'Optional Caption'}</Label>
                  <Textarea
                    id="media-caption"
                    placeholder={isRTL ? 'أضف وصفاً للوسائط...' : 'Add a caption for the media...'}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={2}
                    maxLength={200}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              className="w-full mt-4 gap-2"
              onClick={handleSubmit}
              disabled={submitting || uploading}
            >
              <Send className="h-4 w-4" />
              {submitting ? (isRTL ? 'جاري الإرسال...' : 'Sending...') : 
               (isRTL ? 'إرسال رسالة الشكر' : 'Send Thank You Message')}
            </Button>
          </CardContent>
        </Card>

        {/* Existing Messages */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              {isRTL ? 'رسائلك السابقة' : 'Your Previous Messages'}
            </h3>

            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>{isRTL ? 'لا توجد رسائل شكر بعد' : 'No thank you messages yet'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={
                        message.message_type === 'text' ? 'secondary' :
                        message.message_type === 'image' ? 'default' : 'outline'
                      }>
                        {message.message_type === 'text' ? <MessageSquare className="h-3 w-3 mr-1" /> :
                         message.message_type === 'image' ? <Camera className="h-3 w-3 mr-1" /> :
                         <Video className="h-3 w-3 mr-1" />}
                        {isRTL ? 
                          (message.message_type === 'text' ? 'نص' :
                           message.message_type === 'image' ? 'صورة' : 'فيديو') :
                          (message.message_type === 'text' ? 'Text' :
                           message.message_type === 'image' ? 'Image' : 'Video')}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMessage(message.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {message.message_type === 'text' && (
                      <p className="text-sm">{message.content}</p>
                    )}

                    {(message.message_type === 'image' || message.message_type === 'video') && (
                      <div className="space-y-2">
                        {message.message_type === 'image' ? (
                          <img 
                            src={message.media_url} 
                            alt="Thank you" 
                            className="w-full rounded-lg max-h-64 object-cover"
                          />
                        ) : (
                          <div className="relative">
                            <video 
                              src={message.media_url} 
                              className="w-full rounded-lg max-h-64 object-cover"
                              controls={videoPlaying === message.id}
                              onPlay={() => setVideoPlaying(message.id)}
                              onPause={() => setVideoPlaying('')}
                            />
                            {videoPlaying !== message.id && (
                              <div 
                                className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg cursor-pointer"
                                onClick={() => toggleVideoPlay(message.id)}
                              >
                                <Play className="h-12 w-12 text-white" />
                              </div>
                            )}
                          </div>
                        )}
                        {message.content && message.content !== 'Media message' && (
                          <p className="text-sm text-muted-foreground">{message.content}</p>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleDateString(
                        language === 'ar' ? 'ar-SA' : 'en-US',
                        { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                      )}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}

import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Image, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSend: (message: string, files?: File[]) => void;
  replyTo?: any;
  onCancelReply?: () => void;
  onTransfer?: () => void;
  isTyping?: boolean;
  disabled?: boolean;
  placeholder?: string;
  showTransfer?: boolean;
}

export function ChatInput({
  message,
  setMessage,
  onSend,
  replyTo,
  onCancelReply,
  onTransfer,
  isTyping,
  disabled,
  placeholder,
  showTransfer = true
}: ChatInputProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleSend = useCallback(() => {
    if (!message.trim() && selectedFiles.length === 0) return;
    
    onSend(message, selectedFiles.length > 0 ? selectedFiles : undefined);
    setMessage('');
    setSelectedFiles([]);
  }, [message, selectedFiles, onSend, setMessage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const isRTL = language === 'ar' || language === 'fa' || language === 'ur';

  return (
    <div className="border-t p-4 bg-background">
      {/* Reply To Indicator */}
      {replyTo && (
        <div className="mb-2 p-2 bg-muted rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('chat.replyingTo')}</span>
            <span className="font-medium">{replyTo.content?.slice(0, 50)}...</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelReply}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mb-2 p-2 bg-muted rounded-lg">
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                <div className="flex items-center gap-2 text-sm">
                  <Image className="w-4 h-4" />
                  <span className="truncate">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={fileInputRef}
            placeholder={placeholder || t('chat.typeMessage')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={`pr-12 ${isRTL ? 'text-right' : 'text-left'}`}
          />
          
          {/* File Input (Hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={disabled}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1">
          {/* File Attach Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          {/* Transfer Button (for DM/P2P) */}
          {showTransfer && onTransfer && (
            <Button
              variant="outline"
              size="icon"
              onClick={onTransfer}
              disabled={disabled}
            >
              <Send className="w-4 h-4" />
            </Button>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={disabled || (!message.trim() && selectedFiles.length === 0)}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Typing Indicator */}
      {isTyping && (
        <div className="mt-2 text-xs text-muted-foreground animate-pulse">
          {language === 'ar' ? 'يكتب الآن...' : 'Typing...'}
        </div>
      )}
    </div>
  );
}

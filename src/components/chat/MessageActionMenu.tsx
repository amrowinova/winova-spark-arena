import { motion } from 'framer-motion';
import {
  Reply,
  Forward,
  Copy,
  Info,
  Star,
  Flag,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

interface MessageActionMenuProps {
  isMine: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onInfo: () => void;
  onStar?: () => void;
  onReport?: () => void;
  onDelete?: () => void;
  showReactionPicker: boolean;
  onToggleReactionPicker: () => void;
}

export function MessageActionMenu({
  isMine,
  onReact,
  onReply,
  onForward,
  onCopy,
  onInfo,
  onStar,
  onReport,
  onDelete,
  showReactionPicker,
  onToggleReactionPicker,
}: MessageActionMenuProps) {
  const { language } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      className={`absolute z-50 ${isMine ? 'end-0' : 'start-0'} -top-14`}
    >
      <div className="flex flex-col gap-1">
        {/* Quick Reactions Row */}
        {showReactionPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-lg mb-1"
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-lg hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}

        {/* Actions Row */}
        <div className="flex items-center gap-0.5 bg-card border border-border rounded-xl p-1 shadow-lg">
          {/* Reactions Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-lg"
            onClick={onToggleReactionPicker}
          >
            😊
          </Button>

          <div className="w-px h-6 bg-border" />

          {/* Reply */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onReply}
            title={language === 'ar' ? 'رد' : 'Reply'}
          >
            <Reply className="h-4 w-4" />
          </Button>

          {/* Forward */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onForward}
            title={language === 'ar' ? 'إعادة توجيه' : 'Forward'}
          >
            <Forward className="h-4 w-4" />
          </Button>

          {/* Copy */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onCopy}
            title={language === 'ar' ? 'نسخ' : 'Copy'}
          >
            <Copy className="h-4 w-4" />
          </Button>

          {/* Star */}
          {onStar && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onStar}
              title={language === 'ar' ? 'تمييز' : 'Star'}
            >
              <Star className="h-4 w-4" />
            </Button>
          )}

          <div className="w-px h-6 bg-border" />

          {/* Info */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onInfo}
            title={language === 'ar' ? 'معلومات' : 'Info'}
          >
            <Info className="h-4 w-4" />
          </Button>

          {/* Report (only for other's messages) */}
          {!isMine && onReport && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-warning"
              onClick={onReport}
              title={language === 'ar' ? 'إبلاغ' : 'Report'}
            >
              <Flag className="h-4 w-4" />
            </Button>
          )}

          {/* Delete (only for own messages) */}
          {isMine && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive"
              onClick={onDelete}
              title={language === 'ar' ? 'حذف' : 'Delete'}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

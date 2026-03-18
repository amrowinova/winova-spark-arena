import { motion } from 'framer-motion';
import {
  Reply,
  Forward,
  Copy,
  Info,
  Star,
  Flag,
  Trash2,
  LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

interface MessageActionMenuProps {
  isMine: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onInfo: () => void;
  onClose: () => void;
  onStar?: () => void;
  onReport?: () => void;
  onDelete?: () => void;
  // kept for backwards compatibility but no longer used internally
  showReactionPicker?: boolean;
  onToggleReactionPicker?: () => void;
}

interface ActionItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  warning?: boolean;
}

function ActionItem({ icon: Icon, label, onClick, destructive, warning }: ActionItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-2 py-3.5 rounded-xl transition-colors active:bg-muted/80 hover:bg-muted/50 ${
        destructive ? 'text-destructive' : warning ? 'text-amber-500' : 'text-foreground'
      }`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
        destructive ? 'bg-destructive/10' : warning ? 'bg-amber-500/10' : 'bg-muted'
      }`}>
        <Icon className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />
      </div>
      <span className="text-[15px] font-medium">{label}</span>
    </button>
  );
}

export function MessageActionMenu({
  isMine,
  onReact,
  onReply,
  onForward,
  onCopy,
  onInfo,
  onClose,
  onStar,
  onReport,
  onDelete,
}: MessageActionMenuProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const handleAction = (fn: () => void) => {
    fn();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[200] flex flex-col justify-end"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Bottom Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative bg-card rounded-t-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-muted-foreground/25 rounded-full" />
        </div>

        {/* Quick Reactions */}
        <div className="flex justify-around items-center px-6 py-4 border-b border-border/40">
          {QUICK_REACTIONS.map((emoji) => (
            <motion.button
              key={emoji}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleAction(() => onReact(emoji))}
              className="text-[30px] leading-none hover:scale-110 transition-transform"
            >
              {emoji}
            </motion.button>
          ))}
        </div>

        {/* Action List */}
        <div className="px-4 py-2">
          <ActionItem
            icon={Reply}
            label={isAr ? 'رد على الرسالة' : 'Reply'}
            onClick={() => handleAction(onReply)}
          />
          <ActionItem
            icon={Forward}
            label={isAr ? 'إعادة توجيه' : 'Forward'}
            onClick={() => handleAction(onForward)}
          />
          <ActionItem
            icon={Copy}
            label={isAr ? 'نسخ النص' : 'Copy'}
            onClick={() => handleAction(onCopy)}
          />
          {onStar && (
            <ActionItem
              icon={Star}
              label={isAr ? 'تمييز بنجمة' : 'Star Message'}
              onClick={() => handleAction(onStar)}
            />
          )}
          <ActionItem
            icon={Info}
            label={isAr ? 'معلومات الرسالة' : 'Message Info'}
            onClick={() => handleAction(onInfo)}
          />
          {!isMine && onReport && (
            <ActionItem
              icon={Flag}
              label={isAr ? 'إبلاغ عن الرسالة' : 'Report'}
              onClick={() => handleAction(onReport)}
              warning
            />
          )}
          {isMine && onDelete && (
            <ActionItem
              icon={Trash2}
              label={isAr ? 'حذف الرسالة' : 'Delete Message'}
              onClick={() => handleAction(onDelete)}
              destructive
            />
          )}
        </div>

        {/* Cancel Button */}
        <div className="px-4 pb-4 pt-1">
          <button
            onClick={onClose}
            className="w-full bg-muted hover:bg-muted/70 active:bg-muted/50 rounded-2xl py-4 font-semibold text-foreground text-[15px] transition-colors"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

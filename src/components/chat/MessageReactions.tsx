import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onReact: (emoji: string) => void;
  isMine: boolean;
}

export function MessageReactions({ reactions, onReact, isMine }: MessageReactionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReact = (emoji: string) => {
    onReact(emoji);
    setIsOpen(false);
  };

  return (
    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {/* Existing reactions */}
      <AnimatePresence>
        {reactions.filter(r => r.count > 0).map((reaction) => (
          <motion.button
            key={reaction.emoji}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => onReact(reaction.emoji)}
            className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-0.5 transition-colors ${
              reaction.userReacted 
                ? 'bg-primary/20 border border-primary/30' 
                : 'bg-muted/80 hover:bg-muted'
            }`}
          >
            <span>{reaction.emoji}</span>
            {reaction.count > 1 && (
              <span className="text-[10px] text-muted-foreground">{reaction.count}</span>
            )}
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Add reaction button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <SmilePlus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side={isMine ? 'left' : 'right'} 
          className="w-auto p-1"
          align="center"
        >
          <div className="flex gap-1">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="p-1.5 hover:bg-muted rounded transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ReactionPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-card rounded-lg border shadow-lg">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="p-2 hover:bg-muted rounded transition-colors text-xl hover:scale-110"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Crown, Trophy, Star, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface MysteryBox {
  id: number;
  rank: number;
  color: string;
  gradient: string;
  prize: number;
  isOpen: boolean;
  winner?: string;
}

interface MysteryBoxesProps {
  prizes: number[]; // Prize amounts for ranks 1-5
  winners?: string[]; // Winner names for ranks 1-5
  isRTL: boolean;
  onBoxOpen?: (rank: number) => void;
  showBefore?: boolean; // Show 3 minutes before contest ends
}

const boxColors = [
  { color: 'bg-yellow-400', gradient: 'from-yellow-300 to-yellow-500', icon: '👑' },
  { color: 'bg-gray-300', gradient: 'from-gray-200 to-gray-400', icon: '🥈' },
  { color: 'bg-amber-600', gradient: 'from-amber-500 to-amber-700', icon: '🥉' },
  { color: 'bg-blue-400', gradient: 'from-blue-300 to-blue-500', icon: '🏆' },
  { color: 'bg-purple-400', gradient: 'from-purple-300 to-purple-500', icon: '⭐' },
];

export function MysteryBoxes({ 
  prizes, 
  winners = [], 
  isRTL, 
  onBoxOpen,
  showBefore = false 
}: MysteryBoxesProps) {
  const [boxes, setBoxes] = useState<MysteryBox[]>([]);
  const [hoveredBox, setHoveredBox] = useState<number | null>(null);
  const [showPrizes, setShowPrizes] = useState(false);

  useEffect(() => {
    const initialBoxes: MysteryBox[] = prizes.map((prize, index) => ({
      id: index + 1,
      rank: index + 1,
      color: boxColors[index].color,
      gradient: boxColors[index].gradient,
      prize,
      isOpen: false,
      winner: winners[index]
    }));
    setBoxes(initialBoxes);
  }, [prizes, winners]);

  const openBox = (rank: number) => {
    setBoxes(prev => prev.map(box => 
      box.rank === rank ? { ...box, isOpen: true } : box
    ));
    if (onBoxOpen) {
      onBoxOpen(rank);
    }
  };

  const formatPrize = (amount: number) => {
    return `${amount.toLocaleString()} Nova`;
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-orange-50 border-purple-200">
      <CardContent className="p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-orange-500 text-white rounded-full"
          >
            <Gift className="h-5 w-5" />
            <span className="font-bold">
              {isRTL ? 'صناديق الجوائز الغامضة' : 'Mystery Prize Boxes'}
            </span>
          </motion.div>
          
          {showBefore && (
            <p className="text-sm text-muted-foreground mt-2">
              {isRTL 
                ? 'سيتم الكشف عن الجوائز بعد انتهاء المسابقة' 
                : 'Prizes will be revealed after contest ends'
              }
            </p>
          )}
        </div>

        {/* Prize Legend Toggle */}
        <div className="text-center mb-4">
          <button
            onClick={() => setShowPrizes(!showPrizes)}
            className="text-sm text-purple-600 hover:text-purple-800 underline"
          >
            {showPrizes 
              ? (isRTL ? 'إخفاء قيم الجوائز' : 'Hide Prize Values')
              : (isRTL ? 'عرض قيم الجوائز' : 'Show Prize Values')
            }
          </button>
        </div>

        {/* Mystery Boxes Grid */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {boxes.map((box, index) => (
            <motion.div
              key={box.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {/* Box */}
              <motion.div
                className={`
                  relative h-32 rounded-lg cursor-pointer transition-all duration-300
                  ${box.isOpen 
                    ? 'bg-gray-100 border-gray-300' 
                    : `bg-gradient-to-br ${box.gradient} border-2 border-white shadow-lg hover:shadow-xl hover:scale-105`
                  }
                `}
                whileHover={!box.isOpen ? { scale: 1.05 } : {}}
                whileTap={!box.isOpen ? { scale: 0.95 } : {}}
                onClick={() => !box.isOpen && openBox(box.rank)}
                onMouseEnter={() => setHoveredBox(box.rank)}
                onMouseLeave={() => setHoveredBox(null)}
              >
                {/* Rank Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <Badge variant="secondary" className="text-xs bg-white/90">
                    #{box.rank}
                  </Badge>
                </div>

                {/* Box Content */}
                <div className="flex flex-col items-center justify-center h-full p-4">
                  {!box.isOpen ? (
                    <>
                      {/* Mystery Icon */}
                      <motion.div
                        animate={{ 
                          rotate: [0, 5, -5, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="text-4xl mb-2"
                      >
                        {boxColors[box.rank - 1].icon}
                      </motion.div>
                      
                      {/* Question Mark */}
                      <div className="text-white font-bold text-2xl">?</div>
                    </>
                  ) : (
                    <>
                      {/* Opened Box */}
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", duration: 0.5 }}
                          className="text-3xl mb-2"
                        >
                          {boxColors[box.rank - 1].icon}
                        </motion.div>
                        
                        <div className="text-sm font-bold text-gray-700">
                          {box.winner || '???'}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Sparkle Effect */}
                {!box.isOpen && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    animate={{
                      opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <div className="absolute top-1 right-1">
                      <Sparkles className="h-4 w-4 text-white/80" />
                    </div>
                    <div className="absolute bottom-1 left-1">
                      <Sparkles className="h-3 w-3 text-white/60" />
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Hover Tooltip */}
              <AnimatePresence>
                {hoveredBox === box.rank && !box.isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute z-20 bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap"
                  >
                    <div className="font-bold">
                      {isRTL ? `المركز ${box.rank}` : `Rank ${box.rank}`}
                    </div>
                    {showPrizes && (
                      <div className="text-yellow-300">
                        {formatPrize(box.prize)}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Prize Values Display */}
        {showPrizes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/50 rounded-lg p-4"
          >
            <div className="grid grid-cols-5 gap-2 text-center">
              {boxes.map((box) => (
                <div key={box.id} className="text-xs">
                  <div className="font-semibold">
                    {isRTL ? `المركز ${box.rank}` : `Rank ${box.rank}`}
                  </div>
                  <div className="text-purple-600 font-bold">
                    {formatPrize(box.prize)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Instructions */}
        <div className="text-center mt-4 text-sm text-gray-600">
          <p>
            {isRTL 
              ? 'انقر على الصناديق لفتحها وكشف الفائزين!' 
              : 'Click on boxes to open them and reveal winners!'
            }
          </p>
          {showBefore && (
            <p className="text-xs text-orange-600 mt-1">
              {isRTL 
                ? 'الصناديق تظهر 3 دقائق قبل نهاية المسابقة' 
                : 'Boxes appear 3 minutes before contest ends'
              }
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

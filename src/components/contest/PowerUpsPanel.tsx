import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Flame, Shield, Lock, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useContestPowerUps } from '@/hooks/useContestPowerUps';
import { useLanguage } from '@/contexts/LanguageContext';

interface PowerUpsPanelProps {
  contestId: string;
  participantId?: string;
  isRTL: boolean;
  onPowerUpUsed?: (type: string) => void;
}

export function PowerUpsPanel({ 
  contestId, 
  participantId, 
  isRTL, 
  onPowerUpUsed 
}: PowerUpsPanelProps) {
  const [selectedPowerUp, setSelectedPowerUp] = useState<string | null>(null);
  const { 
    powerUps, 
    loading, 
    useDoubleVote, 
    getAvailablePowerUps, 
    hasAvailablePowerUps 
  } = useContestPowerUps({ 
    contestId, 
    participantId, 
    isRTL 
  });

  const availablePowerUps = getAvailablePowerUps();

  const getPowerUpIcon = (type: string) => {
    switch (type) {
      case 'double_vote': return <Zap className="h-6 w-6" />;
      case 'momentum': return <Flame className="h-6 w-6" />;
      case 'shield': return <Shield className="h-6 w-6" />;
      default: return <Zap className="h-6 w-6" />;
    }
  };

  const getPowerUpColor = (type: string, available: boolean, used?: boolean) => {
    if (used) return 'from-gray-400 to-gray-600';
    if (!available) return 'from-gray-300 to-gray-500';
    
    switch (type) {
      case 'double_vote': return 'from-purple-400 to-purple-600';
      case 'momentum': return 'from-orange-400 to-orange-600';
      case 'shield': return 'from-blue-400 to-blue-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const handleUsePowerUp = async (type: string) => {
    if (type === 'double_vote') {
      const success = await useDoubleVote();
      if (success && onPowerUpUsed) {
        onPowerUpUsed(type);
      }
    }
  };

  if (!hasAvailablePowerUps()) {
    return (
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
        <CardContent className="p-4">
          <div className="text-center">
            <Lock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <h3 className="font-semibold text-gray-600 mb-1">
              {isRTL ? 'Power-ups غير متوفرة' : 'No Power-ups Available'}
            </h3>
            <p className="text-sm text-gray-500">
              {isRTL 
                ? 'أكمل المهام اليومية أو حافظ على سلسلة الزيارات اليومية' 
                : 'Complete daily missions or maintain daily streak'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-orange-50 border-purple-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" />
            {isRTL ? 'Power-ups مجانية' : 'Free Power-ups'}
          </h3>
          <Badge variant="outline" className="gap-1">
            {availablePowerUps.length}
          </Badge>
        </div>

        <div className="space-y-3">
          {powerUps.map((powerUp) => (
            <motion.div
              key={powerUp.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={`
                relative overflow-hidden cursor-pointer transition-all duration-300
                ${powerUp.used ? 'opacity-50' : 'hover:shadow-lg hover:scale-105'}
                bg-gradient-to-r ${getPowerUpColor(powerUp.type, powerUp.available, powerUp.used)}
              `}>
                <CardContent className="p-4">
                  {/* Used indicator */}
                  {powerUp.used && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="text-white">
                      {getPowerUpIcon(powerUp.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-white">
                          {isRTL ? powerUp.nameAr : powerUp.name}
                        </h4>
                        <span className="text-2xl">
                          {powerUp.icon}
                        </span>
                      </div>
                      <p className="text-sm text-white/90 mb-3">
                        {isRTL ? powerUp.descriptionAr : powerUp.description}
                      </p>
                      
                      {!powerUp.used && powerUp.available && (
                        <Button
                          size="sm"
                          className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
                          onClick={() => handleUsePowerUp(powerUp.type)}
                          disabled={loading}
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            isRTL ? 'استخدم' : 'Use'
                          )}
                        </Button>
                      )}
                      
                      {powerUp.used && (
                        <div className="text-sm text-white/80">
                          {isRTL ? 'تم الاستخدام' : 'Used'} • {
                            powerUp.usedAt 
                              ? powerUp.usedAt.toLocaleTimeString()
                              : ''
                          }
                        </div>
                      )}
                      
                      {!powerUp.available && !powerUp.used && (
                        <div className="text-sm text-white/80">
                          {isRTL ? 'غير متوفر حالياً' : 'Currently unavailable'}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Info section */}
        <div className="mt-4 p-3 bg-white/50 rounded-lg">
          <div className="text-sm text-gray-600">
            <div className="font-semibold mb-1">
              {isRTL ? 'كيف تحصل على Power-ups؟' : 'How to get Power-ups?'}
            </div>
            <ul className="space-y-1 text-xs">
              <li>• {isRTL ? 'حافظ على سلسلة 3 أيام متتالية' : 'Maintain a 3-day streak'}</li>
              <li>• {isRTL ? 'أكمل 3 مهام يومية' : 'Complete 3 daily missions'}</li>
              <li>• {isRTL ? 'تعاون مع 5 مستخدمين للتصويت لنفس المتسابق' : 'Cooperate with 5 users voting for same contestant'}</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

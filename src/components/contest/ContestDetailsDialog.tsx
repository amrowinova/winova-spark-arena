import { Trophy, Crown, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNovaPricing } from '@/hooks/useNovaPricing';
import { ContestHistoryItem } from './ContestHistoryCard';
import { getPlatformUserById } from '@/lib/platformUsers';
import { getCountryFlag } from '@/lib/countryFlags';

interface ContestDetailsDialogProps {
  contest: ContestHistoryItem | null;
  open: boolean;
  onClose: () => void;
  country: string;
}

export function ContestDetailsDialog({ contest, open, onClose, country }: ContestDetailsDialogProps) {
  const { language } = useLanguage();
  const { getCurrencyInfo } = useNovaPricing();
  const pricing = getCurrencyInfo(country);
  const navigate = useNavigate();

  const handleProfileClick = (winnerId: string) => {
    onClose();
    navigate(`/user/${winnerId}`);
  };
  
  if (!contest) return null;
  
  const getUserStatus = () => {
    if (!contest.participated) return 'not_participated';
    if (contest.userRank && contest.userRank <= 5) return 'won';
    if (contest.userRank && contest.userRank <= 50) return 'qualified';
    return 'participated';
  };
  
  const userStatus = getUserStatus();
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'نتائج مسابقة' : 'Contest Results'}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            📅 {contest.date}
            <span className="text-muted-foreground">•</span>
            {language === 'ar' ? 'انتهت المسابقة وتم إعلان الفائزين' : 'Contest ended, winners announced'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Prize Pool Summary */}
          <div className="p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg text-center border border-amber-500/20">
            <p className="text-xs text-muted-foreground mb-1">
              {language === 'ar' ? 'مجموع الجوائز' : 'Prize Pool'}
            </p>
            <p className="text-2xl font-bold text-nova">
              И {contest.prizePool} Nova
            </p>
            <p className="text-xs text-muted-foreground">
              {contest.participants} {language === 'ar' ? 'مشارك' : 'participants'}
            </p>
          </div>
          
          {/* Winners Section */}
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-amber-500" />
              {language === 'ar' ? '🏆 الفائزون' : '🏆 Winners'}
            </h3>
            
            <div className="space-y-2">
              {contest.winners.map((winner, index) => {
                const prizeLocal = winner.prize * pricing.novaRate;
                const platformUser = getPlatformUserById(winner.id);
                return (
                  <div 
                    key={index} 
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      index < 3 
                        ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20' 
                        : 'bg-muted/50'
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index < 3 
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {winner.rank}
                    </div>
                    
                    {/* Avatar - Clickable */}
                    <div 
                      className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                      onClick={() => handleProfileClick(winner.id)}
                    >
                      {platformUser?.avatar || '👤'}
                    </div>
                    
                    {/* Name - Clickable */}
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p 
                          className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleProfileClick(winner.id)}
                        >
                          {winner.name}
                        </p>
                        {platformUser && getCountryFlag(platformUser.country) && (
                          <span className="text-sm shrink-0">{getCountryFlag(platformUser.country)}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {winner.votes} {language === 'ar' ? 'صوت' : 'votes'}
                      </p>
                    </div>
                    
                    {/* Prize - Not clickable */}
                    <div className="text-end">
                      <p className="text-sm font-bold text-nova">И {winner.prize}</p>
                      <p className="text-[10px] text-muted-foreground">
                        ≈ {pricing.symbol} {prizeLocal.toFixed(0)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* User Participation Card */}
          {contest.participated && (
            <Card className={`${userStatus === 'won' ? 'border-amber-500' : userStatus === 'qualified' ? 'border-success' : 'border-primary'}`}>
              <CardContent className="p-4">
                <h4 className="font-bold text-sm flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4" />
                  {language === 'ar' ? '🎯 مشاركتك في هذه المسابقة' : '🎯 Your Participation'}
                </h4>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'مركزك النهائي' : 'Final Rank'}
                  </span>
                  <span className="font-bold text-lg">#{contest.userRank}</span>
                </div>
                
                <Badge 
                  className={`w-full justify-center ${
                    userStatus === 'won' 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
                      : userStatus === 'qualified'
                        ? 'bg-success/10 text-success border-success/30'
                        : 'bg-primary/10 text-primary'
                  }`}
                >
                  {userStatus === 'won' && (language === 'ar' ? '🏆 فزت!' : '🏆 You Won!')}
                  {userStatus === 'qualified' && (language === 'ar' ? '✓ تأهلت للنهائي' : '✓ Qualified for Final')}
                  {userStatus === 'participated' && (language === 'ar' ? 'شاركت' : 'Participated')}
                </Badge>
              </CardContent>
            </Card>
          )}
          
          {!contest.participated && (
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'لم تشارك في هذه المسابقة' : 'You did not participate in this contest'}
              </p>
            </div>
          )}
          
          <p className="text-[10px] text-muted-foreground text-center">
            {language === 'ar' 
              ? 'هذه البيانات ثابتة ولا تتغير'
              : 'This data is frozen and will not change'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

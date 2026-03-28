import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Calendar, AlertCircle, CheckCircle2, Edit2, Save, X } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useBanner } from '@/contexts/BannerContext';
import { supabase } from '@/integrations/supabase/client';

interface FamilyGoal {
  family_id: string;
  goal_amount: number;
  total_received: number;
  deadline: string;
  status: 'active' | 'completed' | 'expired';
}

export default function FamilyGoalsPage() {
  const { language } = useLanguage();
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [goals, setGoals] = useState<FamilyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [newGoalAmount, setNewGoalAmount] = useState<string>('');
  const [newDeadline, setNewDeadline] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch family goals with progress
      const { data, error } = await supabase
        .from('families')
        .select('id, goal_amount, total_received, deadline, status')
        .eq('user_id', user.id);

      if (error) throw error;

      const familyGoals = (data || []).map(family => ({
        family_id: family.id,
        goal_amount: family.goal_amount || 0,
        total_received: family.total_received || 0,
        deadline: family.deadline || '',
        status: family.status || 'active'
      }));

      setGoals(familyGoals);
    } catch (error) {
      console.error('Error fetching goals:', error);
      showError(isRTL ? 'فشل تحميل الأهداف' : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const updateGoal = async (familyId: string) => {
    const amount = parseFloat(newGoalAmount);
    if (!amount || amount <= 0) {
      showError(isRTL ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    if (!newDeadline) {
      showError(isRTL ? 'يرجى اختيار تاريخ' : 'Please select a deadline');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('families')
        .update({
          goal_amount: amount,
          deadline: newDeadline
        })
        .eq('id', familyId)
        .eq('user_id', user!.id); // explicit ownership — defense in depth

      if (error) throw error;

      showSuccess(isRTL ? 'تم تحديث الهدف بنجاح' : 'Goal updated successfully');
      setEditingGoal(null);
      setNewGoalAmount('');
      setNewDeadline('');
      await fetchGoals();
    } catch (error) {
      showError(error instanceof Error ? error.message : (isRTL ? 'فشل تحديث الهدف' : 'Failed to update goal'));
    } finally {
      setUpdating(false);
    }
  };

  const calculateProgress = (goal: FamilyGoal) => {
    if (goal.goal_amount <= 0) return 0;
    return Math.min(100, (goal.total_received / goal.goal_amount) * 100);
  };

  const getDaysRemaining = (deadline: string) => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (goal: FamilyGoal) => {
    const progress = calculateProgress(goal);
    const daysRemaining = getDaysRemaining(goal.deadline);

    if (goal.status === 'completed') return 'bg-green-500';
    if (goal.status === 'expired') return 'bg-gray-400';
    if (progress >= 100) return 'bg-green-500';
    if (daysRemaining !== null && daysRemaining <= 7) return 'bg-red-500';
    if (daysRemaining !== null && daysRemaining <= 30) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getStatusText = (goal: FamilyGoal) => {
    const progress = calculateProgress(goal);
    const daysRemaining = getDaysRemaining(goal.deadline);

    if (goal.status === 'completed') return isRTL ? 'مكتمل' : 'Completed';
    if (goal.status === 'expired') return isRTL ? 'منتهي' : 'Expired';
    if (progress >= 100) return isRTL ? 'الهدف تم تحقيقه' : 'Goal achieved';
    if (daysRemaining !== null && daysRemaining <= 0) return isRTL ? 'انتهت المهلة' : 'Deadline passed';
    if (daysRemaining !== null && daysRemaining <= 7) return isRTL ? `${daysRemaining} أيام متبقية` : `${daysRemaining} days left`;
    if (daysRemaining !== null && daysRemaining <= 30) return isRTL ? `${daysRemaining} أيام متبقية` : `${daysRemaining} days left`;
    return isRTL ? 'نشط' : 'Active';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <InnerPageHeader title={isRTL ? 'أهداف العائلة' : 'Family Goals'} />
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
      <InnerPageHeader title={isRTL ? 'أهداف العائلة' : 'Family Goals'} />

      <main className="flex-1 p-4 space-y-6 pb-20">
        {/* Overview Stats */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-blue-600">
                  {goals.filter(g => g.status === 'active').length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'أهداف نشطة' : 'Active Goals'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-600">
                  {goals.filter(g => calculateProgress(g) >= 100).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'مكتملة' : 'Completed'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-rose-600">
                  {goals.reduce((sum, g) => sum + g.total_received, 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'إجمالي التبرعات' : 'Total Donations'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals List */}
        {goals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h3 className="text-xl font-semibold mb-2">
                {isRTL ? 'لا توجد أهداف بعد' : 'No Goals Yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {isRTL ? 'قم بإنشاء أهداف لجمع التبرعات لعائلتك' : 'Create goals to collect donations for your family'}
              </p>
              <Button className="gap-2">
                <Target className="h-4 w-4" />
                {isRTL ? 'إنشاء هدف جديد' : 'Create New Goal'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = calculateProgress(goal);
              const daysRemaining = getDaysRemaining(goal.deadline);
              const statusColor = getStatusColor(goal);
              const statusText = getStatusText(goal);

              return (
                <motion.div
                  key={goal.family_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="h-5 w-5 text-blue-500" />
                          <h4 className="font-semibold">
                            {isRTL ? 'هدف التبرع' : 'Donation Goal'}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={statusColor.replace('bg-', 'text-') + ' border-current'}>
                            {statusText}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingGoal(goal.family_id);
                              setNewGoalAmount(goal.goal_amount.toString());
                              setNewDeadline(goal.deadline);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{isRTL ? 'التقدم' : 'Progress'}</span>
                          <span className="font-bold text-blue-600">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress} className="h-3" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{goal.total_received} Nova</span>
                          <span>{goal.goal_amount} Nova</span>
                        </div>
                      </div>

                      {/* Deadline */}
                      {goal.deadline && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className={daysRemaining !== null && daysRemaining <= 7 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                            {isRTL ? 'الموعد النهائي:' : 'Deadline:'} {new Date(goal.deadline).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                          </span>
                          {daysRemaining !== null && (
                            <Badge variant={daysRemaining <= 7 ? 'destructive' : 'secondary'}>
                              {daysRemaining <= 0 ? (isRTL ? 'انتهت' : 'Expired') :
                               daysRemaining === 1 ? (isRTL ? 'يوم واحد' : '1 day') :
                               `${daysRemaining} ${isRTL ? 'أيام' : 'days'}`}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Alert for urgent goals */}
                      {daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0 && progress < 100 && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <p className="text-sm text-red-700">
                            {isRTL ? 
                              `متبقي ${daysRemaining} أيام فقط لتحقيق الهدف!` :
                              `Only ${daysRemaining} days left to reach the goal!`
                            }
                          </p>
                        </div>
                      )}

                      {/* Success message */}
                      {progress >= 100 && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <p className="text-sm text-green-700">
                            {isRTL ? 'تم تحقيق الهدف بنجاح!' : 'Goal achieved successfully!'}
                          </p>
                        </div>
                      )}

                      {/* Edit Dialog */}
                      {editingGoal === goal.family_id && (
                        <div className="space-y-3 pt-3 border-t">
                          <h5 className="font-medium text-sm">
                            {isRTL ? 'تعديل الهدف' : 'Edit Goal'}
                          </h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor={`goal-amount-${goal.family_id}`}>
                                {isRTL ? 'المبلغ المستهدف' : 'Target Amount'}
                              </Label>
                              <Input
                                id={`goal-amount-${goal.family_id}`}
                                type="number"
                                value={newGoalAmount}
                                onChange={(e) => setNewGoalAmount(e.target.value)}
                                placeholder="1000"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`deadline-${goal.family_id}`}>
                                {isRTL ? 'الموعد النهائي' : 'Deadline'}
                              </Label>
                              <Input
                                id={`deadline-${goal.family_id}`}
                                type="date"
                                value={newDeadline}
                                onChange={(e) => setNewDeadline(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateGoal(goal.family_id)}
                              disabled={updating}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              {updating ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingGoal(null);
                                setNewGoalAmount('');
                                setNewDeadline('');
                              }}
                            >
                              <X className="h-4 w-4 mr-2" />
                              {isRTL ? 'إلغاء' : 'Cancel'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

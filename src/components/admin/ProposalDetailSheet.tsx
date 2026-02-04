import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Bug, 
  Shield, 
  Lightbulb, 
  CheckCircle2, 
  XCircle,
  MessageSquare,
  Code,
  ArrowRight,
  Clock,
  User,
  Zap
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  type AIProposal, 
  getPriorityBadge, 
  getStatusBadge,
  useApproveProposal,
  useRejectProposal
} from '@/hooks/useAIProposals';

interface ProposalDetailSheetProps {
  proposal: AIProposal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartDiscussion: (proposalId: string) => void;
}

const RISK_COLORS: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/30',
  medium: 'bg-warning/10 text-warning border-warning/30',
  low: 'bg-success/10 text-success border-success/30',
};

const EFFORT_LABELS: Record<string, { ar: string; en: string; icon: typeof Zap }> = {
  small: { ar: 'صغير (< 1 ساعة)', en: 'Small (< 1 hour)', icon: Zap },
  medium: { ar: 'متوسط (1-4 ساعات)', en: 'Medium (1-4 hours)', icon: Zap },
  large: { ar: 'كبير (> 4 ساعات)', en: 'Large (> 4 hours)', icon: Zap },
};

export function ProposalDetailSheet({ 
  proposal, 
  open, 
  onOpenChange,
  onStartDiscussion 
}: ProposalDetailSheetProps) {
  const { language } = useLanguage();
  const [notes, setNotes] = useState('');
  
  const { mutate: approve, isPending: isApproving } = useApproveProposal();
  const { mutate: reject, isPending: isRejecting } = useRejectProposal();

  if (!proposal) return null;

  const lang = language === 'ar' ? 'ar' : 'en';
  const priorityBadge = getPriorityBadge(proposal.priority, lang);
  const statusBadge = getStatusBadge(proposal.status, lang);

  const handleApprove = () => {
    // Instead of approving directly, start a discussion thread
    onStartDiscussion(proposal.id);
  };

  const handleReject = () => {
    reject({ proposalId: proposal.id, notes });
    onOpenChange(false);
  };

  // Parse description for structured content
  const sections = {
    problem: proposal.description,
    risks: proposal.riskLevel ? [
      language === 'ar' 
        ? `مستوى المخاطر: ${proposal.riskLevel === 'high' ? 'عالي' : proposal.riskLevel === 'medium' ? 'متوسط' : 'منخفض'}`
        : `Risk Level: ${proposal.riskLevel}`
    ] : [],
    solutions: proposal.rollbackPlan ? [proposal.rollbackPlan] : [],
    verification: proposal.impactScope ? [proposal.impactScope] : [],
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] p-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* Header */}
            <SheetHeader className="text-right">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <SheetTitle className="text-lg leading-tight">
                    {language === 'ar' ? proposal.titleAr || proposal.title : proposal.title}
                  </SheetTitle>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className={statusBadge.color}>
                      {statusBadge.emoji} {statusBadge.label}
                    </Badge>
                    <Badge variant="outline">
                      {priorityBadge.emoji} {priorityBadge.label}
                    </Badge>
                    {proposal.proposedByName && (
                      <Badge variant="secondary" className="text-xs">
                        <User className="h-3 w-3 ml-1" />
                        {proposal.proposedByName}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <Separator />

            {/* Why This Proposal */}
            <Card className="border-primary/20">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bug className="h-4 w-4 text-destructive" />
                  {language === 'ar' ? 'لماذا هذا الاقتراح؟' : 'Why This Proposal?'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {language === 'ar' ? proposal.descriptionAr || proposal.description : proposal.description}
                </p>
                {proposal.affectedArea && (
                  <Badge variant="outline" className="mt-2">
                    📍 {proposal.affectedArea}
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Discovered Problems */}
            {proposal.impactScope && (
              <Card className="border-warning/20">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    {language === 'ar' ? 'المشاكل المكتشفة' : 'Discovered Problems'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {proposal.impactScope}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Risks */}
            {proposal.riskLevel && (
              <Card className={`border ${RISK_COLORS[proposal.riskLevel] || 'border-border'}`}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {language === 'ar' ? 'المخاطر' : 'Risks'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Badge className={RISK_COLORS[proposal.riskLevel]}>
                    {proposal.riskLevel === 'high' 
                      ? (language === 'ar' ? '🔴 مخاطر عالية' : '🔴 High Risk')
                      : proposal.riskLevel === 'medium'
                      ? (language === 'ar' ? '🟡 مخاطر متوسطة' : '🟡 Medium Risk')
                      : (language === 'ar' ? '🟢 مخاطر منخفضة' : '🟢 Low Risk')
                    }
                  </Badge>
                  {proposal.estimatedEffort && EFFORT_LABELS[proposal.estimatedEffort] && (
                    <Badge variant="outline" className="mr-2">
                      <Clock className="h-3 w-3 ml-1" />
                      {language === 'ar' 
                        ? EFFORT_LABELS[proposal.estimatedEffort].ar 
                        : EFFORT_LABELS[proposal.estimatedEffort].en
                      }
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Suggested Solutions */}
            {proposal.rollbackPlan && (
              <Card className="border-success/20">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-success" />
                    {language === 'ar' ? 'الحلول المقترحة' : 'Suggested Solutions'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {proposal.rollbackPlan}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Code Snippet */}
            {proposal.codeSnippet && (
              <Card className="border-info/20">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Code className="h-4 w-4 text-info" />
                    {language === 'ar' ? 'كود مقترح' : 'Code Snippet'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono">
                    {proposal.codeSnippet}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* How to Verify */}
            <Card className="border-info/20">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-info" />
                  {language === 'ar' ? 'كيف نتحقق من المشكلة؟' : 'How to Verify?'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' 
                    ? `افحص: ${proposal.affectedArea || 'النظام'}`
                    : `Check: ${proposal.affectedArea || 'System'}`
                  }
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowRight className="h-3 w-3" />
                  {language === 'ar' 
                    ? 'راجع الجداول والـ RPCs المتأثرة'
                    : 'Review affected tables and RPCs'
                  }
                </div>
              </CardContent>
            </Card>

            {/* Admin Notes */}
            {proposal.status === 'pending' && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">
                    {language === 'ar' ? 'ملاحظات الإدارة' : 'Admin Notes'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={language === 'ar' ? 'أضف ملاحظاتك...' : 'Add your notes...'}
                    className="min-h-[80px]"
                  />
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            {proposal.status === 'pending' && (
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleApprove}
                  className="flex-1"
                  disabled={isApproving}
                >
                  <MessageSquare className="h-4 w-4 ml-2" />
                  {language === 'ar' ? 'فتح نقاش' : 'Open Discussion'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  className="flex-1"
                  disabled={isRejecting}
                >
                  <XCircle className="h-4 w-4 ml-2" />
                  {language === 'ar' ? 'رفض' : 'Reject'}
                </Button>
              </div>
            )}

            {/* Already processed */}
            {proposal.status !== 'pending' && proposal.adminNotes && (
              <Card className="bg-muted/50">
                <CardContent className="py-3">
                  <p className="text-sm font-medium mb-1">
                    {language === 'ar' ? 'ملاحظات الإدارة:' : 'Admin Notes:'}
                  </p>
                  <p className="text-sm text-muted-foreground">{proposal.adminNotes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

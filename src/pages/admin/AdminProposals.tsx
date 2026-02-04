import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Filter,
  MessageSquare,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { 
  useAIProposals, 
  type AIProposal,
  getPriorityBadge
} from '@/hooks/useAIProposals';
import { ProposalDetailSheet } from '@/components/admin/ProposalDetailSheet';
import { ProposalDiscussionSheet } from '@/components/admin/ProposalDiscussionSheet';

function ProposalCard({ 
  proposal, 
  onClick 
}: { 
  proposal: AIProposal; 
  onClick: () => void;
}) {
  const { language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const priority = getPriorityBadge(proposal.priority, lang);

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${
            proposal.priority === 'critical' ? 'bg-destructive/10' :
            proposal.priority === 'high' ? 'bg-warning/10' :
            'bg-primary/10'
          }`}>
            <FileText className={`h-5 w-5 ${
              proposal.priority === 'critical' ? 'text-destructive' :
              proposal.priority === 'high' ? 'text-warning' :
              'text-primary'
            }`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-1">
              {language === 'ar' ? proposal.titleAr || proposal.title : proposal.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {language === 'ar' ? proposal.descriptionAr || proposal.description : proposal.description}
            </p>
            
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">
                {priority.emoji} {priority.label}
              </Badge>
              {proposal.affectedArea && (
                <Badge variant="secondary" className="text-[10px]">
                  📍 {proposal.affectedArea}
                </Badge>
              )}
              {proposal.proposedByName && (
                <Badge variant="outline" className="text-[10px]">
                  🤖 {proposal.proposedByName}
                </Badge>
              )}
            </div>
            
            <p className="text-[10px] text-muted-foreground mt-2">
              {new Date(proposal.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
            </p>
          </div>
          
          <div className="shrink-0">
            {proposal.status === 'pending' && (
              <Clock className="h-4 w-4 text-warning" />
            )}
            {proposal.status === 'approved' && (
              <CheckCircle className="h-4 w-4 text-success" />
            )}
            {proposal.status === 'rejected' && (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminProposals() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [selectedProposal, setSelectedProposal] = useState<AIProposal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  
  const { data: pendingProposals = [], isLoading: pendingLoading } = useAIProposals('pending');
  const { data: approvedProposals = [], isLoading: approvedLoading } = useAIProposals('approved');
  const { data: rejectedProposals = [], isLoading: rejectedLoading } = useAIProposals('rejected');

  const handleProposalClick = (proposal: AIProposal) => {
    setSelectedProposal(proposal);
    setDetailOpen(true);
  };

  const handleStartDiscussion = (proposalId: string) => {
    setDetailOpen(false);
    setDiscussionOpen(true);
  };

  const renderProposalList = (proposals: AIProposal[], isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      );
    }

    if (proposals.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {isRTL ? 'لا توجد مقترحات' : 'No proposals'}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {proposals.map(proposal => (
          <ProposalCard 
            key={proposal.id} 
            proposal={proposal}
            onClick={() => handleProposalClick(proposal)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <InnerPageHeader 
        title={isRTL ? 'مقترحات AI' : 'AI Proposals'} 
        onBack={() => navigate('/admin')}
      />
      
      <div className="container pb-24 pt-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Clock className="h-6 w-6 mx-auto mb-1 text-warning" />
              <p className="text-xl font-bold">{pendingProposals.length}</p>
              <p className="text-[10px] text-muted-foreground">
                {isRTL ? 'بانتظار' : 'Pending'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-1 text-success" />
              <p className="text-xl font-bold">{approvedProposals.length}</p>
              <p className="text-[10px] text-muted-foreground">
                {isRTL ? 'معتمد' : 'Approved'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <XCircle className="h-6 w-6 mx-auto mb-1 text-destructive" />
              <p className="text-xl font-bold">{rejectedProposals.length}</p>
              <p className="text-[10px] text-muted-foreground">
                {isRTL ? 'مرفوض' : 'Rejected'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="text-xs">
              ⏳ {isRTL ? 'بانتظار' : 'Pending'}
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">
              ✅ {isRTL ? 'معتمد' : 'Approved'}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs">
              ❌ {isRTL ? 'مرفوض' : 'Rejected'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {renderProposalList(pendingProposals, pendingLoading)}
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            {renderProposalList(approvedProposals, approvedLoading)}
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            {renderProposalList(rejectedProposals, rejectedLoading)}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Sheet */}
      <ProposalDetailSheet
        proposal={selectedProposal}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStartDiscussion={handleStartDiscussion}
      />

      {/* Discussion Sheet */}
      <ProposalDiscussionSheet
        proposal={selectedProposal}
        open={discussionOpen}
        onOpenChange={setDiscussionOpen}
      />
    </div>
  );
}

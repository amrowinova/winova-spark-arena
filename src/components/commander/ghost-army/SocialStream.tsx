import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, MessageSquare, Loader2 } from 'lucide-react';

interface SocialMessage {
  id: string;
  content: string;
  sender_name: string;
  sender_username: string;
  partner_name: string;
  conversation_id: string;
  created_at: string;
}

export function SocialStream({ isAr }: { isAr: boolean }) {
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationCount, setConversationCount] = useState(0);

  const fetchSocialMessages = async () => {
    setLoading(true);
    try {
      // Get ghost social messages
      const { data: msgs } = await supabase
        .from('direct_messages')
        .select('id, content, sender_id, conversation_id, created_at')
        .like('content', '%[GHOST_SOCIAL]%')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!msgs || msgs.length === 0) {
        setMessages([]);
        setConversationCount(0);
        setLoading(false);
        return;
      }

      // Get unique sender IDs
      const senderIds = [...new Set(msgs.map(m => m.sender_id))];
      const convIds = [...new Set(msgs.map(m => m.conversation_id))];
      setConversationCount(convIds.length);

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, username')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Get conversation partners
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, participant1_id, participant2_id')
        .in('id', convIds);

      const convMap = new Map(convs?.map(c => [c.id, c]) || []);

      const enriched: SocialMessage[] = msgs.map(m => {
        const sender = profileMap.get(m.sender_id);
        const conv = convMap.get(m.conversation_id);
        const partnerId = conv
          ? (conv.participant1_id === m.sender_id ? conv.participant2_id : conv.participant1_id)
          : null;
        const partner = partnerId ? profileMap.get(partnerId) : null;

        return {
          id: m.id,
          content: m.content.replace('[GHOST_SOCIAL] ', ''),
          sender_name: sender?.name || sender?.username || 'Unknown',
          sender_username: sender?.username || '',
          partner_name: partner?.name || partner?.username || 'Unknown',
          conversation_id: m.conversation_id,
          created_at: m.created_at,
        };
      });

      setMessages(enriched);
    } catch (err) {
      console.error('Social stream fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSocialMessages(); }, []);

  // Group messages by conversation
  const grouped = messages.reduce((acc, m) => {
    if (!acc[m.conversation_id]) acc[m.conversation_id] = [];
    acc[m.conversation_id].push(m);
    return acc;
  }, {} as Record<string, SocialMessage[]>);

  const conversations = Object.entries(grouped).slice(0, 20);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {isAr ? 'البث الاجتماعي المباشر' : 'Live Social Stream'}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {conversationCount} {isAr ? 'محادثة' : 'chats'}
          </Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={fetchSocialMessages} disabled={loading} className="h-7 gap-1">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {isAr ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {conversations.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          {isAr
            ? 'لا توجد محادثات اجتماعية بعد. شغّل مهمة "اجتماعي ذكي".'
            : 'No social conversations yet. Run a "Sentient Social" mission.'}
        </p>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-2">
            {conversations.map(([convId, msgs]) => {
              const sorted = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              const firstMsg = sorted[0];
              return (
                <div key={convId} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{firstMsg.sender_name}</span>
                    <span>↔</span>
                    <span className="font-medium text-foreground">{firstMsg.partner_name}</span>
                    <span className="mr-auto" />
                    <span>{new Date(firstMsg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="space-y-1.5">
                    {sorted.map((msg, idx) => {
                      const isFirst = msg.sender_name === firstMsg.sender_name;
                      return (
                        <div key={msg.id} className={`flex ${isFirst ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs ${
                            isFirst
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-primary/10 text-foreground'
                          }`} dir="rtl">
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

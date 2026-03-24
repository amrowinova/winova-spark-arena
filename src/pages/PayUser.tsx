import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getCountryFlag } from '@/lib/countryFlags';
import { TransferNovaDialog } from '@/components/wallet/TransferNovaDialog';

// Nova ID pattern: 2 letters + dash + 6+ digits  e.g. EG-000042
const NOVA_ID_RE = /^[A-Za-z]{2}-\d{6,}$/;

interface PayeeProfile {
  id: string;
  user_id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  country: string;
  nova_id?: string;
}

export default function PayUser() {
  const { username } = useParams<{ username: string }>();
  const { language } = useLanguage();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const [payee, setPayee] = useState<PayeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);

      let data: PayeeProfile | null = null;

      if (NOVA_ID_RE.test(username)) {
        // Search by Nova ID
        const { data: rows } = await supabase
          .rpc('find_user_by_nova_id', { p_nova_id: username.toUpperCase() });
        if (rows && rows.length > 0) {
          const r = rows[0];
          data = {
            id: r.user_id,
            user_id: r.user_id,
            name: r.full_name,
            username: r.username,
            avatar_url: r.avatar_url,
            country: r.country,
            nova_id: r.nova_id,
          };
        }
      } else {
        // Search by username
        const { data: row } = await supabase
          .from('profiles')
          .select('id, user_id, name, username, avatar_url, country, nova_id')
          .eq('username', username.toLowerCase())
          .maybeSingle();
        if (row) data = row as PayeeProfile;
      }

      if (!data) {
        setNotFound(true);
      } else {
        setPayee(data);
      }
      setLoading(false);
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !payee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">
          {isRTL ? 'المستخدم غير موجود' : 'User not found'}
        </h1>
        <p className="text-muted-foreground text-center mb-6">
          {isRTL ? `لا يوجد مستخدم بالاسم @${username}` : `No user found with @${username}`}
        </p>
        <Button onClick={() => navigate('/')} variant="outline">
          {isRTL ? 'الرئيسية' : 'Go Home'}
        </Button>
      </div>
    );
  }

  const isSelf = authUser?.id === payee.user_id;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-sm p-6 space-y-6">
        {/* Payee Info */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Avatar className="h-20 w-20 border-2 border-primary/20">
            {payee.avatar_url && <AvatarImage src={payee.avatar_url} />}
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
              {payee.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold text-foreground">{payee.name}</h1>
            <p className="text-muted-foreground">@{payee.username}</p>
            {payee.nova_id && (
              <p className="text-xs font-mono font-bold text-primary/70 mt-0.5 tracking-wider">
                {payee.nova_id}
              </p>
            )}
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-1">
              <span>{getCountryFlag(payee.country)}</span>
              <span>{payee.country}</span>
            </div>
          </div>
        </div>

        {/* Action */}
        {!authUser ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              {isRTL ? 'سجل دخولك لإرسال Nova' : 'Sign in to send Nova'}
            </p>
            <Button className="w-full" onClick={() => navigate('/')}>
              {isRTL ? 'تسجيل الدخول' : 'Sign In'}
            </Button>
          </div>
        ) : isSelf ? (
          <p className="text-sm text-muted-foreground text-center">
            {isRTL ? 'لا يمكنك الدفع لنفسك' : "You can't pay yourself"}
          </p>
        ) : (
          <Button
            className="w-full h-12 bg-nova hover:bg-nova/90 text-nova-foreground font-bold"
            onClick={() => setTransferOpen(true)}
          >
            <Send className="h-5 w-5 me-2" />
            {isRTL ? `إرسال Nova إلى ${payee.name}` : `Send Nova to ${payee.name}`}
          </Button>
        )}
      </Card>

      {payee && (
        <TransferNovaDialog
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          recipientId={payee.user_id}
          recipientName={payee.name}
          recipientUsername={payee.username}
          recipientCountry={payee.country}
          recipientAvatar={payee.avatar_url || undefined}
        />
      )}
    </div>
  );
}

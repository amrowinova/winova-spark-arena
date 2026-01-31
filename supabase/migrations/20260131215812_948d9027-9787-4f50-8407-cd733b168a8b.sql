-- =============================================
-- WINOVA DATABASE SCHEMA - COMPLETE SETUP
-- =============================================

-- 1. Create custom types
CREATE TYPE public.user_rank AS ENUM ('subscriber', 'marketer', 'leader', 'manager', 'president');
CREATE TYPE public.engagement_status AS ENUM ('both', 'contest', 'vote', 'none');
CREATE TYPE public.p2p_order_type AS ENUM ('buy', 'sell');
CREATE TYPE public.p2p_order_status AS ENUM ('open', 'matched', 'awaiting_payment', 'payment_sent', 'completed', 'cancelled', 'disputed');
CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer', 'contest_entry', 'contest_win', 'vote', 'p2p_buy', 'p2p_sell', 'referral_bonus', 'team_earnings');
CREATE TYPE public.currency_type AS ENUM ('nova', 'aura');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. User Roles Table (Security - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  rank user_rank NOT NULL DEFAULT 'subscriber',
  country TEXT NOT NULL DEFAULT 'Saudi Arabia',
  city TEXT,
  wallet_country TEXT NOT NULL DEFAULT 'Saudi Arabia',
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.profiles(id),
  engagement_status engagement_status NOT NULL DEFAULT 'none',
  weekly_active BOOLEAN NOT NULL DEFAULT false,
  activity_percentage INTEGER NOT NULL DEFAULT 0,
  team_activity_percentage INTEGER NOT NULL DEFAULT 0,
  spotlight_points INTEGER NOT NULL DEFAULT 0,
  active_weeks INTEGER NOT NULL DEFAULT 0,
  current_week INTEGER NOT NULL DEFAULT 1,
  has_joined_with_nova BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Wallets Table (Nova И and Aura ✦)
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nova_balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
  locked_nova_balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
  aura_balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Transactions Table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  currency currency_type NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  description TEXT,
  description_ar TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. P2P Payment Methods
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider_name TEXT NOT NULL,
  provider_name_ar TEXT,
  account_number TEXT,
  iban TEXT,
  phone_number TEXT,
  full_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  country TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. P2P Orders
CREATE TABLE public.p2p_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  executor_id UUID REFERENCES auth.users(id),
  order_type p2p_order_type NOT NULL,
  status p2p_order_status NOT NULL DEFAULT 'open',
  nova_amount DECIMAL(18, 2) NOT NULL,
  local_amount DECIMAL(18, 2) NOT NULL,
  exchange_rate DECIMAL(18, 4) NOT NULL,
  country TEXT NOT NULL,
  payment_method_id UUID REFERENCES public.payment_methods(id),
  time_limit_minutes INTEGER NOT NULL DEFAULT 15,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. P2P Chat Messages (Realtime enabled)
CREATE TABLE public.p2p_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.p2p_orders(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  content_ar TEXT,
  is_system_message BOOLEAN NOT NULL DEFAULT false,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Contests Table
CREATE TABLE public.contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  entry_fee DECIMAL(18, 2) NOT NULL,
  prize_pool DECIMAL(18, 2) NOT NULL DEFAULT 0,
  max_participants INTEGER,
  current_participants INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Contest Entries
CREATE TABLE public.contest_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  votes_received INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  prize_won DECIMAL(18, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contest_id, user_id)
);

-- 11. Votes Table
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID REFERENCES public.contests(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contestant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  aura_spent DECIMAL(18, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Team Members (Direct/Indirect referrals)
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (leader_id, member_id)
);

-- 13. Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  message TEXT NOT NULL,
  message_ar TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTION FOR ROLES
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- User Roles Policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Profiles Policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wallets Policies (Private - only owner)
CREATE POLICY "Users can view their own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON public.wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payment Methods Policies
CREATE POLICY "Users can view their own payment methods" ON public.payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own payment methods" ON public.payment_methods
  FOR ALL USING (auth.uid() = user_id);

-- P2P Orders Policies
CREATE POLICY "Users can view orders they are involved in" ON public.p2p_orders
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = executor_id OR status = 'open');

CREATE POLICY "Users can create orders" ON public.p2p_orders
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Involved users can update orders" ON public.p2p_orders
  FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = executor_id);

-- P2P Messages Policies (Chat stays open always)
CREATE POLICY "Order participants can view messages" ON public.p2p_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.p2p_orders
      WHERE id = order_id
      AND (creator_id = auth.uid() OR executor_id = auth.uid())
    )
  );

CREATE POLICY "Order participants can send messages" ON public.p2p_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.p2p_orders
      WHERE id = order_id
      AND (creator_id = auth.uid() OR executor_id = auth.uid())
    )
  );

-- Contests Policies
CREATE POLICY "Contests are viewable by everyone" ON public.contests
  FOR SELECT USING (true);

-- Contest Entries Policies
CREATE POLICY "Entries are viewable by everyone" ON public.contest_entries
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own entries" ON public.contest_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Votes Policies
CREATE POLICY "Votes are viewable by everyone" ON public.votes
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own votes" ON public.votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- Team Members Policies
CREATE POLICY "Users can view their team" ON public.team_members
  FOR SELECT USING (auth.uid() = leader_id OR auth.uid() = member_id);

-- Notifications Policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_p2p_orders_updated_at
  BEFORE UPDATE ON public.p2p_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and wallet on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, name, username, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    'WINOVA-' || upper(substr(md5(random()::text), 1, 6))
  );
  
  -- Create wallet with initial balance
  INSERT INTO public.wallets (user_id, nova_balance, aura_balance)
  VALUES (NEW.id, 0, 0);
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'WINOVA-' || upper(substr(md5(random()::text), 1, 6));
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- ENABLE REALTIME FOR CHAT & P2P
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.p2p_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.p2p_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =============================================
-- CREATE STORAGE BUCKET FOR AVATARS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('contest-images', 'contest-images', true);

-- Storage Policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Contest images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'contest-images');

-- ═══════════════════════════════════════════════════════════════════════
-- AGENTS SYSTEM — Tables
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 3.00,
  bio TEXT,
  avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  trust_score INTEGER NOT NULL DEFAULT 100,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  total_completed INTEGER NOT NULL DEFAULT 0,
  total_cancellations INTEGER NOT NULL DEFAULT 0,
  total_disputes INTEGER NOT NULL DEFAULT 0,
  avg_response_time_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active agents"
  ON public.agents FOR SELECT
  USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Users can insert own agent application"
  ON public.agents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update any agent"
  ON public.agents FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- 2. Agent deposit requests
CREATE TABLE IF NOT EXISTS public.agent_deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_nova NUMERIC(18,2) NOT NULL,
  amount_local NUMERIC(18,2),
  payment_method TEXT NOT NULL,
  payment_reference TEXT NOT NULL,
  admin_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.agent_deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can read own deposit requests"
  ON public.agent_deposit_requests FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can insert own deposit requests"
  ON public.agent_deposit_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update deposit requests"
  ON public.agent_deposit_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Agent reservations
CREATE TABLE IF NOT EXISTS public.agent_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('deposit','withdraw')),
  nova_amount NUMERIC(18,2) NOT NULL,
  fiat_amount NUMERIC(18,2),
  fiat_currency TEXT,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 3.00,
  commission_nova NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','active','completed','cancelled','rejected','disputed','resolved')),
  escrow_holder TEXT CHECK (escrow_holder IN ('user','agent')),
  user_confirmed_at TIMESTAMPTZ,
  agent_confirmed_at TIMESTAMPTZ,
  escrow_deadline TIMESTAMPTZ,
  extension_requested_by UUID,
  extension_minutes INTEGER,
  extension_status TEXT,
  dispute_reason TEXT,
  dispute_resolution TEXT,
  reject_reason TEXT,
  notes TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reservations"
  ON public.agent_reservations FOR SELECT
  USING (user_id = auth.uid() OR agent_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert reservations"
  ON public.agent_reservations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Participants and admins can update reservations"
  ON public.agent_reservations FOR UPDATE
  USING (user_id = auth.uid() OR agent_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 4. Agent messages
CREATE TABLE IF NOT EXISTS public.agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.agent_reservations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_system_msg BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reservation participants can read messages"
  ON public.agent_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_reservations ar
      WHERE ar.id = reservation_id
      AND (ar.user_id = auth.uid() OR ar.agent_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Reservation participants can send messages"
  ON public.agent_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.agent_reservations ar
      WHERE ar.id = reservation_id
      AND (ar.user_id = auth.uid() OR ar.agent_user_id = auth.uid())
    )
  );

-- 5. Agent reviews
CREATE TABLE IF NOT EXISTS public.agent_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.agent_reservations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  has_issue BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reservation_id, reviewer_id)
);

ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read agent reviews"
  ON public.agent_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own reviews"
  ON public.agent_reviews FOR INSERT
  WITH CHECK (reviewer_id = auth.uid());

-- Enable realtime for messages and reservations
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_reservations;

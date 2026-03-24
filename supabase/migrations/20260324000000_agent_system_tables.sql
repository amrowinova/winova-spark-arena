-- ============================================================
-- AGENT SYSTEM: Tables, RLS, Indexes, Realtime
-- ============================================================

-- ── 1. agents ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name               TEXT NOT NULL,
  whatsapp                TEXT NOT NULL,
  country                 TEXT NOT NULL,
  city                    TEXT NOT NULL,
  latitude                NUMERIC,
  longitude               NUMERIC,
  commission_pct          NUMERIC NOT NULL DEFAULT 5 CHECK (commission_pct BETWEEN 1 AND 20),
  bio                     TEXT,
  status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','active','rejected','suspended')),
  avg_rating              NUMERIC NOT NULL DEFAULT 0 CHECK (avg_rating BETWEEN 0 AND 5),
  trust_score             NUMERIC NOT NULL DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  total_reviews           INTEGER NOT NULL DEFAULT 0,
  total_completed         INTEGER NOT NULL DEFAULT 0,
  total_cancellations     INTEGER NOT NULL DEFAULT 0,
  total_disputes          INTEGER NOT NULL DEFAULT 0,
  avg_response_time_seconds NUMERIC,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ── 2. agent_reservations ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_reservations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id                UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                    TEXT NOT NULL CHECK (type IN ('deposit','withdraw')),
  nova_amount             NUMERIC NOT NULL CHECK (nova_amount > 0),
  fiat_amount             NUMERIC,
  fiat_currency           TEXT,
  commission_pct          NUMERIC NOT NULL DEFAULT 5,
  commission_nova         NUMERIC NOT NULL DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','accepted','active','completed','cancelled','disputed','expired')),
  escrow_holder           TEXT CHECK (escrow_holder IN ('user','agent')),
  user_confirmed_at       TIMESTAMPTZ,
  agent_confirmed_at      TIMESTAMPTZ,
  escrow_deadline         TIMESTAMPTZ,
  extension_requested_by  UUID REFERENCES auth.users(id),
  extension_minutes       INTEGER,
  extension_status        TEXT CHECK (extension_status IN ('pending','accepted','declined')),
  reject_reason           TEXT,
  cancel_reason           TEXT,
  dispute_reason          TEXT,
  dispute_resolution      TEXT,
  user_rating             SMALLINT CHECK (user_rating BETWEEN 1 AND 5),
  user_review_comment     TEXT,
  user_has_issue          BOOLEAN DEFAULT FALSE,
  agent_rating            SMALLINT CHECK (agent_rating BETWEEN 1 AND 5),
  agent_review_comment    TEXT,
  agent_has_issue         BOOLEAN DEFAULT FALSE,
  notes                   TEXT,
  expires_at              TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. agent_messages ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID NOT NULL REFERENCES public.agent_reservations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  is_system_msg   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agents_status          ON public.agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_country_city    ON public.agents(country, city);
CREATE INDEX IF NOT EXISTS idx_agents_trust_rating    ON public.agents(trust_score DESC, avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_agent     ON public.agent_reservations(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_user      ON public.agent_reservations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_created   ON public.agent_reservations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_messages_res     ON public.agent_messages(reservation_id, created_at ASC);

-- ── updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_agent_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.touch_agent_updated_at();

CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON public.agent_reservations
  FOR EACH ROW EXECUTE FUNCTION public.touch_agent_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- agents: anyone can see active; owner/admin can see own
CREATE POLICY "Public can view active agents"
  ON public.agents FOR SELECT
  USING (status = 'active' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can apply as agent"
  ON public.agents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agent owner can update own profile"
  ON public.agents FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- reservations: user or agent involved can see
CREATE POLICY "Users see own reservations"
  ON public.agent_reservations FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Authenticated can create reservations"
  ON public.agent_reservations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Parties can update reservations"
  ON public.agent_reservations FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- messages: both parties in the reservation
CREATE POLICY "Parties can view messages"
  ON public.agent_messages FOR SELECT
  TO authenticated
  USING (
    reservation_id IN (
      SELECT id FROM public.agent_reservations
      WHERE user_id = auth.uid()
         OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Parties can send messages"
  ON public.agent_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND reservation_id IN (
      SELECT id FROM public.agent_reservations
      WHERE user_id = auth.uid()
         OR agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    )
  );

-- ── Realtime ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_messages;

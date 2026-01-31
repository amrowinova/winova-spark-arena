-- Create support_tickets table for ticket management
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  assigned_to UUID NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  reference_type TEXT NULL,
  reference_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL,
  rating INTEGER NULL CHECK (rating >= 1 AND rating <= 5)
);

-- Create support_messages table for ticket conversations
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is support staff
CREATE OR REPLACE FUNCTION public.is_support_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('support', 'admin', 'moderator')
  )
$$;

-- RLS Policies for support_tickets

-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

-- Support staff can view all tickets
CREATE POLICY "Support staff can view all tickets"
ON public.support_tickets FOR SELECT
USING (public.is_support_staff(auth.uid()));

-- Users can create tickets
CREATE POLICY "Users can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Support staff can update any ticket
CREATE POLICY "Support staff can update tickets"
ON public.support_tickets FOR UPDATE
USING (public.is_support_staff(auth.uid()));

-- Users can update their own tickets (for rating)
CREATE POLICY "Users can update their own tickets"
ON public.support_tickets FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for support_messages

-- Users can view messages on their tickets (non-internal only)
CREATE POLICY "Users can view messages on their tickets"
ON public.support_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_messages.ticket_id
    AND user_id = auth.uid()
  )
  AND is_internal = false
);

-- Support staff can view all messages
CREATE POLICY "Support staff can view all messages"
ON public.support_messages FOR SELECT
USING (public.is_support_staff(auth.uid()));

-- Users can send messages on their tickets (non-internal)
CREATE POLICY "Users can send messages on their tickets"
ON public.support_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_messages.ticket_id
    AND user_id = auth.uid()
  )
  AND is_internal = false
);

-- Support staff can send messages
CREATE POLICY "Support staff can send messages"
ON public.support_messages FOR INSERT
WITH CHECK (public.is_support_staff(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for support tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Add indexes for performance
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_messages_ticket_id ON public.support_messages(ticket_id);
-- Part 2: Insert the new AI agents
INSERT INTO public.ai_agents (agent_name, agent_name_ar, agent_role, focus_areas, is_active, behavior_description)
VALUES
  ('Android Engineer', 'مهندس أندرويد', 'android_engineer', 
   ARRAY['mobile_ux', 'android_performance', 'kotlin', 'jetpack_compose', 'native_features'],
   true, 'يحلل تجربة الموبايل من منظور Android ويقترح تحسينات للأداء وتجربة المستخدم'),
  
  ('iOS Engineer', 'مهندس iOS', 'ios_engineer', 
   ARRAY['swift', 'swiftui', 'ios_guidelines', 'app_store', 'native_performance'],
   true, 'يراجع التوافق مع iOS ويقترح تحسينات حسب Apple Human Interface Guidelines'),
  
  ('Web Engineer', 'مهندس الويب', 'web_engineer', 
   ARRAY['react', 'typescript', 'performance', 'accessibility', 'seo', 'pwa'],
   true, 'متخصص في React/TypeScript وتحسين الأداء والـ SEO'),
  
  ('Challenger AI', 'المتحدي', 'challenger_ai', 
   ARRAY['critical_thinking', 'edge_cases', 'devil_advocate', 'stress_testing', 'assumptions'],
   true, 'يتحدى الحلول المقترحة ويستفز الفريق للتفكير أعمق ويكشف نقاط الضعف')
ON CONFLICT DO NOTHING;

-- Create table for AI proposals (governance)
CREATE TABLE IF NOT EXISTS public.ai_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.ai_human_sessions(id),
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT NOT NULL,
  description_ar TEXT,
  proposal_type TEXT NOT NULL DEFAULT 'enhancement',
  priority TEXT NOT NULL DEFAULT 'medium',
  affected_area TEXT,
  proposed_by UUID REFERENCES public.ai_agents(id),
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_proposals ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_proposals
CREATE POLICY "Admins can manage all proposals"
  ON public.ai_proposals
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Presidents and managers can view proposals"
  ON public.ai_proposals
  FOR SELECT
  USING (can_access_ai_control_room(auth.uid()));

-- Update ai_chat_room to support turn-based and deliberate mode
ALTER TABLE public.ai_chat_room 
  ADD COLUMN IF NOT EXISTS turn_order INTEGER,
  ADD COLUMN IF NOT EXISTS previous_context TEXT,
  ADD COLUMN IF NOT EXISTS is_proposal BOOLEAN DEFAULT false;

-- Update ai_human_sessions for turn-based responses
ALTER TABLE public.ai_human_sessions
  ADD COLUMN IF NOT EXISTS response_mode TEXT DEFAULT 'sequential',
  ADD COLUMN IF NOT EXISTS agents_order JSONB DEFAULT '[]';
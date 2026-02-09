import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BuildProject {
  id: string;
  title: string;
  title_ar: string | null;
  description: string;
  description_ar: string | null;
  status: string;
  current_phase: string;
  risk_level: string;
  phase_progress: Record<string, string> | null;
  architecture: any;
  db_schemas: any;
  backend_services: any;
  frontend_components: any;
  infra_config: any;
  stack_choices: any;
  api_docs: any;
  env_variables: any;
  run_instructions: string | null;
  model_used: string | null;
  duration_ms: number | null;
  conversation_id: string;
  requested_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectActivity {
  id: string;
  project_id: string;
  activity_type: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  agent_id: string | null;
  risk_level: string;
  created_at: string;
  metadata: any;
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  phase_name: string;
  phase_name_ar: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  output_summary: string | null;
  output_summary_ar: string | null;
  created_at: string;
}

export function useProjectOS(conversationId?: string) {
  const [projects, setProjects] = useState<BuildProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const query = supabase
      .from('ai_build_projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (conversationId) {
      query.eq('conversation_id', conversationId);
    }

    const { data } = await query;
    if (data) {
      setProjects(data.map(p => ({
        ...p,
        phase_progress: (p.phase_progress as Record<string, string>) || null,
      })) as BuildProject[]);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('project-os-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ai_build_projects',
      }, () => {
        fetchProjects();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchProjects]);

  return { projects, loading, refetch: fetchProjects };
}

export function useProjectDetail(projectId: string | null) {
  const [project, setProject] = useState<BuildProject | null>(null);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      const [projRes, actRes, phaseRes] = await Promise.all([
        supabase.from('ai_build_projects').select('*').eq('id', projectId).single(),
        supabase.from('project_activity').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(50),
        supabase.from('project_phases').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
      ]);

      if (projRes.data) setProject({
        ...projRes.data,
        phase_progress: (projRes.data.phase_progress as Record<string, string>) || null,
      } as BuildProject);
      if (actRes.data) setActivities(actRes.data as ProjectActivity[]);
      if (phaseRes.data) setPhases(phaseRes.data as ProjectPhase[]);
      setLoading(false);
    };

    load();

    // Realtime for activity
    const ch = supabase
      .channel(`proj-detail-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_build_projects', filter: `id=eq.${projectId}` }, (p: any) => {
        if (p.new) setProject({ ...p.new, phase_progress: p.new.phase_progress || null } as BuildProject);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_activity', filter: `project_id=eq.${projectId}` }, (p: any) => {
        if (p.new) setActivities(prev => [p.new as ProjectActivity, ...prev]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_phases', filter: `project_id=eq.${projectId}` }, () => {
        supabase.from('project_phases').select('*').eq('project_id', projectId).order('created_at', { ascending: true }).then(r => {
          if (r.data) setPhases(r.data as ProjectPhase[]);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [projectId]);

  return { project, activities, phases, loading };
}

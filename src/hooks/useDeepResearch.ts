import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ResearchProject {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  research_outputs: { count: number }[];
  research_simulations: { count: number }[];
  research_integrity_scores: { count: number }[];
}

interface ResearchOutput {
  id: string;
  file_name: string;
  file_type: string;
  content: string;
  version: number;
  created_at: string;
}

interface IntegrityScore {
  id: string;
  mathematical_consistency: number;
  regulatory_feasibility: number;
  attack_resistance: number;
  liquidity_robustness: number;
  overall_score: number;
  failure_report: string | null;
  created_at: string;
}

interface ResearchConcept {
  id: string;
  name: string;
  category: string;
  definition: string;
  confidence_score: number;
  contradiction_flag: boolean;
  first_detected_at: string;
  last_updated_at: string;
}

interface ConceptRelation {
  id: string;
  concept_id: string;
  related_concept_id: string;
  relation_type: string;
  strength_score: number;
  concept?: { name: string };
  related?: { name: string };
}

interface Contradiction {
  id: string;
  concept_id: string;
  previous_statement: string;
  conflicting_statement: string;
  detected_at: string;
  resolution_status: string;
  concept?: { name: string; category: string };
}

interface KnowledgeSummary {
  total_concepts: number;
  by_category: Record<string, number>;
  contradictions_detected: number;
  top_relations: ConceptRelation[];
}

export function useDeepResearch() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [outputs, setOutputs] = useState<ResearchOutput[]>([]);
  const [scores, setScores] = useState<IntegrityScore[]>([]);
  const [concepts, setConcepts] = useState<ResearchConcept[]>([]);
  const [relations, setRelations] = useState<ConceptRelation[]>([]);
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [knowledgeSummary, setKnowledgeSummary] = useState<KnowledgeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const invoke = useCallback(async (body: any) => {
    const { data, error } = await supabase.functions.invoke('ai-deep-research', { body });
    if (error) throw error;
    return data;
  }, []);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await invoke({ action: 'list_projects' });
      setProjects(data.projects || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [invoke]);

  const createProject = useCallback(async (name: string, description: string) => {
    try {
      const data = await invoke({ action: 'create_project', name, description });
      toast.success('Research project created');
      await loadProjects();
      return data.project;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  }, [invoke, loadProjects]);

  const runResearch = useCallback(async (projectId: string, topic: string) => {
    setIsResearching(true);
    try {
      const data = await invoke({ action: 'run_research', project_id: projectId, topic });
      toast.success(`Research complete: ${data.files_generated} files, ${data.knowledge_graph?.concepts || 0} concepts extracted`);
      return data;
    } catch (e: any) {
      toast.error(e.message || 'Research failed');
      return null;
    } finally {
      setIsResearching(false);
    }
  }, [invoke]);

  const runSimulation = useCallback(async (projectId: string, scenario: string, parameters?: any) => {
    setIsSimulating(true);
    try {
      const data = await invoke({ action: 'run_simulation', project_id: projectId, scenario, parameters });
      toast.success('Simulation complete');
      return data;
    } catch (e: any) {
      toast.error(e.message || 'Simulation failed');
      return null;
    } finally {
      setIsSimulating(false);
    }
  }, [invoke]);

  const loadOutputs = useCallback(async (projectId: string) => {
    try {
      const data = await invoke({ action: 'get_outputs', project_id: projectId });
      setOutputs(data.outputs || []);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [invoke]);

  const loadIntegrity = useCallback(async (projectId: string) => {
    try {
      const data = await invoke({ action: 'get_integrity', project_id: projectId });
      setScores(data.scores || []);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [invoke]);

  const loadConcepts = useCallback(async (projectId: string) => {
    try {
      const data = await invoke({ action: 'get_concepts', project_id: projectId });
      setConcepts(data.concepts || []);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [invoke]);

  const loadRelations = useCallback(async (projectId: string) => {
    try {
      const data = await invoke({ action: 'get_relations', project_id: projectId });
      setRelations(data.relations || []);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [invoke]);

  const loadContradictions = useCallback(async (projectId: string) => {
    try {
      const data = await invoke({ action: 'get_contradictions', project_id: projectId });
      setContradictions(data.contradictions || []);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [invoke]);

  const loadKnowledgeSummary = useCallback(async (projectId: string) => {
    try {
      const data = await invoke({ action: 'get_knowledge_summary', project_id: projectId });
      setKnowledgeSummary(data);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [invoke]);

  return {
    projects, outputs, scores, concepts, relations, contradictions, knowledgeSummary,
    isLoading, isResearching, isSimulating,
    loadProjects, createProject, runResearch, runSimulation,
    loadOutputs, loadIntegrity, loadConcepts, loadRelations, loadContradictions, loadKnowledgeSummary,
  };
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_command_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          detected_intent: string | null
          dispatch_result: Json | null
          dispatch_status: string | null
          dispatched_at: string | null
          error_message: string | null
          id: string
          raw_text: string
          sender_id: string | null
          source_message_id: string | null
          target_agent: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          detected_intent?: string | null
          dispatch_result?: Json | null
          dispatch_status?: string | null
          dispatched_at?: string | null
          error_message?: string | null
          id?: string
          raw_text: string
          sender_id?: string | null
          source_message_id?: string | null
          target_agent?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          detected_intent?: string | null
          dispatch_result?: Json | null
          dispatch_status?: string | null
          dispatched_at?: string | null
          error_message?: string | null
          id?: string
          raw_text?: string
          sender_id?: string | null
          source_message_id?: string | null
          target_agent?: string | null
        }
        Relationships: []
      }
      agent_health_checks: {
        Row: {
          agent_function: string
          avg_duration_ms: number | null
          check_type: string
          checked_at: string | null
          created_at: string | null
          error_count_1h: number | null
          error_count_24h: number | null
          id: string
          last_error: string | null
          last_failure_at: string | null
          last_success_at: string | null
          metadata: Json | null
          response_time_ms: number | null
          status: string
          token_usage_24h: number | null
        }
        Insert: {
          agent_function: string
          avg_duration_ms?: number | null
          check_type?: string
          checked_at?: string | null
          created_at?: string | null
          error_count_1h?: number | null
          error_count_24h?: number | null
          id?: string
          last_error?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          response_time_ms?: number | null
          status?: string
          token_usage_24h?: number | null
        }
        Update: {
          agent_function?: string
          avg_duration_ms?: number | null
          check_type?: string
          checked_at?: string | null
          created_at?: string | null
          error_count_1h?: number | null
          error_count_24h?: number | null
          id?: string
          last_error?: string | null
          last_failure_at?: string | null
          last_success_at?: string | null
          metadata?: Json | null
          response_time_ms?: number | null
          status?: string
          token_usage_24h?: number | null
        }
        Relationships: []
      }
      agent_memory: {
        Row: {
          agent_function: string
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          importance: number | null
          last_recalled_at: string | null
          memory_type: string
          recalled_count: number | null
          reference_id: string | null
          tags: string[] | null
        }
        Insert: {
          agent_function: string
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          last_recalled_at?: string | null
          memory_type: string
          recalled_count?: number | null
          reference_id?: string | null
          tags?: string[] | null
        }
        Update: {
          agent_function?: string
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          last_recalled_at?: string | null
          memory_type?: string
          recalled_count?: number | null
          reference_id?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
      agent_performance_metrics: {
        Row: {
          agent_function: string
          avg_duration_ms: number | null
          consecutive_failures: number | null
          created_at: string
          failures_1h: number | null
          failures_24h: number | null
          id: string
          lifecycle_state: string | null
          measured_at: string
          success_rate: number | null
          tasks_completed: number | null
          time_since_last_success_minutes: number | null
        }
        Insert: {
          agent_function: string
          avg_duration_ms?: number | null
          consecutive_failures?: number | null
          created_at?: string
          failures_1h?: number | null
          failures_24h?: number | null
          id?: string
          lifecycle_state?: string | null
          measured_at?: string
          success_rate?: number | null
          tasks_completed?: number | null
          time_since_last_success_minutes?: number | null
        }
        Update: {
          agent_function?: string
          avg_duration_ms?: number | null
          consecutive_failures?: number | null
          created_at?: string
          failures_1h?: number | null
          failures_24h?: number | null
          id?: string
          lifecycle_state?: string | null
          measured_at?: string
          success_rate?: number | null
          tasks_completed?: number | null
          time_since_last_success_minutes?: number | null
        }
        Relationships: []
      }
      agent_schedules: {
        Row: {
          agent_function: string
          consecutive_failures: number | null
          created_at: string | null
          fail_count: number | null
          id: string
          is_enabled: boolean
          last_duration_ms: number | null
          last_error: string | null
          last_run_at: string | null
          last_status: string | null
          max_consecutive_failures: number | null
          payload: Json | null
          run_count: number | null
          schedule_cron: string
          schedule_label: string
          updated_at: string | null
        }
        Insert: {
          agent_function: string
          consecutive_failures?: number | null
          created_at?: string | null
          fail_count?: number | null
          id?: string
          is_enabled?: boolean
          last_duration_ms?: number | null
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          max_consecutive_failures?: number | null
          payload?: Json | null
          run_count?: number | null
          schedule_cron: string
          schedule_label: string
          updated_at?: string | null
        }
        Update: {
          agent_function?: string
          consecutive_failures?: number | null
          created_at?: string | null
          fail_count?: number | null
          id?: string
          is_enabled?: boolean
          last_duration_ms?: number | null
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          max_consecutive_failures?: number | null
          payload?: Json | null
          run_count?: number | null
          schedule_cron?: string
          schedule_label?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_activity_stream: {
        Row: {
          action_type: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          duration_ms: number | null
          entity_id: string | null
          entity_type: string | null
          error_code: string | null
          id: string
          role: string | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          error_code?: string | null
          id?: string
          role?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          error_code?: string | null
          id?: string
          role?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_agent_comparisons: {
        Row: {
          agents_compared: Json
          conversation_id: string | null
          created_at: string
          details: string | null
          details_ar: string | null
          id: string
          recommendation: string | null
          recommendation_ar: string | null
          specialty: string
          winner_agent_id: string | null
        }
        Insert: {
          agents_compared: Json
          conversation_id?: string | null
          created_at?: string
          details?: string | null
          details_ar?: string | null
          id?: string
          recommendation?: string | null
          recommendation_ar?: string | null
          specialty: string
          winner_agent_id?: string | null
        }
        Update: {
          agents_compared?: Json
          conversation_id?: string | null
          created_at?: string
          details?: string | null
          details_ar?: string | null
          id?: string
          recommendation?: string | null
          recommendation_ar?: string | null
          specialty?: string
          winner_agent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_comparisons_winner_agent_id_fkey"
            columns: ["winner_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_creation_proposals: {
        Row: {
          conversation_id: string | null
          created_agent_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          expected_improvement: string | null
          expected_improvement_ar: string | null
          id: string
          mission: string
          mission_ar: string | null
          proposed_by_agent: string
          proposed_name: string
          proposed_name_ar: string | null
          required_skills: string[] | null
          risk_level: string | null
          status: string
          supervision_model: string | null
          supervisor_agent_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_agent_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          expected_improvement?: string | null
          expected_improvement_ar?: string | null
          id?: string
          mission: string
          mission_ar?: string | null
          proposed_by_agent: string
          proposed_name: string
          proposed_name_ar?: string | null
          required_skills?: string[] | null
          risk_level?: string | null
          status?: string
          supervision_model?: string | null
          supervisor_agent_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_agent_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          expected_improvement?: string | null
          expected_improvement_ar?: string | null
          id?: string
          mission?: string
          mission_ar?: string | null
          proposed_by_agent?: string
          proposed_name?: string
          proposed_name_ar?: string | null
          required_skills?: string[] | null
          risk_level?: string | null
          status?: string
          supervision_model?: string | null
          supervisor_agent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_creation_proposals_created_agent_id_fkey"
            columns: ["created_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_creation_proposals_proposed_by_agent_fkey"
            columns: ["proposed_by_agent"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_creation_proposals_supervisor_agent_id_fkey"
            columns: ["supervisor_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_lifecycle: {
        Row: {
          agent_id: string
          approved_by: string | null
          created_at: string
          event_type: string
          from_state: Json | null
          id: string
          metadata: Json | null
          reason: string | null
          reason_ar: string | null
          to_state: Json | null
        }
        Insert: {
          agent_id: string
          approved_by?: string | null
          created_at?: string
          event_type: string
          from_state?: Json | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          reason_ar?: string | null
          to_state?: Json | null
        }
        Update: {
          agent_id?: string
          approved_by?: string | null
          created_at?: string
          event_type?: string
          from_state?: Json | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          reason_ar?: string | null
          to_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_lifecycle_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_skills: {
        Row: {
          acquired_at: string
          agent_id: string
          created_at: string
          id: string
          last_used_at: string | null
          proficiency_level: number
          skill_category: string
          skill_name: string
          skill_name_ar: string | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          acquired_at?: string
          agent_id: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          proficiency_level?: number
          skill_category?: string
          skill_name: string
          skill_name_ar?: string | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          acquired_at?: string
          agent_id?: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          proficiency_level?: number
          skill_category?: string
          skill_name?: string
          skill_name_ar?: string | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_skills_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          agent_name: string
          agent_name_ar: string
          agent_role: Database["public"]["Enums"]["ai_agent_role"]
          auto_execute_level: number | null
          behavior_description: string | null
          confidence: number | null
          created_at: string
          demotions: number | null
          disabled_at: string | null
          failure_rate: number | null
          focus_areas: string[]
          id: string
          is_active: boolean
          last_analysis_at: string | null
          last_evaluation_date: string | null
          lifecycle_changed_at: string | null
          lifecycle_reason: string | null
          lifecycle_state: string
          probation_started_at: string | null
          profile_id: string | null
          rank: string
          specialty: string | null
          status: string
          success_rate: number | null
          supervisor_agent_id: string | null
          total_operations: number | null
          trust_score: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_name: string
          agent_name_ar: string
          agent_role: Database["public"]["Enums"]["ai_agent_role"]
          auto_execute_level?: number | null
          behavior_description?: string | null
          confidence?: number | null
          created_at?: string
          demotions?: number | null
          disabled_at?: string | null
          failure_rate?: number | null
          focus_areas?: string[]
          id?: string
          is_active?: boolean
          last_analysis_at?: string | null
          last_evaluation_date?: string | null
          lifecycle_changed_at?: string | null
          lifecycle_reason?: string | null
          lifecycle_state?: string
          probation_started_at?: string | null
          profile_id?: string | null
          rank?: string
          specialty?: string | null
          status?: string
          success_rate?: number | null
          supervisor_agent_id?: string | null
          total_operations?: number | null
          trust_score?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_name?: string
          agent_name_ar?: string
          agent_role?: Database["public"]["Enums"]["ai_agent_role"]
          auto_execute_level?: number | null
          behavior_description?: string | null
          confidence?: number | null
          created_at?: string
          demotions?: number | null
          disabled_at?: string | null
          failure_rate?: number | null
          focus_areas?: string[]
          id?: string
          is_active?: boolean
          last_analysis_at?: string | null
          last_evaluation_date?: string | null
          lifecycle_changed_at?: string | null
          lifecycle_reason?: string | null
          lifecycle_state?: string
          probation_started_at?: string | null
          profile_id?: string | null
          rank?: string
          specialty?: string | null
          status?: string
          success_rate?: number | null
          supervisor_agent_id?: string | null
          total_operations?: number | null
          trust_score?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders_with_profiles"
            referencedColumns: ["creator_profile_id"]
          },
          {
            foreignKeyName: "ai_agents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders_with_profiles"
            referencedColumns: ["executor_profile_id"]
          },
          {
            foreignKeyName: "ai_agents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_supervisor_agent_id_fkey"
            columns: ["supervisor_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analysis_logs: {
        Row: {
          affected_area: string | null
          agent_id: string
          analysis_type: string
          created_at: string
          description: string
          description_ar: string | null
          id: string
          metadata: Json | null
          severity: string
          status: string
          suggested_fix: string | null
          technical_reason: string | null
          title: string
          title_ar: string | null
        }
        Insert: {
          affected_area?: string | null
          agent_id: string
          analysis_type: string
          created_at?: string
          description: string
          description_ar?: string | null
          id?: string
          metadata?: Json | null
          severity?: string
          status?: string
          suggested_fix?: string | null
          technical_reason?: string | null
          title: string
          title_ar?: string | null
        }
        Update: {
          affected_area?: string | null
          agent_id?: string
          analysis_type?: string
          created_at?: string
          description?: string
          description_ar?: string | null
          id?: string
          metadata?: Json | null
          severity?: string
          status?: string
          suggested_fix?: string | null
          technical_reason?: string | null
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_build_projects: {
        Row: {
          api_docs: Json | null
          architecture: Json | null
          backend_services: Json | null
          clarification_answers: Json | null
          clarification_questions: Json | null
          conversation_id: string
          created_at: string
          current_phase: string
          db_schemas: Json | null
          description: string
          description_ar: string | null
          duration_ms: number | null
          env_variables: Json | null
          error_message: string | null
          execution_request_id: string | null
          frontend_components: Json | null
          id: string
          infra_config: Json | null
          model_used: string | null
          phase_progress: Json | null
          requested_by: string
          risk_level: string
          run_instructions: string | null
          simulation_id: string | null
          simulation_verdict: string | null
          stack_choices: Json | null
          status: string
          title: string
          title_ar: string | null
          total_tokens_used: number | null
          updated_at: string
        }
        Insert: {
          api_docs?: Json | null
          architecture?: Json | null
          backend_services?: Json | null
          clarification_answers?: Json | null
          clarification_questions?: Json | null
          conversation_id: string
          created_at?: string
          current_phase?: string
          db_schemas?: Json | null
          description: string
          description_ar?: string | null
          duration_ms?: number | null
          env_variables?: Json | null
          error_message?: string | null
          execution_request_id?: string | null
          frontend_components?: Json | null
          id?: string
          infra_config?: Json | null
          model_used?: string | null
          phase_progress?: Json | null
          requested_by: string
          risk_level?: string
          run_instructions?: string | null
          simulation_id?: string | null
          simulation_verdict?: string | null
          stack_choices?: Json | null
          status?: string
          title: string
          title_ar?: string | null
          total_tokens_used?: number | null
          updated_at?: string
        }
        Update: {
          api_docs?: Json | null
          architecture?: Json | null
          backend_services?: Json | null
          clarification_answers?: Json | null
          clarification_questions?: Json | null
          conversation_id?: string
          created_at?: string
          current_phase?: string
          db_schemas?: Json | null
          description?: string
          description_ar?: string | null
          duration_ms?: number | null
          env_variables?: Json | null
          error_message?: string | null
          execution_request_id?: string | null
          frontend_components?: Json | null
          id?: string
          infra_config?: Json | null
          model_used?: string | null
          phase_progress?: Json | null
          requested_by?: string
          risk_level?: string
          run_instructions?: string | null
          simulation_id?: string | null
          simulation_verdict?: string | null
          stack_choices?: Json | null
          status?: string
          title?: string
          title_ar?: string | null
          total_tokens_used?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_build_projects_execution_request_id_fkey"
            columns: ["execution_request_id"]
            isOneToOne: false
            referencedRelation: "ai_execution_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_build_projects_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "ai_shadow_simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_capability_metrics: {
        Row: {
          active_agents: number
          avg_confidence: number | null
          created_at: string
          escalations: number | null
          forecasts_accurate: number | null
          forecasts_generated: number | null
          id: string
          improvement_rate: number | null
          metadata: Json | null
          metric_date: string
          proposals_approved: number | null
          proposals_rejected: number | null
          skills_coverage: number | null
          solved_without_human: number | null
          total_agents: number
        }
        Insert: {
          active_agents?: number
          avg_confidence?: number | null
          created_at?: string
          escalations?: number | null
          forecasts_accurate?: number | null
          forecasts_generated?: number | null
          id?: string
          improvement_rate?: number | null
          metadata?: Json | null
          metric_date?: string
          proposals_approved?: number | null
          proposals_rejected?: number | null
          skills_coverage?: number | null
          solved_without_human?: number | null
          total_agents?: number
        }
        Update: {
          active_agents?: number
          avg_confidence?: number | null
          created_at?: string
          escalations?: number | null
          forecasts_accurate?: number | null
          forecasts_generated?: number | null
          id?: string
          improvement_rate?: number | null
          metadata?: Json | null
          metric_date?: string
          proposals_approved?: number | null
          proposals_rejected?: number | null
          skills_coverage?: number | null
          solved_without_human?: number | null
          total_agents?: number
        }
        Relationships: []
      }
      ai_chat_room: {
        Row: {
          agent_id: string
          ai_session_id: string | null
          content: string
          content_ar: string | null
          created_at: string
          human_sender_id: string | null
          id: string
          is_proposal: boolean | null
          is_summary: boolean | null
          message_category: string | null
          message_type: string
          metadata: Json | null
          previous_context: string | null
          reply_to_id: string | null
          session_id: string | null
          turn_order: number | null
        }
        Insert: {
          agent_id: string
          ai_session_id?: string | null
          content: string
          content_ar?: string | null
          created_at?: string
          human_sender_id?: string | null
          id?: string
          is_proposal?: boolean | null
          is_summary?: boolean | null
          message_category?: string | null
          message_type?: string
          metadata?: Json | null
          previous_context?: string | null
          reply_to_id?: string | null
          session_id?: string | null
          turn_order?: number | null
        }
        Update: {
          agent_id?: string
          ai_session_id?: string | null
          content?: string
          content_ar?: string | null
          created_at?: string
          human_sender_id?: string | null
          id?: string
          is_proposal?: boolean | null
          is_summary?: boolean | null
          message_category?: string | null
          message_type?: string
          metadata?: Json | null
          previous_context?: string | null
          reply_to_id?: string | null
          session_id?: string | null
          turn_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_room_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_room_ai_session_id_fkey"
            columns: ["ai_session_id"]
            isOneToOne: false
            referencedRelation: "ai_discussion_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_room_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_room"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_room_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "ai_control_room_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_ci_reports: {
        Row: {
          branch: string
          build_status: string
          created_at: string
          id: string
          lint_status: string
          pr_number: number
          raw_logs: Json | null
          report_id: string | null
          repository: string | null
          risk_level: string
          test_status: string
        }
        Insert: {
          branch: string
          build_status?: string
          created_at?: string
          id?: string
          lint_status?: string
          pr_number: number
          raw_logs?: Json | null
          report_id?: string | null
          repository?: string | null
          risk_level?: string
          test_status?: string
        }
        Update: {
          branch?: string
          build_status?: string
          created_at?: string
          id?: string
          lint_status?: string
          pr_number?: number
          raw_logs?: Json | null
          report_id?: string | null
          repository?: string | null
          risk_level?: string
          test_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_ci_reports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "ai_engineer_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_code_changes: {
        Row: {
          agent_function: string
          approved_at: string | null
          approved_by: string | null
          branch_name: string
          closed_at: string | null
          confidence_score: number | null
          created_at: string
          diff_summary: string | null
          diff_summary_ar: string | null
          error_message: string | null
          files_changed: Json
          id: string
          merged_at: string | null
          metadata: Json | null
          pr_body: string | null
          pr_number: number | null
          pr_title: string
          pr_url: string | null
          risk_level: string
          source_command: string | null
          source_request_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_function?: string
          approved_at?: string | null
          approved_by?: string | null
          branch_name: string
          closed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          diff_summary?: string | null
          diff_summary_ar?: string | null
          error_message?: string | null
          files_changed?: Json
          id?: string
          merged_at?: string | null
          metadata?: Json | null
          pr_body?: string | null
          pr_number?: number | null
          pr_title: string
          pr_url?: string | null
          risk_level?: string
          source_command?: string | null
          source_request_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_function?: string
          approved_at?: string | null
          approved_by?: string | null
          branch_name?: string
          closed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          diff_summary?: string | null
          diff_summary_ar?: string | null
          error_message?: string | null
          files_changed?: Json
          id?: string
          merged_at?: string | null
          metadata?: Json | null
          pr_body?: string | null
          pr_number?: number | null
          pr_title?: string
          pr_url?: string | null
          risk_level?: string
          source_command?: string | null
          source_request_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_code_changes_source_request_id_fkey"
            columns: ["source_request_id"]
            isOneToOne: false
            referencedRelation: "ai_execution_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_core_conversations: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          model: string | null
          status: string
          system_prompt: string | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          status?: string
          system_prompt?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          status?: string
          system_prompt?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_core_executions: {
        Row: {
          action_type: string
          approved_at: string | null
          approved_by: string | null
          conversation_id: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          input: Json | null
          output: Json | null
          requires_approval: boolean | null
          status: string
        }
        Insert: {
          action_type: string
          approved_at?: string | null
          approved_by?: string | null
          conversation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          requires_approval?: boolean | null
          status?: string
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          approved_by?: string | null
          conversation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          requires_approval?: boolean | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_core_executions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_core_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_core_files: {
        Row: {
          conversation_id: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_core_files_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_core_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_core_files_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_core_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_core_memory: {
        Row: {
          category: string
          content: string
          created_at: string
          embedding_id: string | null
          id: string
          importance: number | null
          key: string
          source: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          embedding_id?: string | null
          id?: string
          importance?: number | null
          key: string
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          embedding_id?: string | null
          id?: string
          importance?: number | null
          key?: string
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_core_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_core_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_core_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_discussion_sessions: {
        Row: {
          action_items: Json | null
          completed_at: string | null
          discussion_topic: string | null
          discussion_topic_ar: string | null
          findings_count: number | null
          id: string
          messages_count: number | null
          participants_count: number | null
          proposals_generated: number | null
          started_at: string
          status: string
          summary: string | null
          summary_ar: string | null
          trigger_type: string
        }
        Insert: {
          action_items?: Json | null
          completed_at?: string | null
          discussion_topic?: string | null
          discussion_topic_ar?: string | null
          findings_count?: number | null
          id?: string
          messages_count?: number | null
          participants_count?: number | null
          proposals_generated?: number | null
          started_at?: string
          status?: string
          summary?: string | null
          summary_ar?: string | null
          trigger_type?: string
        }
        Update: {
          action_items?: Json | null
          completed_at?: string | null
          discussion_topic?: string | null
          discussion_topic_ar?: string | null
          findings_count?: number | null
          id?: string
          messages_count?: number | null
          participants_count?: number | null
          proposals_generated?: number | null
          started_at?: string
          status?: string
          summary?: string | null
          summary_ar?: string | null
          trigger_type?: string
        }
        Relationships: []
      }
      ai_engineer_reports: {
        Row: {
          activities_scanned: number
          analysis_type: string
          created_at: string
          critical_issues: number
          duration_ms: number | null
          failures_scanned: number
          findings_count: number
          github_branch: string | null
          github_pr_number: number | null
          github_pr_url: string | null
          id: string
          model_used: string | null
          money_flows_scanned: number
          patches_proposed: number
          raw_analysis: Json | null
          status: string
          summary: string | null
          summary_ar: string | null
          tokens_used: number | null
        }
        Insert: {
          activities_scanned?: number
          analysis_type?: string
          created_at?: string
          critical_issues?: number
          duration_ms?: number | null
          failures_scanned?: number
          findings_count?: number
          github_branch?: string | null
          github_pr_number?: number | null
          github_pr_url?: string | null
          id?: string
          model_used?: string | null
          money_flows_scanned?: number
          patches_proposed?: number
          raw_analysis?: Json | null
          status?: string
          summary?: string | null
          summary_ar?: string | null
          tokens_used?: number | null
        }
        Update: {
          activities_scanned?: number
          analysis_type?: string
          created_at?: string
          critical_issues?: number
          duration_ms?: number | null
          failures_scanned?: number
          findings_count?: number
          github_branch?: string | null
          github_pr_number?: number | null
          github_pr_url?: string | null
          id?: string
          model_used?: string | null
          money_flows_scanned?: number
          patches_proposed?: number
          raw_analysis?: Json | null
          status?: string
          summary?: string | null
          summary_ar?: string | null
          tokens_used?: number | null
        }
        Relationships: []
      }
      ai_evaluations: {
        Row: {
          accuracy_score: number | null
          agent_id: string
          created_at: string
          evaluation_type: string
          evaluator: string
          false_positive_rate: number | null
          findings_accepted: number | null
          findings_rejected: number | null
          id: string
          insight_quality_score: number | null
          overall_score: number | null
          period_end: string
          period_start: string
          recommendations: string | null
          recommendations_ar: string | null
          reliability_score: number | null
          speed_score: number | null
          summary: string | null
          summary_ar: string | null
          tasks_completed: number | null
          tasks_failed: number | null
        }
        Insert: {
          accuracy_score?: number | null
          agent_id: string
          created_at?: string
          evaluation_type?: string
          evaluator?: string
          false_positive_rate?: number | null
          findings_accepted?: number | null
          findings_rejected?: number | null
          id?: string
          insight_quality_score?: number | null
          overall_score?: number | null
          period_end: string
          period_start: string
          recommendations?: string | null
          recommendations_ar?: string | null
          reliability_score?: number | null
          speed_score?: number | null
          summary?: string | null
          summary_ar?: string | null
          tasks_completed?: number | null
          tasks_failed?: number | null
        }
        Update: {
          accuracy_score?: number | null
          agent_id?: string
          created_at?: string
          evaluation_type?: string
          evaluator?: string
          false_positive_rate?: number | null
          findings_accepted?: number | null
          findings_rejected?: number | null
          id?: string
          insight_quality_score?: number | null
          overall_score?: number | null
          period_end?: string
          period_start?: string
          recommendations?: string | null
          recommendations_ar?: string | null
          reliability_score?: number | null
          speed_score?: number | null
          summary?: string | null
          summary_ar?: string | null
          tasks_completed?: number | null
          tasks_failed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_evaluations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_evolution_proposals: {
        Row: {
          confidence: number | null
          created_at: string
          expected_impact: string | null
          expected_impact_ar: string | null
          id: string
          metadata: Json | null
          missing_capability: string
          missing_capability_ar: string | null
          reason: string
          reason_ar: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          skills_required: string[] | null
          status: string
          suggested_agent_type: string | null
          suggested_agent_type_ar: string | null
          updated_at: string
          urgency: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          expected_impact?: string | null
          expected_impact_ar?: string | null
          id?: string
          metadata?: Json | null
          missing_capability: string
          missing_capability_ar?: string | null
          reason: string
          reason_ar?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skills_required?: string[] | null
          status?: string
          suggested_agent_type?: string | null
          suggested_agent_type_ar?: string | null
          updated_at?: string
          urgency?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          expected_impact?: string | null
          expected_impact_ar?: string | null
          id?: string
          metadata?: Json | null
          missing_capability?: string
          missing_capability_ar?: string | null
          reason?: string
          reason_ar?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skills_required?: string[] | null
          status?: string
          suggested_agent_type?: string | null
          suggested_agent_type_ar?: string | null
          updated_at?: string
          urgency?: string
        }
        Relationships: []
      }
      ai_execution_permissions: {
        Row: {
          allowed_operations: string[]
          auto_execute_threshold: number
          category: string
          cooldown_minutes: number
          created_at: string
          daily_executions_used: number
          description: string
          description_ar: string | null
          granted_by: string | null
          id: string
          is_enabled: boolean
          last_reset_at: string
          max_daily_executions: number
          max_risk_level: string
          permission_key: string
          permission_key_ar: string | null
          required_auto_execute_level: number
          requires_approval: boolean
          updated_at: string
        }
        Insert: {
          allowed_operations?: string[]
          auto_execute_threshold?: number
          category?: string
          cooldown_minutes?: number
          created_at?: string
          daily_executions_used?: number
          description: string
          description_ar?: string | null
          granted_by?: string | null
          id?: string
          is_enabled?: boolean
          last_reset_at?: string
          max_daily_executions?: number
          max_risk_level?: string
          permission_key: string
          permission_key_ar?: string | null
          required_auto_execute_level?: number
          requires_approval?: boolean
          updated_at?: string
        }
        Update: {
          allowed_operations?: string[]
          auto_execute_threshold?: number
          category?: string
          cooldown_minutes?: number
          created_at?: string
          daily_executions_used?: number
          description?: string
          description_ar?: string | null
          granted_by?: string | null
          id?: string
          is_enabled?: boolean
          last_reset_at?: string
          max_daily_executions?: number
          max_risk_level?: string
          permission_key?: string
          permission_key_ar?: string | null
          required_auto_execute_level?: number
          requires_approval?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ai_execution_requests: {
        Row: {
          affected_entities: string[] | null
          approved_at: string | null
          approved_by: string | null
          confidence_score: number
          created_at: string
          description: string
          description_ar: string | null
          estimated_impact: string | null
          estimated_impact_ar: string | null
          expires_at: string | null
          id: string
          parameters: Json
          permission_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          request_type: string
          risk_level: string
          risk_score: number
          rollback_data: Json | null
          rollback_plan: string
          rollback_plan_ar: string | null
          simulation_id: string | null
          simulation_required: boolean
          simulation_verdict: string | null
          source_forecast_id: string | null
          source_proposal_id: string | null
          status: string
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          affected_entities?: string[] | null
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number
          created_at?: string
          description: string
          description_ar?: string | null
          estimated_impact?: string | null
          estimated_impact_ar?: string | null
          expires_at?: string | null
          id?: string
          parameters?: Json
          permission_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_type: string
          risk_level?: string
          risk_score?: number
          rollback_data?: Json | null
          rollback_plan: string
          rollback_plan_ar?: string | null
          simulation_id?: string | null
          simulation_required?: boolean
          simulation_verdict?: string | null
          source_forecast_id?: string | null
          source_proposal_id?: string | null
          status?: string
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          affected_entities?: string[] | null
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number
          created_at?: string
          description?: string
          description_ar?: string | null
          estimated_impact?: string | null
          estimated_impact_ar?: string | null
          expires_at?: string | null
          id?: string
          parameters?: Json
          permission_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          request_type?: string
          risk_level?: string
          risk_score?: number
          rollback_data?: Json | null
          rollback_plan?: string
          rollback_plan_ar?: string | null
          simulation_id?: string | null
          simulation_required?: boolean
          simulation_verdict?: string | null
          source_forecast_id?: string | null
          source_proposal_id?: string | null
          status?: string
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_execution_requests_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "ai_execution_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_execution_requests_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "ai_shadow_simulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_execution_requests_source_forecast_id_fkey"
            columns: ["source_forecast_id"]
            isOneToOne: false
            referencedRelation: "ai_forecasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_execution_requests_source_proposal_id_fkey"
            columns: ["source_proposal_id"]
            isOneToOne: false
            referencedRelation: "ai_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_execution_results: {
        Row: {
          after_state: Json | null
          before_state: Json | null
          completed_at: string | null
          confidence_delta: number | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          execution_status: string
          human_feedback: string | null
          human_feedback_score: number | null
          id: string
          output: Json | null
          request_id: string
          rollback_reason: string | null
          rolled_back_at: string | null
          started_at: string
          was_rolled_back: boolean
        }
        Insert: {
          after_state?: Json | null
          before_state?: Json | null
          completed_at?: string | null
          confidence_delta?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          execution_status?: string
          human_feedback?: string | null
          human_feedback_score?: number | null
          id?: string
          output?: Json | null
          request_id: string
          rollback_reason?: string | null
          rolled_back_at?: string | null
          started_at?: string
          was_rolled_back?: boolean
        }
        Update: {
          after_state?: Json | null
          before_state?: Json | null
          completed_at?: string | null
          confidence_delta?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          execution_status?: string
          human_feedback?: string | null
          human_feedback_score?: number | null
          id?: string
          output?: Json | null
          request_id?: string
          rollback_reason?: string | null
          rolled_back_at?: string | null
          started_at?: string
          was_rolled_back?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_execution_results_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "ai_execution_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_failures: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          parameters: Json | null
          rpc_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          parameters?: Json | null
          rpc_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          parameters?: Json | null
          rpc_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_forecasts: {
        Row: {
          confidence_score: number | null
          created_at: string
          description: string
          description_ar: string | null
          forecast_type: string
          id: string
          impact_range: string | null
          impact_range_ar: string | null
          metadata: Json | null
          probability: number
          recommended_action: string | null
          recommended_action_ar: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          time_window: string | null
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          description: string
          description_ar?: string | null
          forecast_type?: string
          id?: string
          impact_range?: string | null
          impact_range_ar?: string | null
          metadata?: Json | null
          probability?: number
          recommended_action?: string | null
          recommended_action_ar?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          time_window?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          description?: string
          description_ar?: string | null
          forecast_type?: string
          id?: string
          impact_range?: string | null
          impact_range_ar?: string | null
          metadata?: Json | null
          probability?: number
          recommended_action?: string | null
          recommended_action_ar?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          time_window?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_human_sessions: {
        Row: {
          agents_order: Json | null
          asked_by: string
          completed_at: string | null
          created_at: string
          id: string
          question: string
          response_mode: string | null
          status: string
          summary: string | null
          summary_ar: string | null
        }
        Insert: {
          agents_order?: Json | null
          asked_by: string
          completed_at?: string | null
          created_at?: string
          id?: string
          question: string
          response_mode?: string | null
          status?: string
          summary?: string | null
          summary_ar?: string | null
        }
        Update: {
          agents_order?: Json | null
          asked_by?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          question?: string
          response_mode?: string | null
          status?: string
          summary?: string | null
          summary_ar?: string | null
        }
        Relationships: []
      }
      ai_money_flow: {
        Row: {
          amount: number
          created_at: string
          currency: string
          from_user: string | null
          id: string
          operation: string
          reference_id: string | null
          reference_type: string | null
          to_user: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          from_user?: string | null
          id?: string
          operation: string
          reference_id?: string | null
          reference_type?: string | null
          to_user?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          from_user?: string | null
          id?: string
          operation?: string
          reference_id?: string | null
          reference_type?: string | null
          to_user?: string | null
        }
        Relationships: []
      }
      ai_priorities: {
        Row: {
          category: string | null
          confidence_score: number | null
          created_at: string | null
          description: string | null
          description_ar: string | null
          estimated_impact: string | null
          id: string
          reference_id: string | null
          requires_approval: boolean | null
          severity: string | null
          source: string | null
          status: string | null
          title: string | null
          title_ar: string | null
        }
        Insert: {
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          estimated_impact?: string | null
          id?: string
          reference_id?: string | null
          requires_approval?: boolean | null
          severity?: string | null
          source?: string | null
          status?: string | null
          title?: string | null
          title_ar?: string | null
        }
        Update: {
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          estimated_impact?: string | null
          id?: string
          reference_id?: string | null
          requires_approval?: boolean | null
          severity?: string | null
          source?: string | null
          status?: string | null
          title?: string | null
          title_ar?: string | null
        }
        Relationships: []
      }
      ai_product_proposals: {
        Row: {
          based_on_events: number | null
          confidence_score: number | null
          created_at: string | null
          data_window: string | null
          description: string | null
          description_ar: string | null
          estimated_impact: string | null
          generated_by: string | null
          id: string
          opportunity_type: string | null
          status: string | null
          title: string | null
          title_ar: string | null
        }
        Insert: {
          based_on_events?: number | null
          confidence_score?: number | null
          created_at?: string | null
          data_window?: string | null
          description?: string | null
          description_ar?: string | null
          estimated_impact?: string | null
          generated_by?: string | null
          id?: string
          opportunity_type?: string | null
          status?: string | null
          title?: string | null
          title_ar?: string | null
        }
        Update: {
          based_on_events?: number | null
          confidence_score?: number | null
          created_at?: string | null
          data_window?: string | null
          description?: string | null
          description_ar?: string | null
          estimated_impact?: string | null
          generated_by?: string | null
          id?: string
          opportunity_type?: string | null
          status?: string | null
          title?: string | null
          title_ar?: string | null
        }
        Relationships: []
      }
      ai_promotion_requests: {
        Row: {
          agent_id: string
          conversation_id: string | null
          created_at: string
          current_rank: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          id: string
          impact_summary: string | null
          impact_summary_ar: string | null
          justification: string
          justification_ar: string | null
          requested_rank: string
          status: string
          success_rate_at_request: number | null
          total_ops_at_request: number | null
          trust_score_at_request: number | null
        }
        Insert: {
          agent_id: string
          conversation_id?: string | null
          created_at?: string
          current_rank: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          impact_summary?: string | null
          impact_summary_ar?: string | null
          justification: string
          justification_ar?: string | null
          requested_rank: string
          status?: string
          success_rate_at_request?: number | null
          total_ops_at_request?: number | null
          trust_score_at_request?: number | null
        }
        Update: {
          agent_id?: string
          conversation_id?: string | null
          created_at?: string
          current_rank?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          impact_summary?: string | null
          impact_summary_ar?: string | null
          justification?: string
          justification_ar?: string | null
          requested_rank?: string
          status?: string
          success_rate_at_request?: number | null
          total_ops_at_request?: number | null
          trust_score_at_request?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_promotion_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_promotions: {
        Row: {
          agent_id: string
          approved_by: string | null
          from_rank: string | null
          id: string
          promoted_at: string | null
          reason: string | null
          to_rank: string | null
        }
        Insert: {
          agent_id: string
          approved_by?: string | null
          from_rank?: string | null
          id?: string
          promoted_at?: string | null
          reason?: string | null
          to_rank?: string | null
        }
        Update: {
          agent_id?: string
          approved_by?: string | null
          from_rank?: string | null
          id?: string
          promoted_at?: string | null
          reason?: string | null
          to_rank?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_promotions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_proposals: {
        Row: {
          admin_notes: string | null
          affected_area: string | null
          approved_at: string | null
          approved_by: string | null
          code_snippet: string | null
          confidence_score: number | null
          created_at: string
          description: string
          description_ar: string | null
          estimated_effort: string | null
          github_pr_number: number | null
          github_pr_url: string | null
          id: string
          impact_scope: string | null
          priority: string
          proposal_type: string
          proposed_by: string | null
          rejected_at: string | null
          report_id: string | null
          risk_label: string | null
          risk_level: string | null
          rollback_plan: string | null
          session_id: string | null
          source: string | null
          status: string
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          affected_area?: string | null
          approved_at?: string | null
          approved_by?: string | null
          code_snippet?: string | null
          confidence_score?: number | null
          created_at?: string
          description: string
          description_ar?: string | null
          estimated_effort?: string | null
          github_pr_number?: number | null
          github_pr_url?: string | null
          id?: string
          impact_scope?: string | null
          priority?: string
          proposal_type?: string
          proposed_by?: string | null
          rejected_at?: string | null
          report_id?: string | null
          risk_label?: string | null
          risk_level?: string | null
          rollback_plan?: string | null
          session_id?: string | null
          source?: string | null
          status?: string
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          affected_area?: string | null
          approved_at?: string | null
          approved_by?: string | null
          code_snippet?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string
          description_ar?: string | null
          estimated_effort?: string | null
          github_pr_number?: number | null
          github_pr_url?: string | null
          id?: string
          impact_scope?: string | null
          priority?: string
          proposal_type?: string
          proposed_by?: string | null
          rejected_at?: string | null
          report_id?: string | null
          risk_label?: string | null
          risk_level?: string | null
          rollback_plan?: string | null
          session_id?: string | null
          source?: string | null
          status?: string
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_proposals_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_proposals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "ai_engineer_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_proposals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_human_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_retirement_proposals: {
        Row: {
          agent_id: string
          conversation_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          performance_summary: Json | null
          reason: string
          reason_ar: string | null
          recommendation: string
          recommendation_ar: string | null
          status: string
        }
        Insert: {
          agent_id: string
          conversation_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          performance_summary?: Json | null
          reason: string
          reason_ar?: string | null
          recommendation: string
          recommendation_ar?: string | null
          status?: string
        }
        Update: {
          agent_id?: string
          conversation_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          performance_summary?: Json | null
          reason?: string
          reason_ar?: string | null
          recommendation?: string
          recommendation_ar?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_retirement_proposals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_retirements: {
        Row: {
          agent_id: string
          id: string
          reason: string | null
          retired_at: string | null
        }
        Insert: {
          agent_id: string
          id?: string
          reason?: string | null
          retired_at?: string | null
        }
        Update: {
          agent_id?: string
          id?: string
          reason?: string | null
          retired_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_retirements_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_self_evaluations: {
        Row: {
          agent_id: string
          correct_predictions: number | null
          created_at: string
          errors_analyzed: number | null
          evaluation_period_end: string
          evaluation_period_start: string
          human_agreements: number | null
          human_overrides: number | null
          id: string
          improvement_hypotheses: Json | null
          incorrect_predictions: number | null
          operations_reviewed: number | null
          recommended_action: string | null
          strengths: string[] | null
          summary: string | null
          summary_ar: string | null
          trust_score_at_evaluation: number | null
          weaknesses: string[] | null
        }
        Insert: {
          agent_id: string
          correct_predictions?: number | null
          created_at?: string
          errors_analyzed?: number | null
          evaluation_period_end: string
          evaluation_period_start: string
          human_agreements?: number | null
          human_overrides?: number | null
          id?: string
          improvement_hypotheses?: Json | null
          incorrect_predictions?: number | null
          operations_reviewed?: number | null
          recommended_action?: string | null
          strengths?: string[] | null
          summary?: string | null
          summary_ar?: string | null
          trust_score_at_evaluation?: number | null
          weaknesses?: string[] | null
        }
        Update: {
          agent_id?: string
          correct_predictions?: number | null
          created_at?: string
          errors_analyzed?: number | null
          evaluation_period_end?: string
          evaluation_period_start?: string
          human_agreements?: number | null
          human_overrides?: number | null
          id?: string
          improvement_hypotheses?: Json | null
          incorrect_predictions?: number | null
          operations_reviewed?: number | null
          recommended_action?: string | null
          strengths?: string[] | null
          summary?: string | null
          summary_ar?: string | null
          trust_score_at_evaluation?: number | null
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_self_evaluations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_self_evolution_proposals: {
        Row: {
          conversation_id: string | null
          created_at: string
          current_state: string | null
          current_state_ar: string | null
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          decision_reason_ar: string | null
          description: string
          description_ar: string | null
          draft_at: string
          expected_impact: string | null
          expected_impact_ar: string | null
          id: string
          lifecycle_status: string
          metadata: Json | null
          proposal_type: string
          proposed_change: string
          proposed_change_ar: string | null
          proposing_agent_id: string | null
          risk_assessment: string
          risk_details: string | null
          risk_details_ar: string | null
          simulated_at: string | null
          simulation_id: string | null
          simulation_report: string | null
          simulation_verdict: string | null
          submitted_at: string | null
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          current_state?: string | null
          current_state_ar?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          decision_reason_ar?: string | null
          description: string
          description_ar?: string | null
          draft_at?: string
          expected_impact?: string | null
          expected_impact_ar?: string | null
          id?: string
          lifecycle_status?: string
          metadata?: Json | null
          proposal_type: string
          proposed_change: string
          proposed_change_ar?: string | null
          proposing_agent_id?: string | null
          risk_assessment?: string
          risk_details?: string | null
          risk_details_ar?: string | null
          simulated_at?: string | null
          simulation_id?: string | null
          simulation_report?: string | null
          simulation_verdict?: string | null
          submitted_at?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          current_state?: string | null
          current_state_ar?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          decision_reason_ar?: string | null
          description?: string
          description_ar?: string | null
          draft_at?: string
          expected_impact?: string | null
          expected_impact_ar?: string | null
          id?: string
          lifecycle_status?: string
          metadata?: Json | null
          proposal_type?: string
          proposed_change?: string
          proposed_change_ar?: string | null
          proposing_agent_id?: string | null
          risk_assessment?: string
          risk_details?: string | null
          risk_details_ar?: string | null
          simulated_at?: string | null
          simulation_id?: string | null
          simulation_report?: string | null
          simulation_verdict?: string | null
          submitted_at?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_self_evolution_proposals_proposing_agent_id_fkey"
            columns: ["proposing_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_self_evolution_proposals_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "ai_shadow_simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_shadow_simulations: {
        Row: {
          affected_systems: string[]
          completed_at: string | null
          created_at: string
          cto_report: string | null
          cto_report_ar: string | null
          duration_ms: number | null
          financial_deviation: number | null
          id: string
          logical_deviations: number | null
          metadata: Json | null
          proposal_id: string | null
          request_id: string | null
          results: Json
          risk_delta: number | null
          rollback_ready: boolean
          scenarios_failed: number
          scenarios_passed: number
          scenarios_run: number
          simulation_config: Json
          snapshot_data: Json
          snapshot_tables: string[]
          started_at: string | null
          status: string
          success_delta: number | null
          trigger_source: string
          verdict: string
        }
        Insert: {
          affected_systems?: string[]
          completed_at?: string | null
          created_at?: string
          cto_report?: string | null
          cto_report_ar?: string | null
          duration_ms?: number | null
          financial_deviation?: number | null
          id?: string
          logical_deviations?: number | null
          metadata?: Json | null
          proposal_id?: string | null
          request_id?: string | null
          results?: Json
          risk_delta?: number | null
          rollback_ready?: boolean
          scenarios_failed?: number
          scenarios_passed?: number
          scenarios_run?: number
          simulation_config?: Json
          snapshot_data?: Json
          snapshot_tables?: string[]
          started_at?: string | null
          status?: string
          success_delta?: number | null
          trigger_source?: string
          verdict?: string
        }
        Update: {
          affected_systems?: string[]
          completed_at?: string | null
          created_at?: string
          cto_report?: string | null
          cto_report_ar?: string | null
          duration_ms?: number | null
          financial_deviation?: number | null
          id?: string
          logical_deviations?: number | null
          metadata?: Json | null
          proposal_id?: string | null
          request_id?: string | null
          results?: Json
          risk_delta?: number | null
          rollback_ready?: boolean
          scenarios_failed?: number
          scenarios_passed?: number
          scenarios_run?: number
          simulation_config?: Json
          snapshot_data?: Json
          snapshot_tables?: string[]
          started_at?: string | null
          status?: string
          success_delta?: number | null
          trigger_source?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_shadow_simulations_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "ai_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_shadow_simulations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "ai_execution_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_strategic_insights: {
        Row: {
          admin_notes: string | null
          category: string
          confidence_score: number | null
          created_at: string
          description: string
          description_ar: string | null
          id: string
          impact_estimation: string | null
          impact_estimation_ar: string | null
          insight_type: string
          metadata: Json | null
          recommended_action: string | null
          recommended_action_ar: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          source_knowledge_ids: string[] | null
          status: string
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          category?: string
          confidence_score?: number | null
          created_at?: string
          description: string
          description_ar?: string | null
          id?: string
          impact_estimation?: string | null
          impact_estimation_ar?: string | null
          insight_type?: string
          metadata?: Json | null
          recommended_action?: string | null
          recommended_action_ar?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          source_knowledge_ids?: string[] | null
          status?: string
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          confidence_score?: number | null
          created_at?: string
          description?: string
          description_ar?: string | null
          id?: string
          impact_estimation?: string | null
          impact_estimation_ar?: string | null
          insight_type?: string
          metadata?: Json | null
          recommended_action?: string | null
          recommended_action_ar?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          source_knowledge_ids?: string[] | null
          status?: string
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_training_history: {
        Row: {
          accuracy_after: number | null
          accuracy_before: number | null
          agent_id: string
          completed_at: string | null
          created_at: string
          data_source: string | null
          duration_ms: number | null
          id: string
          notes: string | null
          samples_processed: number | null
          started_at: string
          status: string
          topic: string
          topic_ar: string | null
          training_type: string
        }
        Insert: {
          accuracy_after?: number | null
          accuracy_before?: number | null
          agent_id: string
          completed_at?: string | null
          created_at?: string
          data_source?: string | null
          duration_ms?: number | null
          id?: string
          notes?: string | null
          samples_processed?: number | null
          started_at?: string
          status?: string
          topic: string
          topic_ar?: string | null
          training_type?: string
        }
        Update: {
          accuracy_after?: number | null
          accuracy_before?: number | null
          agent_id?: string
          completed_at?: string | null
          created_at?: string
          data_source?: string | null
          duration_ms?: number | null
          id?: string
          notes?: string | null
          samples_processed?: number | null
          started_at?: string
          status?: string
          topic?: string
          topic_ar?: string | null
          training_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_training_history_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_training_sessions: {
        Row: {
          agent_id: string
          confidence_gain: number | null
          id: string
          sources_count: number | null
          topic: string | null
          trained_at: string | null
          weaknesses: string | null
        }
        Insert: {
          agent_id: string
          confidence_gain?: number | null
          id?: string
          sources_count?: number | null
          topic?: string | null
          trained_at?: string | null
          weaknesses?: string | null
        }
        Update: {
          agent_id?: string
          confidence_gain?: number | null
          id?: string
          sources_count?: number | null
          topic?: string | null
          trained_at?: string | null
          weaknesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_training_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_trust_changes: {
        Row: {
          agent_id: string
          created_at: string
          delta: number
          id: string
          new_score: number
          previous_score: number
          reason: string
          reason_ar: string | null
          source_id: string | null
          source_type: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          delta: number
          id?: string
          new_score: number
          previous_score: number
          reason: string
          reason_ar?: string | null
          source_id?: string | null
          source_type: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          delta?: number
          id?: string
          new_score?: number
          previous_score?: number
          reason?: string
          reason_ar?: string | null
          source_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_trust_changes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          performed_by: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          performed_by: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string
        }
        Relationships: []
      }
      authority_levels: {
        Row: {
          can_approve_executions: boolean
          can_freeze_agents: boolean
          can_modify_permissions: boolean
          can_override_governance: boolean
          can_veto: boolean
          created_at: string
          description: string | null
          description_ar: string | null
          id: string
          level_name: string
          level_name_ar: string | null
          level_rank: number
        }
        Insert: {
          can_approve_executions?: boolean
          can_freeze_agents?: boolean
          can_modify_permissions?: boolean
          can_override_governance?: boolean
          can_veto?: boolean
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          level_name: string
          level_name_ar?: string | null
          level_rank: number
        }
        Update: {
          can_approve_executions?: boolean
          can_freeze_agents?: boolean
          can_modify_permissions?: boolean
          can_override_governance?: boolean
          can_veto?: boolean
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          level_name?: string
          level_name_ar?: string | null
          level_rank?: number
        }
        Relationships: []
      }
      authority_promotion_log: {
        Row: {
          accuracy_trend: number | null
          action: string
          approved_by: string | null
          created_at: string
          decision_similarity: number | null
          from_level: number
          id: string
          override_frequency: number | null
          reason: string
          reason_ar: string | null
          reversal_rate: number | null
          to_level: number
          triggered_by: string
        }
        Insert: {
          accuracy_trend?: number | null
          action: string
          approved_by?: string | null
          created_at?: string
          decision_similarity?: number | null
          from_level: number
          id?: string
          override_frequency?: number | null
          reason: string
          reason_ar?: string | null
          reversal_rate?: number | null
          to_level: number
          triggered_by?: string
        }
        Update: {
          accuracy_trend?: number | null
          action?: string
          approved_by?: string | null
          created_at?: string
          decision_similarity?: number | null
          from_level?: number
          id?: string
          override_frequency?: number | null
          reason?: string
          reason_ar?: string | null
          reversal_rate?: number | null
          to_level?: number
          triggered_by?: string
        }
        Relationships: []
      }
      authority_tier_state: {
        Row: {
          accuracy_at_change: number | null
          created_at: string
          current_level: number
          id: string
          last_demoted_at: string | null
          last_promoted_at: string | null
          override_count_at_change: number | null
          promoted_by: string | null
          reason: string
          reason_ar: string | null
          reversal_rate_at_change: number | null
          updated_at: string
        }
        Insert: {
          accuracy_at_change?: number | null
          created_at?: string
          current_level?: number
          id?: string
          last_demoted_at?: string | null
          last_promoted_at?: string | null
          override_count_at_change?: number | null
          promoted_by?: string | null
          reason?: string
          reason_ar?: string | null
          reversal_rate_at_change?: number | null
          updated_at?: string
        }
        Update: {
          accuracy_at_change?: number | null
          created_at?: string
          current_level?: number
          id?: string
          last_demoted_at?: string | null
          last_promoted_at?: string | null
          override_count_at_change?: number | null
          promoted_by?: string | null
          reason?: string
          reason_ar?: string | null
          reversal_rate_at_change?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      autonomy_caps: {
        Row: {
          cap_key: string
          cap_key_ar: string | null
          created_at: string
          description: string
          description_ar: string | null
          id: string
          is_active: boolean
          max_auto_execute_level: number
          requires_human: string[]
          set_by: string
          updated_at: string
        }
        Insert: {
          cap_key: string
          cap_key_ar?: string | null
          created_at?: string
          description: string
          description_ar?: string | null
          id?: string
          is_active?: boolean
          max_auto_execute_level?: number
          requires_human?: string[]
          set_by?: string
          updated_at?: string
        }
        Update: {
          cap_key?: string
          cap_key_ar?: string | null
          created_at?: string
          description?: string
          description_ar?: string | null
          id?: string
          is_active?: boolean
          max_auto_execute_level?: number
          requires_human?: string[]
          set_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      ceo_behavioral_model: {
        Row: {
          confidence: number
          created_at: string
          current_value: number
          description_ar: string | null
          description_en: string | null
          dimension: string
          dimension_ar: string | null
          historical_values: Json | null
          id: string
          last_updated_at: string
          sample_count: number
        }
        Insert: {
          confidence?: number
          created_at?: string
          current_value?: number
          description_ar?: string | null
          description_en?: string | null
          dimension: string
          dimension_ar?: string | null
          historical_values?: Json | null
          id?: string
          last_updated_at?: string
          sample_count?: number
        }
        Update: {
          confidence?: number
          created_at?: string
          current_value?: number
          description_ar?: string | null
          description_en?: string | null
          dimension?: string
          dimension_ar?: string | null
          historical_values?: Json | null
          id?: string
          last_updated_at?: string
          sample_count?: number
        }
        Relationships: []
      }
      ceo_communication_profile: {
        Row: {
          confidence: number
          created_at: string
          evidence: Json | null
          id: string
          is_active: boolean
          preference_key: string
          preference_key_ar: string | null
          sample_count: number
          updated_at: string
          value: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          evidence?: Json | null
          id?: string
          is_active?: boolean
          preference_key: string
          preference_key_ar?: string | null
          sample_count?: number
          updated_at?: string
          value: string
        }
        Update: {
          confidence?: number
          created_at?: string
          evidence?: Json | null
          id?: string
          is_active?: boolean
          preference_key?: string
          preference_key_ar?: string | null
          sample_count?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      ceo_decision_history: {
        Row: {
          context_snapshot: Json | null
          created_at: string
          decision: string
          decision_reason: string | null
          emotional_signal: string | null
          id: string
          modification_notes: string | null
          predicted_probability: number | null
          prediction_was_correct: boolean | null
          request_id: string | null
          request_title: string
          request_title_ar: string | null
          request_type: string
          response_time_ms: number | null
          risk_level: string
          services_affected: string[] | null
          suggested_fix: string | null
          urgency: string
          was_modified: boolean | null
        }
        Insert: {
          context_snapshot?: Json | null
          created_at?: string
          decision: string
          decision_reason?: string | null
          emotional_signal?: string | null
          id?: string
          modification_notes?: string | null
          predicted_probability?: number | null
          prediction_was_correct?: boolean | null
          request_id?: string | null
          request_title: string
          request_title_ar?: string | null
          request_type: string
          response_time_ms?: number | null
          risk_level?: string
          services_affected?: string[] | null
          suggested_fix?: string | null
          urgency?: string
          was_modified?: boolean | null
        }
        Update: {
          context_snapshot?: Json | null
          created_at?: string
          decision?: string
          decision_reason?: string | null
          emotional_signal?: string | null
          id?: string
          modification_notes?: string | null
          predicted_probability?: number | null
          prediction_was_correct?: boolean | null
          request_id?: string | null
          request_title?: string
          request_title_ar?: string | null
          request_type?: string
          response_time_ms?: number | null
          risk_level?: string
          services_affected?: string[] | null
          suggested_fix?: string | null
          urgency?: string
          was_modified?: boolean | null
        }
        Relationships: []
      }
      ceo_decision_patterns: {
        Row: {
          conditions: Json
          confidence: number
          created_at: string
          id: string
          is_active: boolean
          last_validated_at: string | null
          pattern_description: string
          pattern_description_ar: string | null
          pattern_key: string
          pattern_type: string
          sample_count: number
          updated_at: string
        }
        Insert: {
          conditions?: Json
          confidence?: number
          created_at?: string
          id?: string
          is_active?: boolean
          last_validated_at?: string | null
          pattern_description: string
          pattern_description_ar?: string | null
          pattern_key: string
          pattern_type?: string
          sample_count?: number
          updated_at?: string
        }
        Update: {
          conditions?: Json
          confidence?: number
          created_at?: string
          id?: string
          is_active?: boolean
          last_validated_at?: string | null
          pattern_description?: string
          pattern_description_ar?: string | null
          pattern_key?: string
          pattern_type?: string
          sample_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      ceo_prediction_scores: {
        Row: {
          approval_probability: number
          created_at: string
          fast_track_eligible: boolean
          id: string
          matching_patterns: string[] | null
          predicted_decision: string
          reasoning: string
          reasoning_ar: string | null
          request_id: string
          similar_past_decisions: string[] | null
        }
        Insert: {
          approval_probability?: number
          created_at?: string
          fast_track_eligible?: boolean
          id?: string
          matching_patterns?: string[] | null
          predicted_decision: string
          reasoning: string
          reasoning_ar?: string | null
          request_id: string
          similar_past_decisions?: string[] | null
        }
        Update: {
          approval_probability?: number
          created_at?: string
          fast_track_eligible?: boolean
          id?: string
          matching_patterns?: string[] | null
          predicted_decision?: string
          reasoning?: string
          reasoning_ar?: string | null
          request_id?: string
          similar_past_decisions?: string[] | null
        }
        Relationships: []
      }
      commander_reviews: {
        Row: {
          agents_scanned: number | null
          created_at: string
          disabled_count: number | null
          duration_ms: number | null
          escalations: Json | null
          healthy_count: number | null
          id: string
          probation_count: number | null
          report_content: string | null
          report_content_ar: string | null
          review_type: string
          warning_count: number | null
          watch_count: number | null
        }
        Insert: {
          agents_scanned?: number | null
          created_at?: string
          disabled_count?: number | null
          duration_ms?: number | null
          escalations?: Json | null
          healthy_count?: number | null
          id?: string
          probation_count?: number | null
          report_content?: string | null
          report_content_ar?: string | null
          review_type?: string
          warning_count?: number | null
          watch_count?: number | null
        }
        Update: {
          agents_scanned?: number | null
          created_at?: string
          disabled_count?: number | null
          duration_ms?: number | null
          escalations?: Json | null
          healthy_count?: number | null
          id?: string
          probation_count?: number | null
          report_content?: string | null
          report_content_ar?: string | null
          review_type?: string
          warning_count?: number | null
          watch_count?: number | null
        }
        Relationships: []
      }
      contest_entries: {
        Row: {
          contest_id: string
          created_at: string
          free_vote_used: boolean | null
          id: string
          prize_won: number | null
          rank: number | null
          user_id: string
          votes_received: number
        }
        Insert: {
          contest_id: string
          created_at?: string
          free_vote_used?: boolean | null
          id?: string
          prize_won?: number | null
          rank?: number | null
          user_id: string
          votes_received?: number
        }
        Update: {
          contest_id?: string
          created_at?: string
          free_vote_used?: boolean | null
          id?: string
          prize_won?: number | null
          rank?: number | null
          user_id?: string
          votes_received?: number
        }
        Relationships: [
          {
            foreignKeyName: "contest_entries_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          contest_date: string
          created_at: string
          current_participants: number
          description: string | null
          description_ar: string | null
          end_time: string
          entry_fee: number
          id: string
          max_participants: number | null
          prize_pool: number
          start_time: string
          status: string
          title: string
          title_ar: string | null
        }
        Insert: {
          contest_date: string
          created_at?: string
          current_participants?: number
          description?: string | null
          description_ar?: string | null
          end_time: string
          entry_fee: number
          id?: string
          max_participants?: number | null
          prize_pool?: number
          start_time: string
          status?: string
          title: string
          title_ar?: string | null
        }
        Update: {
          contest_date?: string
          created_at?: string
          current_participants?: number
          description?: string | null
          description_ar?: string | null
          end_time?: string
          entry_fee?: number
          id?: string
          max_participants?: number | null
          prize_pool?: number
          start_time?: string
          status?: string
          title?: string
          title_ar?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant1_id: string
          participant2_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant1_id: string
          participant2_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant1_id?: string
          participant2_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      decision_history: {
        Row: {
          alert_severity: string | null
          alert_title: string | null
          alert_type: string | null
          conversation_id: string | null
          created_at: string
          decided_by: string
          decision: Database["public"]["Enums"]["ai_decision_type"]
          id: string
          message_id: string
          reason: string | null
          task_id: string | null
        }
        Insert: {
          alert_severity?: string | null
          alert_title?: string | null
          alert_type?: string | null
          conversation_id?: string | null
          created_at?: string
          decided_by: string
          decision: Database["public"]["Enums"]["ai_decision_type"]
          id?: string
          message_id: string
          reason?: string | null
          task_id?: string | null
        }
        Update: {
          alert_severity?: string | null
          alert_title?: string | null
          alert_type?: string | null
          conversation_id?: string | null
          created_at?: string
          decided_by?: string
          decision?: Database["public"]["Enums"]["ai_decision_type"]
          id?: string
          message_id?: string
          reason?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "execution_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          content_ar: string | null
          conversation_id: string
          created_at: string
          delivered_at: string | null
          id: string
          is_read: boolean
          message_type: string
          sender_id: string
          transfer_amount: number | null
          transfer_recipient_id: string | null
        }
        Insert: {
          content: string
          content_ar?: string | null
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_read?: boolean
          message_type?: string
          sender_id: string
          transfer_amount?: number | null
          transfer_recipient_id?: string | null
        }
        Update: {
          content?: string
          content_ar?: string | null
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_read?: boolean
          message_type?: string
          sender_id?: string
          transfer_amount?: number | null
          transfer_recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_controls: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          control_key: string
          control_key_ar: string | null
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          description: string
          description_ar: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          control_key: string
          control_key_ar?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          description: string
          description_ar?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          control_key?: string
          control_key_ar?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          description?: string
          description_ar?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      execution_tasks: {
        Row: {
          assigned_to: string | null
          category: string
          completed_at: string | null
          completion_report: string | null
          completion_report_ar: string | null
          conversation_id: string | null
          created_at: string
          created_by: string
          description: string | null
          description_ar: string | null
          id: string
          progress_notes: string | null
          severity: string | null
          source_alert_type: string | null
          source_message_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["execution_task_status"]
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          completed_at?: string | null
          completion_report?: string | null
          completion_report_ar?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          description_ar?: string | null
          id?: string
          progress_notes?: string | null
          severity?: string | null
          source_alert_type?: string | null
          source_message_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["execution_task_status"]
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          completed_at?: string | null
          completion_report?: string | null
          completion_report_ar?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          progress_notes?: string | null
          severity?: string | null
          source_alert_type?: string | null
          source_message_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["execution_task_status"]
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      executive_understanding_reports: {
        Row: {
          agent_function: string
          confidence_score: number | null
          created_at: string
          duration_ms: number | null
          executive_summary: string
          executive_summary_ar: string | null
          future_decision_impact: string
          id: string
          is_valid: boolean
          owner_model_changes: string
          patterns_discovered: string
          risk_delta: string
          run_id: string
          trigger_type: string
          validation_errors: string[] | null
        }
        Insert: {
          agent_function: string
          confidence_score?: number | null
          created_at?: string
          duration_ms?: number | null
          executive_summary: string
          executive_summary_ar?: string | null
          future_decision_impact?: string
          id?: string
          is_valid?: boolean
          owner_model_changes?: string
          patterns_discovered?: string
          risk_delta?: string
          run_id: string
          trigger_type?: string
          validation_errors?: string[] | null
        }
        Update: {
          agent_function?: string
          confidence_score?: number | null
          created_at?: string
          duration_ms?: number | null
          executive_summary?: string
          executive_summary_ar?: string | null
          future_decision_impact?: string
          id?: string
          is_valid?: boolean
          owner_model_changes?: string
          patterns_discovered?: string
          risk_delta?: string
          run_id?: string
          trigger_type?: string
          validation_errors?: string[] | null
        }
        Relationships: []
      }
      external_access_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          conversation_id: string
          created_at: string
          credential_id: string | null
          duration_minutes: number
          expires_at: string | null
          id: string
          metadata: Json | null
          reason: string
          reason_ar: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_by_agent: string | null
          risk_level: string
          scopes: string[]
          service_name: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          conversation_id: string
          created_at?: string
          credential_id?: string | null
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          reason: string
          reason_ar?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_by_agent?: string | null
          risk_level?: string
          scopes?: string[]
          service_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          conversation_id?: string
          created_at?: string
          credential_id?: string | null
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string
          reason_ar?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_by_agent?: string | null
          risk_level?: string
          scopes?: string[]
          service_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_access_request_credential"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "external_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      external_access_usage_log: {
        Row: {
          action: string
          agent_id: string | null
          credential_id: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          request_id: string | null
          result: string
          scopes_used: string[] | null
          service_name: string
          used_at: string
        }
        Insert: {
          action: string
          agent_id?: string | null
          credential_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          request_id?: string | null
          result?: string
          scopes_used?: string[] | null
          service_name: string
          used_at?: string
        }
        Update: {
          action?: string
          agent_id?: string | null
          credential_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          request_id?: string | null
          result?: string
          scopes_used?: string[] | null
          service_name?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_access_usage_log_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "external_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_access_usage_log_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "external_access_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      external_credentials: {
        Row: {
          created_at: string
          encrypted_reference: string
          expires_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          rate_limit_per_minute: number | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          scopes: string[]
          service_name: string
          updated_at: string
          uses_count: number
        }
        Insert: {
          created_at?: string
          encrypted_reference: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          rate_limit_per_minute?: number | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scopes?: string[]
          service_name: string
          updated_at?: string
          uses_count?: number
        }
        Update: {
          created_at?: string
          encrypted_reference?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          rate_limit_per_minute?: number | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scopes?: string[]
          service_name?: string
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      external_knowledge: {
        Row: {
          collected_at: string
          content: string
          content_ar: string | null
          created_at: string
          id: string
          is_processed: boolean | null
          metadata: Json | null
          relevance_score: number | null
          source_category: string
          source_name: string
          source_url: string | null
          tags: string[] | null
          title: string
          title_ar: string | null
        }
        Insert: {
          collected_at?: string
          content: string
          content_ar?: string | null
          created_at?: string
          id?: string
          is_processed?: boolean | null
          metadata?: Json | null
          relevance_score?: number | null
          source_category?: string
          source_name: string
          source_url?: string | null
          tags?: string[] | null
          title: string
          title_ar?: string | null
        }
        Update: {
          collected_at?: string
          content?: string
          content_ar?: string | null
          created_at?: string
          id?: string
          is_processed?: boolean | null
          metadata?: Json | null
          relevance_score?: number | null
          source_category?: string
          source_name?: string
          source_url?: string | null
          tags?: string[] | null
          title?: string
          title_ar?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      freeze_controls: {
        Row: {
          authority_level: string
          conversation_id: string | null
          created_at: string
          frozen_by: string
          id: string
          is_active: boolean
          reason: string
          reason_ar: string | null
          target_id: string
          target_type: string
          unfrozen_at: string | null
          unfrozen_by: string | null
          updated_at: string
        }
        Insert: {
          authority_level: string
          conversation_id?: string | null
          created_at?: string
          frozen_by: string
          id?: string
          is_active?: boolean
          reason: string
          reason_ar?: string | null
          target_id: string
          target_type: string
          unfrozen_at?: string | null
          unfrozen_by?: string | null
          updated_at?: string
        }
        Update: {
          authority_level?: string
          conversation_id?: string | null
          created_at?: string
          frozen_by?: string
          id?: string
          is_active?: boolean
          reason?: string
          reason_ar?: string | null
          target_id?: string
          target_type?: string
          unfrozen_at?: string | null
          unfrozen_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      governance_rules: {
        Row: {
          category: string
          created_at: string
          description: string
          description_ar: string | null
          enforced_by: string
          id: string
          is_active: boolean
          override_requires: string
          rule_key: string
          rule_key_ar: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          description_ar?: string | null
          enforced_by?: string
          id?: string
          is_active?: boolean
          override_requires?: string
          rule_key: string
          rule_key_ar?: string | null
          severity?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          description_ar?: string | null
          enforced_by?: string
          id?: string
          is_active?: boolean
          override_requires?: string
          rule_key?: string
          rule_key_ar?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      intelligence_metrics: {
        Row: {
          auto_approval_success_rate: number | null
          confidence_vs_correctness: number | null
          correct_predictions: number | null
          created_at: string
          id: string
          metric_date: string
          misunderstood_areas: Json | null
          prediction_accuracy: number | null
          reversal_rate: number | null
          successful_auto_actions: number | null
          top_mistakes: Json | null
          total_auto_actions: number | null
          total_escalations: number | null
          total_ignored: number | null
          total_predictions: number | null
          total_reversals: number | null
        }
        Insert: {
          auto_approval_success_rate?: number | null
          confidence_vs_correctness?: number | null
          correct_predictions?: number | null
          created_at?: string
          id?: string
          metric_date?: string
          misunderstood_areas?: Json | null
          prediction_accuracy?: number | null
          reversal_rate?: number | null
          successful_auto_actions?: number | null
          top_mistakes?: Json | null
          total_auto_actions?: number | null
          total_escalations?: number | null
          total_ignored?: number | null
          total_predictions?: number | null
          total_reversals?: number | null
        }
        Update: {
          auto_approval_success_rate?: number | null
          confidence_vs_correctness?: number | null
          correct_predictions?: number | null
          created_at?: string
          id?: string
          metric_date?: string
          misunderstood_areas?: Json | null
          prediction_accuracy?: number | null
          reversal_rate?: number | null
          successful_auto_actions?: number | null
          top_mistakes?: Json | null
          total_auto_actions?: number | null
          total_escalations?: number | null
          total_ignored?: number | null
          total_predictions?: number | null
          total_reversals?: number | null
        }
        Relationships: []
      }
      knowledge_decisions: {
        Row: {
          created_at: string | null
          decided_by: string | null
          decision: string | null
          id: string
          notes: string | null
          proposal_id: string | null
        }
        Insert: {
          created_at?: string | null
          decided_by?: string | null
          decision?: string | null
          id?: string
          notes?: string | null
          proposal_id?: string | null
        }
        Update: {
          created_at?: string | null
          decided_by?: string | null
          decision?: string | null
          id?: string
          notes?: string | null
          proposal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_decisions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "ai_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_memory: {
        Row: {
          area: string | null
          created_at: string | null
          event_type: string | null
          id: string
          payload: Json | null
          reference_id: string | null
          source: string | null
        }
        Insert: {
          area?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          reference_id?: string | null
          source?: string | null
        }
        Update: {
          area?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          reference_id?: string | null
          source?: string | null
        }
        Relationships: []
      }
      knowledge_patterns: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          pattern_type: string | null
          problem: string | null
          solution: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          pattern_type?: string | null
          problem?: string | null
          solution?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          pattern_type?: string | null
          problem?: string | null
          solution?: string | null
        }
        Relationships: []
      }
      knowledge_rules: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          description: string | null
          description_ar: string | null
          generated_from_events: string[] | null
          id: string
          is_active: boolean | null
          pattern_type: string | null
          rule_key: string | null
          sample_count: number | null
          status: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          generated_from_events?: string[] | null
          id?: string
          is_active?: boolean | null
          pattern_type?: string | null
          rule_key?: string | null
          sample_count?: number | null
          status?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          generated_from_events?: string[] | null
          id?: string
          is_active?: boolean | null
          pattern_type?: string | null
          rule_key?: string | null
          sample_count?: number | null
          status?: string | null
        }
        Relationships: []
      }
      learning_signals: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          processed: boolean | null
          signal_type: string
          source_entity: string | null
          source_id: string | null
          weight: number | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          processed?: boolean | null
          signal_type: string
          source_entity?: string | null
          source_id?: string | null
          weight?: number | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          processed?: boolean | null
          signal_type?: string
          source_entity?: string | null
          source_id?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          message_ar: string | null
          reference_id: string | null
          title: string
          title_ar: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          message_ar?: string | null
          reference_id?: string | null
          title: string
          title_ar?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          message_ar?: string | null
          reference_id?: string | null
          title?: string
          title_ar?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orchestrator_state: {
        Row: {
          auto_executions: number | null
          commands_processed: number | null
          errors_caught: number | null
          health_checks_run: number | null
          id: string
          last_heartbeat: string | null
          metadata: Json | null
          schedules_triggered: number | null
          started_at: string | null
          status: string | null
          tick_count: number | null
        }
        Insert: {
          auto_executions?: number | null
          commands_processed?: number | null
          errors_caught?: number | null
          health_checks_run?: number | null
          id?: string
          last_heartbeat?: string | null
          metadata?: Json | null
          schedules_triggered?: number | null
          started_at?: string | null
          status?: string | null
          tick_count?: number | null
        }
        Update: {
          auto_executions?: number | null
          commands_processed?: number | null
          errors_caught?: number | null
          health_checks_run?: number | null
          id?: string
          last_heartbeat?: string | null
          metadata?: Json | null
          schedules_triggered?: number | null
          started_at?: string | null
          status?: string | null
          tick_count?: number | null
        }
        Relationships: []
      }
      owner_constitution: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          rule_ar: string
          rule_en: string
          rule_key: string
          severity: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          rule_ar: string
          rule_en: string
          rule_key: string
          severity?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          rule_ar?: string
          rule_en?: string
          rule_key?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      owner_corrections: {
        Row: {
          correction: string
          correction_ar: string | null
          correction_type: string
          created_at: string
          id: string
          lesson_learned: string | null
          lesson_learned_ar: string | null
          original_output: string
          preferences_updated: string[] | null
          source_id: string | null
          source_type: string
        }
        Insert: {
          correction: string
          correction_ar?: string | null
          correction_type?: string
          created_at?: string
          id?: string
          lesson_learned?: string | null
          lesson_learned_ar?: string | null
          original_output: string
          preferences_updated?: string[] | null
          source_id?: string | null
          source_type: string
        }
        Update: {
          correction?: string
          correction_ar?: string | null
          correction_type?: string
          created_at?: string
          id?: string
          lesson_learned?: string | null
          lesson_learned_ar?: string | null
          original_output?: string
          preferences_updated?: string[] | null
          source_id?: string | null
          source_type?: string
        }
        Relationships: []
      }
      owner_preferences: {
        Row: {
          category: string
          confidence: number
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          preference_key: string
          sample_count: number
          updated_at: string
          value: Json
        }
        Insert: {
          category?: string
          confidence?: number
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          preference_key: string
          sample_count?: number
          updated_at?: string
          value?: Json
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          preference_key?: string
          sample_count?: number
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      p2p_dispute_actions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          new_status: string | null
          note: string | null
          order_id: string
          previous_status: string | null
          staff_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          note?: string | null
          order_id: string
          previous_status?: string | null
          staff_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          note?: string | null
          order_id?: string
          previous_status?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2p_dispute_actions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2p_dispute_actions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2p_dispute_actions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders_with_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_dispute_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          order_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          order_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          order_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2p_dispute_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2p_dispute_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2p_dispute_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders_with_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_messages: {
        Row: {
          content: string
          content_ar: string | null
          created_at: string
          id: string
          is_system_message: boolean
          message_type: string
          order_id: string
          sender_id: string
        }
        Insert: {
          content: string
          content_ar?: string | null
          created_at?: string
          id?: string
          is_system_message?: boolean
          message_type?: string
          order_id: string
          sender_id: string
        }
        Update: {
          content?: string
          content_ar?: string | null
          created_at?: string
          id?: string
          is_system_message?: boolean
          message_type?: string
          order_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2p_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2p_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2p_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders_with_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_orders: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          cancellation_reason: string | null
          cancelled_by: string | null
          completed_at: string | null
          country: string
          created_at: string
          creator_id: string
          exchange_rate: number
          executor_id: string | null
          expires_at: string | null
          extension_count: number | null
          id: string
          local_amount: number
          matched_at: string | null
          nova_amount: number
          order_type: Database["public"]["Enums"]["p2p_order_type"]
          payment_method_id: string | null
          status: Database["public"]["Enums"]["p2p_order_status"]
          time_limit_minutes: number
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          country: string
          created_at?: string
          creator_id: string
          exchange_rate: number
          executor_id?: string | null
          expires_at?: string | null
          extension_count?: number | null
          id?: string
          local_amount: number
          matched_at?: string | null
          nova_amount: number
          order_type: Database["public"]["Enums"]["p2p_order_type"]
          payment_method_id?: string | null
          status?: Database["public"]["Enums"]["p2p_order_status"]
          time_limit_minutes?: number
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          country?: string
          created_at?: string
          creator_id?: string
          exchange_rate?: number
          executor_id?: string | null
          expires_at?: string | null
          extension_count?: number | null
          id?: string
          local_amount?: number
          matched_at?: string | null
          nova_amount?: number
          order_type?: Database["public"]["Enums"]["p2p_order_type"]
          payment_method_id?: string | null
          status?: Database["public"]["Enums"]["p2p_order_status"]
          time_limit_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "p2p_orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rated_id: string
          rater_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rated_id: string
          rater_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rated_id?: string
          rater_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "p2p_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2p_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "p2p_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders_with_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_number: string | null
          country: string
          created_at: string
          full_name: string
          iban: string | null
          id: string
          is_default: boolean
          phone_number: string | null
          provider_name: string
          provider_name_ar: string | null
          user_id: string
        }
        Insert: {
          account_number?: string | null
          country: string
          created_at?: string
          full_name: string
          iban?: string | null
          id?: string
          is_default?: boolean
          phone_number?: string | null
          provider_name: string
          provider_name_ar?: string | null
          user_id: string
        }
        Update: {
          account_number?: string | null
          country?: string
          created_at?: string
          full_name?: string
          iban?: string | null
          id?: string
          is_default?: boolean
          phone_number?: string | null
          provider_name?: string
          provider_name_ar?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_weeks: number
          activity_percentage: number
          ai_role: string | null
          avatar_url: string | null
          city: string | null
          country: string
          created_at: string
          current_week: number
          district: string | null
          engagement_status: Database["public"]["Enums"]["engagement_status"]
          has_joined_with_nova: boolean
          id: string
          is_ai: boolean
          last_seen_at: string | null
          name: string
          rank: Database["public"]["Enums"]["user_rank"]
          referral_code: string | null
          referred_by: string | null
          spotlight_points: number
          team_activity_percentage: number
          updated_at: string
          user_id: string
          username: string
          wallet_country: string
          weekly_active: boolean
        }
        Insert: {
          active_weeks?: number
          activity_percentage?: number
          ai_role?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string
          created_at?: string
          current_week?: number
          district?: string | null
          engagement_status?: Database["public"]["Enums"]["engagement_status"]
          has_joined_with_nova?: boolean
          id?: string
          is_ai?: boolean
          last_seen_at?: string | null
          name: string
          rank?: Database["public"]["Enums"]["user_rank"]
          referral_code?: string | null
          referred_by?: string | null
          spotlight_points?: number
          team_activity_percentage?: number
          updated_at?: string
          user_id: string
          username: string
          wallet_country?: string
          weekly_active?: boolean
        }
        Update: {
          active_weeks?: number
          activity_percentage?: number
          ai_role?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string
          created_at?: string
          current_week?: number
          district?: string | null
          engagement_status?: Database["public"]["Enums"]["engagement_status"]
          has_joined_with_nova?: boolean
          id?: string
          is_ai?: boolean
          last_seen_at?: string | null
          name?: string
          rank?: Database["public"]["Enums"]["user_rank"]
          referral_code?: string | null
          referred_by?: string | null
          spotlight_points?: number
          team_activity_percentage?: number
          updated_at?: string
          user_id?: string
          username?: string
          wallet_country?: string
          weekly_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "p2p_orders_with_profiles"
            referencedColumns: ["creator_profile_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "p2p_orders_with_profiles"
            referencedColumns: ["executor_profile_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles_search"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity: {
        Row: {
          activity_type: string
          agent_id: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          id: string
          metadata: Json | null
          project_id: string
          risk_level: string | null
          title: string
          title_ar: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          agent_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          risk_level?: string | null
          title: string
          title_ar?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          agent_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          risk_level?: string | null
          title?: string
          title_ar?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_build_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_agents: {
        Row: {
          agent_id: string
          assigned_at: string
          id: string
          last_activity_at: string | null
          project_id: string
          role: string
          tasks_completed: number | null
        }
        Insert: {
          agent_id: string
          assigned_at?: string
          id?: string
          last_activity_at?: string | null
          project_id: string
          role?: string
          tasks_completed?: number | null
        }
        Update: {
          agent_id?: string
          assigned_at?: string
          id?: string
          last_activity_at?: string | null
          project_id?: string
          role?: string
          tasks_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_agents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_build_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_artifacts: {
        Row: {
          artifact_type: string
          content: string | null
          content_json: Json | null
          created_at: string
          file_size: number | null
          file_url: string | null
          generated_by: string | null
          id: string
          mime_type: string | null
          project_id: string
          title: string
          title_ar: string | null
        }
        Insert: {
          artifact_type: string
          content?: string | null
          content_json?: Json | null
          created_at?: string
          file_size?: number | null
          file_url?: string | null
          generated_by?: string | null
          id?: string
          mime_type?: string | null
          project_id: string
          title: string
          title_ar?: string | null
        }
        Update: {
          artifact_type?: string
          content?: string | null
          content_json?: Json | null
          created_at?: string
          file_size?: number | null
          file_url?: string | null
          generated_by?: string | null
          id?: string
          mime_type?: string | null
          project_id?: string
          title?: string
          title_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_artifacts_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_artifacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_build_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string | null
          id: string
          mime_type: string | null
          project_id: string
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url?: string | null
          id?: string
          mime_type?: string | null
          project_id: string
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string | null
          id?: string
          mime_type?: string | null
          project_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_build_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          agent_id: string | null
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          output_summary: string | null
          output_summary_ar: string | null
          phase_name: string
          phase_name_ar: string | null
          project_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          agent_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          output_summary?: string | null
          output_summary_ar?: string | null
          phase_name: string
          phase_name_ar?: string | null
          project_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          agent_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          output_summary?: string | null
          output_summary_ar?: string | null
          phase_name?: string
          phase_name_ar?: string | null
          project_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_build_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sandbox_executions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_for_production: boolean | null
          completed_at: string | null
          error_message: string | null
          execution_mode: string | null
          id: string
          request_id: string | null
          result: Json | null
          rows_affected: number | null
          sql_statement: string
          started_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_for_production?: boolean | null
          completed_at?: string | null
          error_message?: string | null
          execution_mode?: string | null
          id?: string
          request_id?: string | null
          result?: Json | null
          rows_affected?: number | null
          sql_statement: string
          started_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_for_production?: boolean | null
          completed_at?: string | null
          error_message?: string | null
          execution_mode?: string | null
          id?: string
          request_id?: string | null
          result?: Json | null
          rows_affected?: number | null
          sql_statement?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sandbox_executions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "ai_execution_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      spotlight_cycles: {
        Row: {
          created_at: string
          cycle_number: number
          end_date: string
          id: string
          start_date: string
          status: string
          total_days: number
          total_weeks: number
        }
        Insert: {
          created_at?: string
          cycle_number: number
          end_date: string
          id?: string
          start_date: string
          status?: string
          total_days?: number
          total_weeks?: number
        }
        Update: {
          created_at?: string
          cycle_number?: number
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          total_days?: number
          total_weeks?: number
        }
        Relationships: []
      }
      spotlight_daily_draws: {
        Row: {
          announced_at: string | null
          created_at: string
          cycle_id: string
          draw_date: string
          first_place_percentage: number | null
          first_place_prize: number | null
          first_place_user_id: string | null
          id: string
          is_announced: boolean
          second_place_percentage: number | null
          second_place_prize: number | null
          second_place_user_id: string | null
          total_pool: number
        }
        Insert: {
          announced_at?: string | null
          created_at?: string
          cycle_id: string
          draw_date: string
          first_place_percentage?: number | null
          first_place_prize?: number | null
          first_place_user_id?: string | null
          id?: string
          is_announced?: boolean
          second_place_percentage?: number | null
          second_place_prize?: number | null
          second_place_user_id?: string | null
          total_pool?: number
        }
        Update: {
          announced_at?: string | null
          created_at?: string
          cycle_id?: string
          draw_date?: string
          first_place_percentage?: number | null
          first_place_prize?: number | null
          first_place_user_id?: string | null
          id?: string
          is_announced?: boolean
          second_place_percentage?: number | null
          second_place_prize?: number | null
          second_place_user_id?: string | null
          total_pool?: number
        }
        Relationships: [
          {
            foreignKeyName: "spotlight_daily_draws_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "spotlight_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      spotlight_user_points: {
        Row: {
          created_at: string
          cycle_id: string
          daily_points: number
          id: string
          points_date: string
          source: string
          user_id: string
          week_number: number
        }
        Insert: {
          created_at?: string
          cycle_id: string
          daily_points?: number
          id?: string
          points_date: string
          source?: string
          user_id: string
          week_number: number
        }
        Update: {
          created_at?: string
          cycle_id?: string
          daily_points?: number
          id?: string
          points_date?: string
          source?: string
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "spotlight_user_points_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "spotlight_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_agent_ratings: {
        Row: {
          created_at: string
          id: string
          is_locked: boolean
          note: string | null
          order_id: string
          rater_id: string
          rating: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_locked?: boolean
          note?: string | null
          order_id: string
          rater_id: string
          rating: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_locked?: boolean
          note?: string | null
          order_id?: string
          rater_id?: string
          rating?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_agent_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_agent_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_agent_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders_with_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_internal: boolean
          sender_id: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_id: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          priority: string
          rating: number | null
          reference_id: string | null
          reference_type: string | null
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          rating?: number | null
          reference_id?: string | null
          reference_type?: string | null
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          rating?: number | null
          reference_id?: string | null
          reference_type?: string | null
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_incidents: {
        Row: {
          action_type: string
          actor_user_id: string | null
          actor_username: string | null
          category: string | null
          created_at: string
          endpoint: string | null
          error_code: string | null
          error_message: string | null
          feature: string | null
          flow: string | null
          frequency: number | null
          id: string
          is_ghost: boolean | null
          latency_ms: number | null
          metadata: Json | null
          root_cause: string | null
          screen: string | null
          severity: string
          target_user_id: string | null
          target_username: string | null
        }
        Insert: {
          action_type: string
          actor_user_id?: string | null
          actor_username?: string | null
          category?: string | null
          created_at?: string
          endpoint?: string | null
          error_code?: string | null
          error_message?: string | null
          feature?: string | null
          flow?: string | null
          frequency?: number | null
          id?: string
          is_ghost?: boolean | null
          latency_ms?: number | null
          metadata?: Json | null
          root_cause?: string | null
          screen?: string | null
          severity?: string
          target_user_id?: string | null
          target_username?: string | null
        }
        Update: {
          action_type?: string
          actor_user_id?: string | null
          actor_username?: string | null
          category?: string | null
          created_at?: string
          endpoint?: string | null
          error_code?: string | null
          error_message?: string | null
          feature?: string | null
          flow?: string | null
          frequency?: number | null
          id?: string
          is_ghost?: boolean | null
          latency_ms?: number | null
          metadata?: Json | null
          root_cause?: string | null
          screen?: string | null
          severity?: string
          target_user_id?: string | null
          target_username?: string | null
        }
        Relationships: []
      }
      team_conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "team_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_conversations: {
        Row: {
          created_at: string
          id: string
          leader_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leader_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leader_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          leader_id: string
          level: number
          member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leader_id: string
          level?: number
          member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leader_id?: string
          level?: number
          member_id?: string
        }
        Relationships: []
      }
      team_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          message_type: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "team_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          description: string | null
          description_ar: string | null
          id: string
          reference_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: Database["public"]["Enums"]["currency_type"]
          description?: string | null
          description_ar?: string | null
          id?: string
          reference_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string | null
          description_ar?: string | null
          id?: string
          reference_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veto_events: {
        Row: {
          authority_level: string
          conversation_id: string | null
          created_at: string
          id: string
          original_action: string | null
          reason: string
          reason_ar: string | null
          target_id: string
          target_type: string
          vetoed_by: string
        }
        Insert: {
          authority_level: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          original_action?: string | null
          reason: string
          reason_ar?: string | null
          target_id: string
          target_type: string
          vetoed_by: string
        }
        Update: {
          authority_level?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          original_action?: string | null
          reason?: string
          reason_ar?: string | null
          target_id?: string
          target_type?: string
          vetoed_by?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          aura_spent: number
          contest_id: string
          contestant_id: string
          created_at: string
          id: string
          voter_id: string
        }
        Insert: {
          aura_spent: number
          contest_id: string
          contestant_id: string
          created_at?: string
          id?: string
          voter_id: string
        }
        Update: {
          aura_spent?: number
          contest_id?: string
          contestant_id?: string
          created_at?: string
          id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_freeze_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          performed_by: string
          performed_by_role: string
          reason: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          performed_by: string
          performed_by_role: string
          reason?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          performed_by?: string
          performed_by_role?: string
          reason?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_freeze_logs_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_ledger: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          counterparty_id: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          description: string | null
          description_ar: string | null
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          counterparty_id?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["currency_type"]
          description?: string | null
          description_ar?: string | null
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          counterparty_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string | null
          description_ar?: string | null
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          aura_balance: number
          created_at: string
          frozen_at: string | null
          frozen_by: string | null
          frozen_reason: string | null
          id: string
          is_frozen: boolean
          locked_nova_balance: number
          nova_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          aura_balance?: number
          created_at?: string
          frozen_at?: string | null
          frozen_by?: string | null
          frozen_reason?: string | null
          id?: string
          is_frozen?: boolean
          locked_nova_balance?: number
          nova_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          aura_balance?: number
          created_at?: string
          frozen_at?: string | null
          frozen_by?: string | null
          frozen_reason?: string | null
          id?: string
          is_frozen?: boolean
          locked_nova_balance?: number
          nova_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ai_control_room_findings: {
        Row: {
          affected_area: string | null
          agent_id: string | null
          agent_name: string | null
          agent_name_ar: string | null
          agent_role: Database["public"]["Enums"]["ai_agent_role"] | null
          created_at: string | null
          description: string | null
          description_ar: string | null
          id: string | null
          message_category: string | null
          profile_id: string | null
          severity: string | null
          status: string | null
          suggested_fix: string | null
          technical_reason: string | null
          title: string | null
          title_ar: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders_with_profiles"
            referencedColumns: ["creator_profile_id"]
          },
          {
            foreignKeyName: "ai_agents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders_with_profiles"
            referencedColumns: ["executor_profile_id"]
          },
          {
            foreignKeyName: "ai_agents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analysis_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_control_room_messages: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          agent_name_ar: string | null
          agent_role: Database["public"]["Enums"]["ai_agent_role"] | null
          content: string | null
          content_ar: string | null
          created_at: string | null
          human_sender_id: string | null
          id: string | null
          is_summary: boolean | null
          message_category: string | null
          message_type: string | null
          metadata: Json | null
          profile_id: string | null
          session_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders_with_profiles"
            referencedColumns: ["creator_profile_id"]
          },
          {
            foreignKeyName: "ai_agents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "p2p_orders_with_profiles"
            referencedColumns: ["executor_profile_id"]
          },
          {
            foreignKeyName: "ai_agents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_room_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_marketplace_orders: {
        Row: {
          country: string | null
          created_at: string | null
          exchange_rate: number | null
          id: string | null
          local_amount: number | null
          nova_amount: number | null
          order_type: Database["public"]["Enums"]["p2p_order_type"] | null
          status: Database["public"]["Enums"]["p2p_order_status"] | null
          time_limit_minutes: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          exchange_rate?: number | null
          id?: string | null
          local_amount?: number | null
          nova_amount?: number | null
          order_type?: Database["public"]["Enums"]["p2p_order_type"] | null
          status?: Database["public"]["Enums"]["p2p_order_status"] | null
          time_limit_minutes?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          exchange_rate?: number | null
          id?: string | null
          local_amount?: number | null
          nova_amount?: number | null
          order_type?: Database["public"]["Enums"]["p2p_order_type"] | null
          status?: Database["public"]["Enums"]["p2p_order_status"] | null
          time_limit_minutes?: number | null
        }
        Relationships: []
      }
      p2p_orders_with_profiles: {
        Row: {
          cancellation_reason: string | null
          cancelled_by: string | null
          completed_at: string | null
          country: string | null
          created_at: string | null
          creator_avatar_url: string | null
          creator_country: string | null
          creator_id: string | null
          creator_name: string | null
          creator_profile_id: string | null
          creator_username: string | null
          exchange_rate: number | null
          executor_avatar_url: string | null
          executor_country: string | null
          executor_id: string | null
          executor_name: string | null
          executor_profile_id: string | null
          executor_username: string | null
          id: string | null
          local_amount: number | null
          nova_amount: number | null
          order_type: Database["public"]["Enums"]["p2p_order_type"] | null
          payment_method_id: string | null
          status: Database["public"]["Enums"]["p2p_order_status"] | null
          time_limit_minutes: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "p2p_orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      p2p_user_reputation: {
        Row: {
          negative_ratings: number | null
          positive_ratings: number | null
          reputation_score: number | null
          total_trades: number | null
          user_id: string | null
        }
        Relationships: []
      }
      profiles_search: {
        Row: {
          avatar_url: string | null
          country: string | null
          id: string | null
          name: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          id?: string | null
          name?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          id?: string | null
          name?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      support_staff_metrics: {
        Row: {
          cases_handled: number | null
          escalations: number | null
          fraud_flags: number | null
          negative_ratings: number | null
          positive_pct: number | null
          positive_ratings: number | null
          staff_id: string | null
          staff_name: string | null
          total_ratings: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_balance: {
        Args: {
          p_admin_id: string
          p_amount: number
          p_currency: string
          p_is_credit: boolean
          p_reason: string
          p_target_user_id: string
        }
        Returns: Json
      }
      assign_referral_auto: {
        Args: { p_city?: string; p_country: string; p_new_user_id: string }
        Returns: Json
      }
      assign_upline_auto: {
        Args: {
          p_city: string
          p_country: string
          p_district?: string
          p_new_user_id: string
          p_referral_code?: string
        }
        Returns: Json
      }
      can_access_ai_control_room: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      cast_free_vote: {
        Args: {
          p_contest_id: string
          p_contestant_id: string
          p_voter_id: string
        }
        Returns: Json
      }
      cast_vote: {
        Args: {
          p_contest_id: string
          p_contestant_id: string
          p_vote_count?: number
          p_voter_id: string
        }
        Returns: Json
      }
      emit_team_event: {
        Args: {
          p_event_type: string
          p_message: string
          p_message_ar?: string
          p_notif_title?: string
          p_notif_title_ar?: string
          p_notify?: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      execute_transfer: {
        Args: {
          p_amount: number
          p_currency?: Database["public"]["Enums"]["currency_type"]
          p_description?: string
          p_description_ar?: string
          p_recipient_id: string
          p_reference_id?: string
          p_reference_type?: string
          p_sender_id: string
        }
        Returns: Json
      }
      find_active_leader_for_assignment: {
        Args: { p_city?: string; p_country: string }
        Returns: string
      }
      generate_referral_code: { Args: never; Returns: string }
      generate_referral_code_v2: {
        Args: { p_country: string; p_username: string }
        Returns: string
      }
      get_active_cycle_info: {
        Args: never
        Returns: {
          cycle_id: string
          week_number: number
        }[]
      }
      get_cycle_progress: {
        Args: { p_cycle_id?: string }
        Returns: {
          current_day: number
          current_week: number
          cycle_id: string
          cycle_number: number
          days_remaining: number
          end_date: string
          progress_percentage: number
          start_date: string
          total_days: number
          total_weeks: number
        }[]
      }
      get_database_size_overview: {
        Args: never
        Returns: {
          largest_table: string
          largest_table_size: string
          total_db_size: string
          total_tables: number
        }[]
      }
      get_dm_conversations: {
        Args: never
        Returns: {
          conversation_id: string
          created_at: string
          last_message: string
          last_message_at: string
          partner_avatar: string
          partner_country: string
          partner_id: string
          partner_name: string
          partner_username: string
          unread_count: number
        }[]
      }
      get_index_usage_stats: {
        Args: never
        Returns: {
          idx_scan: number
          idx_tup_fetch: number
          idx_tup_read: number
          index_name: string
          index_size: string
          schema_name: string
          table_name: string
        }[]
      }
      get_my_direct_leader: { Args: { p_user_id: string }; Returns: Json }
      get_or_create_ai_conversation: {
        Args: { target_user_id: string }
        Returns: string
      }
      get_referral_stats: { Args: { p_user_id: string }; Returns: Json }
      get_slow_query_stats: {
        Args: never
        Returns: {
          calls: number
          mean_exec_time: number
          query_text: string
          rows_returned: number
          total_exec_time: number
        }[]
      }
      get_table_performance_stats: {
        Args: never
        Returns: {
          idx_scan: number
          index_size: string
          last_analyze: string
          last_autovacuum: string
          last_vacuum: string
          n_dead_tup: number
          n_live_tup: number
          row_estimate: number
          schema_name: string
          seq_scan: number
          seq_tup_read: number
          table_name: string
          table_size: string
          total_size: string
        }[]
      }
      get_team_conversations: {
        Args: { p_user_id: string }
        Returns: {
          conversation_id: string
          last_message: string
          last_message_at: string
          last_message_type: string
          leader_avatar_url: string
          leader_id: string
          leader_name: string
          leader_username: string
          member_count: number
          unread_count: number
          user_role: string
        }[]
      }
      get_team_hierarchy: {
        Args: { p_leader_id: string; p_max_depth?: number }
        Returns: {
          active_weeks: number
          avatar_url: string
          direct_count: number
          level: number
          member_id: string
          name: string
          parent_id: string
          rank: string
          username: string
          weekly_active: boolean
        }[]
      }
      get_team_level_breakdown: {
        Args: { p_max_level?: number; p_user_id: string }
        Returns: Json
      }
      get_team_ranking: { Args: { p_user_id: string }; Returns: Json }
      get_team_stats: { Args: { p_user_id: string }; Returns: Json }
      get_wallet_history: {
        Args: {
          p_currency?: string
          p_limit?: number
          p_offset?: number
          p_user_id: string
        }
        Returns: {
          amount: number
          balance_after: number
          balance_before: number
          counterparty_id: string
          counterparty_name: string
          counterparty_username: string
          created_at: string
          currency: string
          description: string
          description_ar: string
          entry_type: string
          id: string
          metadata: Json
          reference_id: string
          reference_type: string
        }[]
      }
      get_weekly_points_chart: {
        Args: { p_cycle_id: string; p_user_id: string }
        Returns: {
          day_of_week: number
          points_date: string
          total_points: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user:
        | { Args: never; Returns: boolean }
        | { Args: { check_user_id: string }; Returns: boolean }
      is_real_user: { Args: { p_user_id: string }; Returns: boolean }
      is_support_staff: { Args: { _user_id: string }; Returns: boolean }
      is_team_leader: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      is_wallet_frozen: { Args: { _user_id: string }; Returns: boolean }
      join_contest: {
        Args: { p_contest_id: string; p_entry_fee: number; p_user_id: string }
        Returns: Json
      }
      mark_messages_delivered: {
        Args: { p_conversation_id: string; p_recipient_id: string }
        Returns: number
      }
      p2p_cancel_order: {
        Args: { p_order_id: string; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      p2p_cleanup_stale_orders: { Args: never; Returns: Json }
      p2p_confirm_payment: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: Json
      }
      p2p_create_buy_order: {
        Args: {
          p_country: string
          p_creator_id: string
          p_exchange_rate: number
          p_local_amount: number
          p_nova_amount: number
          p_payment_method_id?: string
          p_time_limit_minutes?: number
        }
        Returns: Json
      }
      p2p_create_sell_order: {
        Args: {
          p_country: string
          p_creator_id: string
          p_exchange_rate: number
          p_local_amount: number
          p_nova_amount: number
          p_payment_method_id?: string
          p_time_limit_minutes?: number
        }
        Returns: Json
      }
      p2p_delete_order: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: Json
      }
      p2p_execute_order: {
        Args: {
          p_executor_id: string
          p_order_id: string
          p_payment_method_id?: string
        }
        Returns: Json
      }
      p2p_expire_order: { Args: { p_order_id: string }; Returns: Json }
      p2p_extend_time: {
        Args: { p_minutes?: number; p_order_id: string }
        Returns: Json
      }
      p2p_open_dispute: {
        Args: { p_order_id: string; p_reason: string; p_user_id: string }
        Returns: Json
      }
      p2p_release_escrow: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: Json
      }
      p2p_relist_order:
        | { Args: { p_order_id: string; p_reason?: string }; Returns: Json }
        | {
            Args: { p_order_id: string; p_reason?: string; p_user_id: string }
            Returns: Json
          }
      p2p_resolve_dispute: {
        Args: { p_order_id: string; p_resolution: string; p_staff_id: string }
        Returns: Json
      }
      p2p_submit_rating: {
        Args: {
          p_comment?: string
          p_order_id: string
          p_rated_id: string
          p_rating: number
        }
        Returns: Json
      }
      process_referral_signup: {
        Args: { p_new_user_id: string; p_referral_code: string }
        Returns: Json
      }
      record_spotlight_points: {
        Args: { p_points: number; p_source: string; p_user_id: string }
        Returns: undefined
      }
      run_load_simulation: {
        Args: { p_intensity?: string; p_transfer_count?: number }
        Returns: Json
      }
      search_messages: {
        Args: {
          p_conversation_id?: string
          p_limit?: number
          p_query: string
          p_user_id: string
        }
        Returns: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          participant_name: string
          sender_id: string
          sender_name: string
        }[]
      }
      send_ai_alert_to_admins:
        | {
            Args: {
              p_agent_id: string
              p_content: string
              p_content_ar: string
              p_metadata?: Json
            }
            Returns: undefined
          }
        | {
            Args: {
              p_action: string
              p_body: string
              p_confidence: number
              p_severity: string
              p_title: string
              p_type?: string
            }
            Returns: undefined
          }
      submit_support_agent_rating: {
        Args: { p_note?: string; p_order_id: string; p_rating: string }
        Returns: Json
      }
      support_claim_dispute: { Args: { p_order_id: string }; Returns: Json }
      support_get_dispute_case: { Args: { p_order_id: string }; Returns: Json }
      support_log_dispute_action: {
        Args: {
          p_action_type: string
          p_metadata?: Json
          p_new_status?: string
          p_note?: string
          p_order_id: string
          p_previous_status?: string
        }
        Returns: Json
      }
      team_chat_enroll_member: {
        Args: { p_leader_id: string; p_new_user_id: string }
        Returns: undefined
      }
      update_last_seen: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      ai_agent_role:
        | "user_tester"
        | "marketer_growth"
        | "leader_team"
        | "manager_stats"
        | "backend_engineer"
        | "system_architect"
        | "qa_breaker"
        | "fraud_analyst"
        | "support_agent"
        | "power_user"
        | "contest_judge"
        | "p2p_moderator"
        | "android_engineer"
        | "ios_engineer"
        | "web_engineer"
        | "challenger_ai"
        | "system_sentinel"
        | "chaos_engineer"
        | "implementation_engineer"
        | "product_owner"
        | "fintech_specialist"
        | "integrations_specialist"
        | "security_specialist"
        | "growth_analyst"
        | "backend_core_engineer"
        | "database_integrity_engineer"
        | "security_fraud_engineer"
        | "wallet_p2p_engineer"
        | "frontend_systems_engineer"
        | "admin_panel_engineer"
        | "screen_home_owner"
        | "screen_wallet_owner"
        | "screen_p2p_owner"
        | "screen_p2p_chat_owner"
        | "screen_dm_chat_owner"
        | "screen_contests_owner"
        | "screen_profile_owner"
        | "screen_team_owner"
        | "screen_admin_owner"
        | "engineering_lead"
        | "performance_analyst"
      ai_decision_type: "approve" | "defer" | "reject"
      app_role: "admin" | "moderator" | "user" | "support"
      currency_type: "nova" | "aura"
      engagement_status: "both" | "contest" | "vote" | "none"
      execution_task_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "failed"
        | "cancelled"
      ledger_entry_type:
        | "transfer_out"
        | "transfer_in"
        | "p2p_buy"
        | "p2p_sell"
        | "p2p_escrow_lock"
        | "p2p_escrow_release"
        | "contest_entry"
        | "contest_win"
        | "vote_spend"
        | "vote_receive"
        | "referral_bonus"
        | "team_earnings"
        | "admin_credit"
        | "admin_debit"
        | "conversion"
        | "genesis_credit"
      p2p_order_status:
        | "open"
        | "matched"
        | "awaiting_payment"
        | "payment_sent"
        | "completed"
        | "cancelled"
        | "disputed"
      p2p_order_type: "buy" | "sell"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "transfer"
        | "contest_entry"
        | "contest_win"
        | "vote"
        | "p2p_buy"
        | "p2p_sell"
        | "referral_bonus"
        | "team_earnings"
      user_rank: "subscriber" | "marketer" | "leader" | "manager" | "president"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_agent_role: [
        "user_tester",
        "marketer_growth",
        "leader_team",
        "manager_stats",
        "backend_engineer",
        "system_architect",
        "qa_breaker",
        "fraud_analyst",
        "support_agent",
        "power_user",
        "contest_judge",
        "p2p_moderator",
        "android_engineer",
        "ios_engineer",
        "web_engineer",
        "challenger_ai",
        "system_sentinel",
        "chaos_engineer",
        "implementation_engineer",
        "product_owner",
        "fintech_specialist",
        "integrations_specialist",
        "security_specialist",
        "growth_analyst",
        "backend_core_engineer",
        "database_integrity_engineer",
        "security_fraud_engineer",
        "wallet_p2p_engineer",
        "frontend_systems_engineer",
        "admin_panel_engineer",
        "screen_home_owner",
        "screen_wallet_owner",
        "screen_p2p_owner",
        "screen_p2p_chat_owner",
        "screen_dm_chat_owner",
        "screen_contests_owner",
        "screen_profile_owner",
        "screen_team_owner",
        "screen_admin_owner",
        "engineering_lead",
        "performance_analyst",
      ],
      ai_decision_type: ["approve", "defer", "reject"],
      app_role: ["admin", "moderator", "user", "support"],
      currency_type: ["nova", "aura"],
      engagement_status: ["both", "contest", "vote", "none"],
      execution_task_status: [
        "pending",
        "in_progress",
        "completed",
        "failed",
        "cancelled",
      ],
      ledger_entry_type: [
        "transfer_out",
        "transfer_in",
        "p2p_buy",
        "p2p_sell",
        "p2p_escrow_lock",
        "p2p_escrow_release",
        "contest_entry",
        "contest_win",
        "vote_spend",
        "vote_receive",
        "referral_bonus",
        "team_earnings",
        "admin_credit",
        "admin_debit",
        "conversion",
        "genesis_credit",
      ],
      p2p_order_status: [
        "open",
        "matched",
        "awaiting_payment",
        "payment_sent",
        "completed",
        "cancelled",
        "disputed",
      ],
      p2p_order_type: ["buy", "sell"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "transfer",
        "contest_entry",
        "contest_win",
        "vote",
        "p2p_buy",
        "p2p_sell",
        "referral_bonus",
        "team_earnings",
      ],
      user_rank: ["subscriber", "marketer", "leader", "manager", "president"],
    },
  },
} as const

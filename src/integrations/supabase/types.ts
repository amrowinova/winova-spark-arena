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
          behavior_description: string | null
          confidence: number | null
          created_at: string
          focus_areas: string[]
          id: string
          is_active: boolean
          last_analysis_at: string | null
          profile_id: string | null
          rank: string
          specialty: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_name: string
          agent_name_ar: string
          agent_role: Database["public"]["Enums"]["ai_agent_role"]
          behavior_description?: string | null
          confidence?: number | null
          created_at?: string
          focus_areas?: string[]
          id?: string
          is_active?: boolean
          last_analysis_at?: string | null
          profile_id?: string | null
          rank?: string
          specialty?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_name?: string
          agent_name_ar?: string
          agent_role?: Database["public"]["Enums"]["ai_agent_role"]
          behavior_description?: string | null
          confidence?: number | null
          created_at?: string
          focus_areas?: string[]
          id?: string
          is_active?: boolean
          last_analysis_at?: string | null
          profile_id?: string | null
          rank?: string
          specialty?: string | null
          status?: string
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
    }
    Functions: {
      admin_adjust_balance: {
        Args: {
          p_admin_id: string
          p_amount: number
          p_currency: Database["public"]["Enums"]["currency_type"]
          p_is_credit: boolean
          p_reason?: string
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
      get_my_direct_leader: { Args: { p_user_id: string }; Returns: Json }
      get_or_create_ai_conversation: {
        Args: { target_user_id: string }
        Returns: string
      }
      get_referral_stats: { Args: { p_user_id: string }; Returns: Json }
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
      is_real_user: { Args: { p_user_id: string }; Returns: boolean }
      is_support_staff: { Args: { _user_id: string }; Returns: boolean }
      is_wallet_frozen: { Args: { _user_id: string }; Returns: boolean }
      join_contest: {
        Args: { p_contest_id: string; p_entry_fee?: number; p_user_id: string }
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
      send_ai_alert_to_admins: {
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

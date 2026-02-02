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
      direct_messages: {
        Row: {
          content: string
          content_ar: string | null
          conversation_id: string
          created_at: string
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
          avatar_url: string | null
          city: string | null
          country: string
          created_at: string
          current_week: number
          engagement_status: Database["public"]["Enums"]["engagement_status"]
          has_joined_with_nova: boolean
          id: string
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
          avatar_url?: string | null
          city?: string | null
          country?: string
          created_at?: string
          current_week?: number
          engagement_status?: Database["public"]["Enums"]["engagement_status"]
          has_joined_with_nova?: boolean
          id?: string
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
          avatar_url?: string | null
          city?: string | null
          country?: string
          created_at?: string
          current_week?: number
          engagement_status?: Database["public"]["Enums"]["engagement_status"]
          has_joined_with_nova?: boolean
          id?: string
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
          p_currency: Database["public"]["Enums"]["currency_type"]
          p_description?: string
          p_description_ar?: string
          p_recipient_id: string
          p_reference_id?: string
          p_reference_type?: string
          p_sender_id: string
        }
        Returns: Json
      }
      generate_referral_code: { Args: never; Returns: string }
      generate_referral_code_v2: {
        Args: { p_country: string; p_username: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_support_staff: { Args: { _user_id: string }; Returns: boolean }
      is_wallet_frozen: { Args: { _user_id: string }; Returns: boolean }
      join_contest: {
        Args: { p_contest_id: string; p_entry_fee?: number; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "support"
      currency_type: "nova" | "aura"
      engagement_status: "both" | "contest" | "vote" | "none"
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
      app_role: ["admin", "moderator", "user", "support"],
      currency_type: ["nova", "aura"],
      engagement_status: ["both", "contest", "vote", "none"],
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

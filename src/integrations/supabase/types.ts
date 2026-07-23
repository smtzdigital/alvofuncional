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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda_events: {
        Row: {
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          lead_id: string | null
          notes: string | null
          scheduled_at: string
          series_id: string | null
          status: Database["public"]["Enums"]["agenda_event_status"]
          student_id: string | null
          title: string
          type: Database["public"]["Enums"]["agenda_event_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          lead_id?: string | null
          notes?: string | null
          scheduled_at: string
          series_id?: string | null
          status?: Database["public"]["Enums"]["agenda_event_status"]
          student_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["agenda_event_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          lead_id?: string | null
          notes?: string | null
          scheduled_at?: string
          series_id?: string | null
          status?: Database["public"]["Enums"]["agenda_event_status"]
          student_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["agenda_event_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_interessados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          accent_color: string
          app_description: string
          app_name: string
          app_short_name: string
          background_color: string
          coming_soon_enabled: boolean
          contract_template: string | null
          favicon_url: string | null
          id: boolean
          logo_icon_url: string | null
          logo_url: string | null
          primary_color: string
          primary_glow: string
          pwa_background_color: string
          pwa_icon_192_url: string | null
          pwa_icon_512_url: string | null
          pwa_theme_color: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          app_description?: string
          app_name?: string
          app_short_name?: string
          background_color?: string
          coming_soon_enabled?: boolean
          contract_template?: string | null
          favicon_url?: string | null
          id?: boolean
          logo_icon_url?: string | null
          logo_url?: string | null
          primary_color?: string
          primary_glow?: string
          pwa_background_color?: string
          pwa_icon_192_url?: string | null
          pwa_icon_512_url?: string | null
          pwa_theme_color?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          app_description?: string
          app_name?: string
          app_short_name?: string
          background_color?: string
          coming_soon_enabled?: boolean
          contract_template?: string | null
          favicon_url?: string | null
          id?: boolean
          logo_icon_url?: string | null
          logo_url?: string | null
          primary_color?: string
          primary_glow?: string
          pwa_background_color?: string
          pwa_icon_192_url?: string | null
          pwa_icon_512_url?: string | null
          pwa_theme_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendances: {
        Row: {
          attended_at: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          points_earned: number
          student_id: string
          teacher_id: string | null
        }
        Insert: {
          attended_at?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          points_earned?: number
          student_id: string
          teacher_id?: string | null
        }
        Update: {
          attended_at?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          points_earned?: number
          student_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendances_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      diets: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      equipments: {
        Row: {
          created_at: string
          id: string
          name: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          equipment_id: string | null
          gif_url: string | null
          id: string
          instructions: string | null
          muscles: string[]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment_id?: string | null
          gif_url?: string | null
          id?: string
          instructions?: string | null
          muscles?: string[]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment_id?: string | null
          gif_url?: string | null
          id?: string
          instructions?: string | null
          muscles?: string[]
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          opening_balance: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_attachments: {
        Row: {
          created_at: string
          file_url: string
          id: string
          mime: string | null
          size: number | null
          transaction_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          mime?: string | null
          size?: number | null
          transaction_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          mime?: string | null
          size?: number | null
          transaction_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_budgets: {
        Row: {
          amount_limit: number
          category_id: string
          created_at: string
          id: string
          month: string
          updated_at: string
        }
        Insert: {
          amount_limit: number
          category_id: string
          created_at?: string
          id?: string
          month: string
          updated_at?: string
        }
        Update: {
          amount_limit?: number
          category_id?: string
          created_at?: string
          id?: string
          month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          kind: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          kind: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      financial_cost_centers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          read_at: string | null
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          read_at?: string | null
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          read_at?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_notifications_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_recurring: {
        Row: {
          created_at: string
          day_rule: Json | null
          direction: string
          end_date: string | null
          frequency: string
          id: string
          interval_count: number
          is_active: boolean
          next_run_date: string
          start_date: string
          template: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_rule?: Json | null
          direction: string
          end_date?: string | null
          frequency: string
          id?: string
          interval_count?: number
          is_active?: boolean
          next_run_date: string
          start_date: string
          template: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_rule?: Json | null
          direction?: string
          end_date?: string | null
          frequency?: string
          id?: string
          interval_count?: number
          is_active?: boolean
          next_run_date?: string
          start_date?: string
          template?: Json
          updated_at?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          account_id: string | null
          attachment_url: string | null
          category_id: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          description: string
          direction: string
          due_date: string | null
          fees: number
          gross_amount: number
          id: string
          net_amount: number | null
          notes: string | null
          origin: string
          paid_at: string | null
          payment_method: string | null
          recurring_id: string | null
          source_id: string | null
          source_type: string | null
          status: string
          student_id: string | null
          supplier: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          attachment_url?: string | null
          category_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          direction: string
          due_date?: string | null
          fees?: number
          gross_amount: number
          id?: string
          net_amount?: number | null
          notes?: string | null
          origin?: string
          paid_at?: string | null
          payment_method?: string | null
          recurring_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          student_id?: string | null
          supplier?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          attachment_url?: string | null
          category_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          direction?: string
          due_date?: string | null
          fees?: number
          gross_amount?: number
          id?: string
          net_amount?: number | null
          notes?: string | null
          origin?: string
          paid_at?: string | null
          payment_method?: string | null
          recurring_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          student_id?: string | null
          supplier?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "financial_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "financial_recurring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transfers: {
        Row: {
          amount: number
          created_at: string
          date: string
          from_account_id: string
          id: string
          in_tx_id: string | null
          notes: string | null
          out_tx_id: string | null
          to_account_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          from_account_id: string
          id?: string
          in_tx_id?: string | null
          notes?: string | null
          out_tx_id?: string | null
          to_account_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          from_account_id?: string
          id?: string
          in_tx_id?: string | null
          notes?: string | null
          out_tx_id?: string | null
          to_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transfers_in_tx_id_fkey"
            columns: ["in_tx_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transfers_out_tx_id_fkey"
            columns: ["out_tx_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          completed_at: string | null
          created_at: string
          current_value: number | null
          description: string | null
          due_date: string | null
          id: string
          points_reward: number
          status: Database["public"]["Enums"]["goal_status"]
          student_id: string
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          points_reward?: number
          status?: Database["public"]["Enums"]["goal_status"]
          student_id: string
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          points_reward?: number
          status?: Database["public"]["Enums"]["goal_status"]
          student_id?: string
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_interessados: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"] | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          next_contact_at: string | null
          notes: string | null
          phone: string
          stage: Database["public"]["Enums"]["lead_stage"]
          student_id: string | null
          updated_at: string
        }
        Insert: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          next_contact_at?: string | null
          notes?: string | null
          phone: string
          stage?: Database["public"]["Enums"]["lead_stage"]
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          next_contact_at?: string | null
          notes?: string | null
          phone?: string
          stage?: Database["public"]["Enums"]["lead_stage"]
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_interessados_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          error: string | null
          id: string
          request_summary: Json | null
          response_summary: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          request_summary?: Json | null
          response_summary?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          request_summary?: Json | null
          response_summary?: Json | null
        }
        Relationships: []
      }
      payment_cards: {
        Row: {
          brand: string | null
          created_at: string
          exp_month: number | null
          exp_year: number | null
          holder_name: string | null
          id: string
          is_default: boolean
          last4: string | null
          stone_card_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          holder_name?: string | null
          id?: string
          is_default?: boolean
          last4?: string | null
          stone_card_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          holder_name?: string | null
          id?: string
          is_default?: boolean
          last4?: string | null
          stone_card_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_charges: {
        Row: {
          amount: number
          created_at: string
          failure_reason: string | null
          id: string
          metadata: Json
          method: string | null
          paid_at: string | null
          payment_link_id: string | null
          status: string
          stone_charge_id: string | null
          student_id: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          method?: string | null
          paid_at?: string | null
          payment_link_id?: string | null
          status?: string
          stone_charge_id?: string | null
          student_id: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          method?: string | null
          paid_at?: string | null
          payment_link_id?: string | null
          status?: string
          stone_charge_id?: string | null
          student_id?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_charges_payment_link_id_fkey"
            columns: ["payment_link_id"]
            isOneToOne: false
            referencedRelation: "payment_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_charges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_charges_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_config: {
        Row: {
          created_at: string
          enabled: boolean
          environment: string
          id: boolean
          link_expires_days: number
          provider: string
          public_key: string | null
          secret_key: string | null
          updated_at: string
          webhook_password: string | null
          webhook_user: string | null
          whatsapp_template: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          environment?: string
          id?: boolean
          link_expires_days?: number
          provider?: string
          public_key?: string | null
          secret_key?: string | null
          updated_at?: string
          webhook_password?: string | null
          webhook_user?: string | null
          whatsapp_template?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          environment?: string
          id?: boolean
          link_expires_days?: number
          provider?: string
          public_key?: string | null
          secret_key?: string | null
          updated_at?: string
          webhook_password?: string | null
          webhook_user?: string | null
          whatsapp_template?: string
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          amount: number
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json
          paid_at: string | null
          plan_id: string | null
          short_token: string
          status: string
          stone_payment_link_id: string | null
          student_id: string
          subscription_id: string | null
          updated_at: string
          url: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          plan_id?: string | null
          short_token: string
          status?: string
          stone_payment_link_id?: string | null
          student_id: string
          subscription_id?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          plan_id?: string | null
          short_token?: string
          status?: string
          stone_payment_link_id?: string | null
          student_id?: string
          subscription_id?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          method: Database["public"]["Enums"]["payment_method"] | null
          notes: string | null
          paid_at: string | null
          plan_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_at?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_at?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_interval: string
          billing_interval_count: number
          created_at: string
          description: string | null
          duration_days: number
          has_diet: boolean
          has_goals: boolean
          has_ranking: boolean
          has_workouts: boolean
          id: string
          installments: number
          is_active: boolean
          is_custom: boolean
          name: string
          plan_duration_months: number | null
          presential_per_week: number
          price: number
          sort_order: number
          stone_plan_id: string | null
          trial_period_days: number
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          billing_interval_count?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          has_diet?: boolean
          has_goals?: boolean
          has_ranking?: boolean
          has_workouts?: boolean
          id?: string
          installments?: number
          is_active?: boolean
          is_custom?: boolean
          name: string
          plan_duration_months?: number | null
          presential_per_week?: number
          price?: number
          sort_order?: number
          stone_plan_id?: string | null
          trial_period_days?: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          billing_interval_count?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          has_diet?: boolean
          has_goals?: boolean
          has_ranking?: boolean
          has_workouts?: boolean
          id?: string
          installments?: number
          is_active?: boolean
          is_custom?: boolean
          name?: string
          plan_duration_months?: number | null
          presential_per_week?: number
          price?: number
          sort_order?: number
          stone_plan_id?: string | null
          trial_period_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      points_history: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string
          source_id: string | null
          source_type: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          reason: string
          source_id?: string | null
          source_type?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string
          source_id?: string | null
          source_type?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"] | null
          address: string | null
          assessment_completed_at: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          document: string | null
          email: string
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          gives_up_easily: boolean | null
          goal: Database["public"]["Enums"]["fitness_goal"] | null
          goal_other: string | null
          health_conditions: string[] | null
          health_details: string | null
          height_cm: number | null
          id: string
          medications: string | null
          motivation: Database["public"]["Enums"]["motivation_type"] | null
          phone: string | null
          rg: string | null
          sleep_quality: Database["public"]["Enums"]["sleep_quality"] | null
          stress_level: Database["public"]["Enums"]["stress_level"] | null
          updated_at: string
          uses_medication: boolean | null
          weight_kg: number | null
          whatsapp: string | null
          workout_preference:
            | Database["public"]["Enums"]["workout_preference"]
            | null
        }
        Insert: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          address?: string | null
          assessment_completed_at?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          document?: string | null
          email: string
          full_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          gives_up_easily?: boolean | null
          goal?: Database["public"]["Enums"]["fitness_goal"] | null
          goal_other?: string | null
          health_conditions?: string[] | null
          health_details?: string | null
          height_cm?: number | null
          id: string
          medications?: string | null
          motivation?: Database["public"]["Enums"]["motivation_type"] | null
          phone?: string | null
          rg?: string | null
          sleep_quality?: Database["public"]["Enums"]["sleep_quality"] | null
          stress_level?: Database["public"]["Enums"]["stress_level"] | null
          updated_at?: string
          uses_medication?: boolean | null
          weight_kg?: number | null
          whatsapp?: string | null
          workout_preference?:
            | Database["public"]["Enums"]["workout_preference"]
            | null
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          address?: string | null
          assessment_completed_at?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          document?: string | null
          email?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          gives_up_easily?: boolean | null
          goal?: Database["public"]["Enums"]["fitness_goal"] | null
          goal_other?: string | null
          health_conditions?: string[] | null
          health_details?: string | null
          height_cm?: number | null
          id?: string
          medications?: string | null
          motivation?: Database["public"]["Enums"]["motivation_type"] | null
          phone?: string | null
          rg?: string | null
          sleep_quality?: Database["public"]["Enums"]["sleep_quality"] | null
          stress_level?: Database["public"]["Enums"]["stress_level"] | null
          updated_at?: string
          uses_medication?: boolean | null
          weight_kg?: number | null
          whatsapp?: string | null
          workout_preference?:
            | Database["public"]["Enums"]["workout_preference"]
            | null
        }
        Relationships: []
      }
      student_workouts: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          notes: string | null
          position: number
          student_id: string
          weekday: Database["public"]["Enums"]["weekday"] | null
          workout_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          student_id: string
          weekday?: Database["public"]["Enums"]["weekday"] | null
          workout_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          position?: number
          student_id?: string
          weekday?: Database["public"]["Enums"]["weekday"] | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          plan_expires_at: string | null
          plan_id: string | null
          plan_started_at: string | null
          stone_customer_id: string | null
          teacher_id: string | null
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          plan_expires_at?: string | null
          plan_id?: string | null
          plan_started_at?: string | null
          stone_customer_id?: string | null
          teacher_id?: string | null
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          plan_expires_at?: string | null
          plan_id?: string | null
          plan_started_at?: string | null
          stone_customer_id?: string | null
          teacher_id?: string | null
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_profile_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          cancel_reason: string | null
          canceled_at: string | null
          created_at: string
          current_card_id: string | null
          id: string
          metadata: Json
          next_billing_date: string | null
          plan_id: string | null
          status: string
          stone_subscription_id: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string
          current_card_id?: string | null
          id?: string
          metadata?: Json
          next_billing_date?: string | null
          plan_id?: string | null
          status?: string
          stone_subscription_id?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cancel_reason?: string | null
          canceled_at?: string | null
          created_at?: string
          current_card_id?: string | null
          id?: string
          metadata?: Json
          next_billing_date?: string | null
          plan_id?: string | null
          status?: string
          stone_subscription_id?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_current_card_id_fkey"
            columns: ["current_card_id"]
            isOneToOne: false
            referencedRelation: "payment_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      webhook_events: {
        Row: {
          error: string | null
          event_type: string
          external_id: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
          status: string
        }
        Insert: {
          error?: string | null
          event_type: string
          external_id: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          status?: string
        }
        Update: {
          error?: string | null
          event_type?: string
          external_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          status?: string
        }
        Relationships: []
      }
      weekly_workout_plans: {
        Row: {
          created_at: string
          gender: Database["public"]["Enums"]["workout_gender"]
          id: string
          position: number
          weekday: Database["public"]["Enums"]["weekday"]
          workout_id: string
        }
        Insert: {
          created_at?: string
          gender: Database["public"]["Enums"]["workout_gender"]
          id?: string
          position?: number
          weekday: Database["public"]["Enums"]["weekday"]
          workout_id: string
        }
        Update: {
          created_at?: string
          gender?: Database["public"]["Enums"]["workout_gender"]
          id?: string
          position?: number
          weekday?: Database["public"]["Enums"]["weekday"]
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_workout_plans_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_checkins: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          points_earned: number
          student_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          points_earned?: number
          student_id: string
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          points_earned?: number
          student_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_checkins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_checkins_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          load_suggestion: string | null
          notes: string | null
          position: number
          reps: string | null
          rest_seconds: number | null
          sets: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          load_suggestion?: string | null
          notes?: string | null
          position?: number
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          load_suggestion?: string | null
          notes?: string | null
          position?: number
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          audience: Database["public"]["Enums"]["workout_audience"]
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string | null
          duration_minutes: number | null
          gender: Database["public"]["Enums"]["workout_gender"]
          id: string
          is_published: boolean
          level: string | null
          muscle_group: string | null
          points_reward: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          audience?: Database["public"]["Enums"]["workout_audience"]
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          gender?: Database["public"]["Enums"]["workout_gender"]
          id?: string
          is_published?: boolean
          level?: string | null
          muscle_group?: string | null
          points_reward?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          audience?: Database["public"]["Enums"]["workout_audience"]
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          gender?: Database["public"]["Enums"]["workout_gender"]
          id?: string
          is_published?: boolean
          level?: string | null
          muscle_group?: string | null
          points_reward?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_finance: { Args: { _user_id: string }; Returns: boolean }
      get_ranking: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          full_name: string
          plan_name: string
          rank: number
          student_id: string
          total_points: number
        }[]
      }
      get_student_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      student_plan_active: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      activity_level: "sedentario" | "iniciante" | "intermediario" | "avancado"
      agenda_event_status: "agendado" | "concluido" | "cancelado" | "no_show"
      agenda_event_type:
        | "aula"
        | "experimental"
        | "contato"
        | "outro"
        | "grupo_funcional"
        | "individualizado"
        | "personal"
        | "funcional_kids"
        | "hiit"
        | "gap"
      app_role: "admin" | "professor" | "aluno" | "financeiro" | "recepcao"
      fitness_goal:
        | "emagrecimento"
        | "ganho_massa"
        | "condicionamento"
        | "reabilitacao"
        | "saude_geral"
        | "outro"
      gender: "masculino" | "feminino"
      goal_status: "ativa" | "concluida" | "cancelada"
      lead_stage:
        | "novo"
        | "contato"
        | "experimental"
        | "negociacao"
        | "venda"
        | "perdido"
      motivation_type: "estetica" | "saude" | "autoestima"
      payment_method: "pix" | "dinheiro" | "cartao" | "transferencia" | "outro"
      payment_status: "pendente" | "pago" | "atrasado" | "cancelado"
      sleep_quality: "boa" | "media" | "ruim"
      stress_level: "baixo" | "medio" | "alto"
      weekday: "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom"
      workout_audience: "app" | "personal"
      workout_gender: "masculino" | "feminino" | "unissex"
      workout_preference: "curto_intenso" | "longo_moderado"
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
      activity_level: ["sedentario", "iniciante", "intermediario", "avancado"],
      agenda_event_status: ["agendado", "concluido", "cancelado", "no_show"],
      agenda_event_type: [
        "aula",
        "experimental",
        "contato",
        "outro",
        "grupo_funcional",
        "individualizado",
        "personal",
        "funcional_kids",
        "hiit",
        "gap",
      ],
      app_role: ["admin", "professor", "aluno", "financeiro", "recepcao"],
      fitness_goal: [
        "emagrecimento",
        "ganho_massa",
        "condicionamento",
        "reabilitacao",
        "saude_geral",
        "outro",
      ],
      gender: ["masculino", "feminino"],
      goal_status: ["ativa", "concluida", "cancelada"],
      lead_stage: [
        "novo",
        "contato",
        "experimental",
        "negociacao",
        "venda",
        "perdido",
      ],
      motivation_type: ["estetica", "saude", "autoestima"],
      payment_method: ["pix", "dinheiro", "cartao", "transferencia", "outro"],
      payment_status: ["pendente", "pago", "atrasado", "cancelado"],
      sleep_quality: ["boa", "media", "ruim"],
      stress_level: ["baixo", "medio", "alto"],
      weekday: ["seg", "ter", "qua", "qui", "sex", "sab", "dom"],
      workout_audience: ["app", "personal"],
      workout_gender: ["masculino", "feminino", "unissex"],
      workout_preference: ["curto_intenso", "longo_moderado"],
    },
  },
} as const

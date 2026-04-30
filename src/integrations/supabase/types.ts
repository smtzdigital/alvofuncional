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
      app_settings: {
        Row: {
          accent_color: string
          app_description: string
          app_name: string
          app_short_name: string
          background_color: string
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
          created_at: string
          description: string | null
          duration_days: number
          has_diet: boolean
          has_goals: boolean
          has_ranking: boolean
          has_workouts: boolean
          id: string
          is_active: boolean
          name: string
          presential_per_week: number
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          has_diet?: boolean
          has_goals?: boolean
          has_ranking?: boolean
          has_workouts?: boolean
          id?: string
          is_active?: boolean
          name: string
          presential_per_week?: number
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          has_diet?: boolean
          has_goals?: boolean
          has_ranking?: boolean
          has_workouts?: boolean
          id?: string
          is_active?: boolean
          name?: string
          presential_per_week?: number
          price?: number
          sort_order?: number
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
          assessment_completed_at: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
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
          assessment_completed_at?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
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
          assessment_completed_at?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
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
      students: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          plan_expires_at: string | null
          plan_id: string | null
          plan_started_at: string | null
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
      workouts: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string | null
          duration_minutes: number | null
          id: string
          is_published: boolean
          points_reward: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean
          points_reward?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean
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
      app_role: "admin" | "professor" | "aluno"
      fitness_goal:
        | "emagrecimento"
        | "ganho_massa"
        | "condicionamento"
        | "reabilitacao"
        | "saude_geral"
        | "outro"
      gender: "masculino" | "feminino"
      goal_status: "ativa" | "concluida" | "cancelada"
      motivation_type: "estetica" | "saude" | "autoestima"
      payment_method: "pix" | "dinheiro" | "cartao" | "transferencia" | "outro"
      payment_status: "pendente" | "pago" | "atrasado" | "cancelado"
      sleep_quality: "boa" | "media" | "ruim"
      stress_level: "baixo" | "medio" | "alto"
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
      app_role: ["admin", "professor", "aluno"],
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
      motivation_type: ["estetica", "saude", "autoestima"],
      payment_method: ["pix", "dinheiro", "cartao", "transferencia", "outro"],
      payment_status: ["pendente", "pago", "atrasado", "cancelado"],
      sleep_quality: ["boa", "media", "ruim"],
      stress_level: ["baixo", "medio", "alto"],
      workout_preference: ["curto_intenso", "longo_moderado"],
    },
  },
} as const

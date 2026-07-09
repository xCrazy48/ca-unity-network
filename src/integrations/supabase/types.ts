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
      chapter_progress: {
        Row: {
          chapter_id: string
          confidence: number
          created_at: string
          id: string
          last_revised_at: string | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          confidence?: number
          created_at?: string
          id?: string
          last_revised_at?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          confidence?: number
          created_at?: string
          id?: string
          last_revised_at?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          id: string
          name: string
          paper_code: string
          sort_order: number
          weightage_max: number | null
          weightage_min: number | null
        }
        Insert: {
          id?: string
          name: string
          paper_code: string
          sort_order?: number
          weightage_max?: number | null
          weightage_min?: number | null
        }
        Update: {
          id?: string
          name?: string
          paper_code?: string
          sort_order?: number
          weightage_max?: number | null
          weightage_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_paper_code_fkey"
            columns: ["paper_code"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["code"]
          },
        ]
      }
      exam_config: {
        Row: {
          paper_dates: Json
          schedule_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          paper_dates?: Json
          schedule_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          paper_dates?: Json
          schedule_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      formulas: {
        Row: {
          body: string
          chapter_id: string | null
          confidence: number
          created_at: string
          id: string
          last_revised_at: string | null
          next_revision_date: string | null
          paper_code: string | null
          revision_interval_days: number
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          chapter_id?: string | null
          confidence?: number
          created_at?: string
          id?: string
          last_revised_at?: string | null
          next_revision_date?: string | null
          paper_code?: string | null
          revision_interval_days?: number
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          chapter_id?: string | null
          confidence?: number
          created_at?: string
          id?: string
          last_revised_at?: string | null
          next_revision_date?: string | null
          paper_code?: string | null
          revision_interval_days?: number
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formulas_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formulas_paper_code_fkey"
            columns: ["paper_code"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["code"]
          },
        ]
      }
      mistakes: {
        Row: {
          chapter_id: string | null
          concept: string
          correction: string | null
          created_at: string
          id: string
          mistake: string
          next_revision_date: string | null
          paper_code: string | null
          source: Database["public"]["Enums"]["mistake_source"]
          source_ref: string | null
          status: Database["public"]["Enums"]["mistake_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          concept: string
          correction?: string | null
          created_at?: string
          id?: string
          mistake: string
          next_revision_date?: string | null
          paper_code?: string | null
          source: Database["public"]["Enums"]["mistake_source"]
          source_ref?: string | null
          status?: Database["public"]["Enums"]["mistake_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          concept?: string
          correction?: string | null
          created_at?: string
          id?: string
          mistake?: string
          next_revision_date?: string | null
          paper_code?: string | null
          source?: Database["public"]["Enums"]["mistake_source"]
          source_ref?: string | null
          status?: Database["public"]["Enums"]["mistake_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistakes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mistakes_paper_code_fkey"
            columns: ["paper_code"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["code"]
          },
        ]
      }
      mock_tests: {
        Row: {
          created_at: string
          id: string
          max_score: number
          notes: string | null
          paper_code: string | null
          score: number
          test_date: string
          test_name: string
          time_taken_minutes: number | null
          updated_at: string
          user_id: string
          weak_areas: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          max_score?: number
          notes?: string | null
          paper_code?: string | null
          score: number
          test_date: string
          test_name: string
          time_taken_minutes?: number | null
          updated_at?: string
          user_id: string
          weak_areas?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          max_score?: number
          notes?: string | null
          paper_code?: string | null
          score?: number
          test_date?: string
          test_name?: string
          time_taken_minutes?: number | null
          updated_at?: string
          user_id?: string
          weak_areas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_tests_paper_code_fkey"
            columns: ["paper_code"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["code"]
          },
        ]
      }
      mtp_attempts: {
        Row: {
          attempt_date: string | null
          created_at: string
          id: string
          max_score: number | null
          notes: string | null
          paper_code: string
          score: number | null
          session: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_date?: string | null
          created_at?: string
          id?: string
          max_score?: number | null
          notes?: string | null
          paper_code: string
          score?: number | null
          session: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_date?: string | null
          created_at?: string
          id?: string
          max_score?: number | null
          notes?: string | null
          paper_code?: string
          score?: number | null
          session?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mtp_attempts_paper_code_fkey"
            columns: ["paper_code"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["code"]
          },
        ]
      }
      papers: {
        Row: {
          code: string
          name: string
          paper_group: Database["public"]["Enums"]["exam_group"]
          sort_order: number
        }
        Insert: {
          code: string
          name: string
          paper_group: Database["public"]["Enums"]["exam_group"]
          sort_order: number
        }
        Update: {
          code?: string
          name?: string
          paper_group?: Database["public"]["Enums"]["exam_group"]
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          attempt: Database["public"]["Enums"]["exam_attempt"] | null
          avatar_url: string | null
          coaching_schedule: string | null
          created_at: string
          daily_study_hours: number | null
          exam_group: Database["public"]["Enums"]["exam_group"] | null
          full_name: string | null
          id: string
          onboarded: boolean
          updated_at: string
        }
        Insert: {
          attempt?: Database["public"]["Enums"]["exam_attempt"] | null
          avatar_url?: string | null
          coaching_schedule?: string | null
          created_at?: string
          daily_study_hours?: number | null
          exam_group?: Database["public"]["Enums"]["exam_group"] | null
          full_name?: string | null
          id: string
          onboarded?: boolean
          updated_at?: string
        }
        Update: {
          attempt?: Database["public"]["Enums"]["exam_attempt"] | null
          avatar_url?: string | null
          coaching_schedule?: string | null
          created_at?: string
          daily_study_hours?: number | null
          exam_group?: Database["public"]["Enums"]["exam_group"] | null
          full_name?: string | null
          id?: string
          onboarded?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      rtp_pyq_progress: {
        Row: {
          chapter_id: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          kind: string
          notes: string | null
          paper_code: string
          session: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          kind: string
          notes?: string | null
          paper_code: string
          session: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          notes?: string | null
          paper_code?: string
          session?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rtp_pyq_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rtp_pyq_progress_paper_code_fkey"
            columns: ["paper_code"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["code"]
          },
        ]
      }
      tasks: {
        Row: {
          ai_generated: boolean
          chapter_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          paper_code: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          recurring_rule: string | null
          scheduled_date: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean
          chapter_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          paper_code?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          recurring_rule?: string | null
          scheduled_date?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean
          chapter_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          paper_code?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          recurring_rule?: string | null
          scheduled_date?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_paper_code_fkey"
            columns: ["paper_code"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["code"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "user"
      exam_attempt:
        | "may_2025"
        | "sep_2025"
        | "jan_2026"
        | "may_2026"
        | "sep_2026"
      exam_group: "group_1" | "group_2" | "both"
      mistake_source:
        | "module"
        | "rtp"
        | "mtp"
        | "pyq"
        | "mock"
        | "coaching"
        | "other"
      mistake_status: "open" | "reviewing" | "resolved"
      task_priority: "low" | "medium" | "high" | "critical"
      task_status: "pending" | "in_progress" | "done" | "skipped"
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
      app_role: ["admin", "user"],
      exam_attempt: [
        "may_2025",
        "sep_2025",
        "jan_2026",
        "may_2026",
        "sep_2026",
      ],
      exam_group: ["group_1", "group_2", "both"],
      mistake_source: [
        "module",
        "rtp",
        "mtp",
        "pyq",
        "mock",
        "coaching",
        "other",
      ],
      mistake_status: ["open", "reviewing", "resolved"],
      task_priority: ["low", "medium", "high", "critical"],
      task_status: ["pending", "in_progress", "done", "skipped"],
    },
  },
} as const

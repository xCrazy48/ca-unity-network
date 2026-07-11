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
      admin_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
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
      flashcards: {
        Row: {
          back: string
          correct_count: number
          created_at: string
          ease: number
          front: string
          id: string
          interval_days: number
          next_review: string | null
          reviews_count: number
          subject: string | null
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          back: string
          correct_count?: number
          created_at?: string
          ease?: number
          front: string
          id?: string
          interval_days?: number
          next_review?: string | null
          reviews_count?: number
          subject?: string | null
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: string
          correct_count?: number
          created_at?: string
          ease?: number
          front?: string
          id?: string
          interval_days?: number
          next_review?: string | null
          reviews_count?: number
          subject?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          actual_seconds: number
          created_at: string
          ended_at: string
          focus_mode: boolean
          id: string
          interrupted: boolean
          phase: string
          planned_minutes: number
          started_at: string
          user_id: string
        }
        Insert: {
          actual_seconds: number
          created_at?: string
          ended_at?: string
          focus_mode?: boolean
          id?: string
          interrupted?: boolean
          phase?: string
          planned_minutes: number
          started_at?: string
          user_id: string
        }
        Update: {
          actual_seconds?: number
          created_at?: string
          ended_at?: string
          focus_mode?: boolean
          id?: string
          interrupted?: boolean
          phase?: string
          planned_minutes?: number
          started_at?: string
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
      login_history: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          device: string | null
          event_type: string
          id: string
          ip_address: unknown
          os: string | null
          provider: string | null
          session_duration_seconds: number | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          os?: string | null
          provider?: string | null
          session_duration_seconds?: number | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          os?: string | null
          provider?: string | null
          session_duration_seconds?: number | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
      mock_analyses: {
        Row: {
          accuracy: number | null
          attempted: number | null
          chapter_performance: Json | null
          correct: number | null
          created_at: string
          file_mime: string | null
          file_path: string | null
          id: string
          improvement_suggestions: Json | null
          incorrect: number | null
          max_score: number | null
          overall_score: number | null
          paper_code: string | null
          raw_ai_response: Json | null
          readiness_score: number | null
          section_scores: Json | null
          source: string
          status: string
          strong_areas: Json | null
          subject_scores: Json | null
          test_name: string | null
          time_taken_minutes: number | null
          unattempted: number | null
          updated_at: string
          user_id: string
          weak_areas: Json | null
        }
        Insert: {
          accuracy?: number | null
          attempted?: number | null
          chapter_performance?: Json | null
          correct?: number | null
          created_at?: string
          file_mime?: string | null
          file_path?: string | null
          id?: string
          improvement_suggestions?: Json | null
          incorrect?: number | null
          max_score?: number | null
          overall_score?: number | null
          paper_code?: string | null
          raw_ai_response?: Json | null
          readiness_score?: number | null
          section_scores?: Json | null
          source: string
          status?: string
          strong_areas?: Json | null
          subject_scores?: Json | null
          test_name?: string | null
          time_taken_minutes?: number | null
          unattempted?: number | null
          updated_at?: string
          user_id: string
          weak_areas?: Json | null
        }
        Update: {
          accuracy?: number | null
          attempted?: number | null
          chapter_performance?: Json | null
          correct?: number | null
          created_at?: string
          file_mime?: string | null
          file_path?: string | null
          id?: string
          improvement_suggestions?: Json | null
          incorrect?: number | null
          max_score?: number | null
          overall_score?: number | null
          paper_code?: string | null
          raw_ai_response?: Json | null
          readiness_score?: number | null
          section_scores?: Json | null
          source?: string
          status?: string
          strong_areas?: Json | null
          subject_scores?: Json | null
          test_name?: string | null
          time_taken_minutes?: number | null
          unattempted?: number | null
          updated_at?: string
          user_id?: string
          weak_areas?: Json | null
        }
        Relationships: []
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
      notes: {
        Row: {
          attachment_path: string | null
          content: string | null
          created_at: string
          id: string
          subject: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_path?: string | null
          content?: string | null
          created_at?: string
          id?: string
          subject?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_path?: string | null
          content?: string | null
          created_at?: string
          id?: string
          subject?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          category: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      papers: {
        Row: {
          code: string
          level: string
          name: string
          paper_group: Database["public"]["Enums"]["exam_group"]
          sort_order: number
        }
        Insert: {
          code: string
          level?: string
          name: string
          paper_group: Database["public"]["Enums"]["exam_group"]
          sort_order: number
        }
        Update: {
          code?: string
          level?: string
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
          country: string | null
          created_at: string
          daily_study_hours: number | null
          exam_date: string | null
          exam_group: Database["public"]["Enums"]["exam_group"] | null
          exam_month: number | null
          exam_year: number | null
          full_name: string | null
          google_id: string | null
          id: string
          last_active_at: string | null
          last_login_at: string | null
          level: Database["public"]["Enums"]["exam_level"] | null
          level_change_count: number
          marketing_opt_in: boolean
          mobile_number: string | null
          onboarded: boolean
          preferred_language: string | null
          referral_code: string | null
          referral_source: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          attempt?: Database["public"]["Enums"]["exam_attempt"] | null
          avatar_url?: string | null
          coaching_schedule?: string | null
          country?: string | null
          created_at?: string
          daily_study_hours?: number | null
          exam_date?: string | null
          exam_group?: Database["public"]["Enums"]["exam_group"] | null
          exam_month?: number | null
          exam_year?: number | null
          full_name?: string | null
          google_id?: string | null
          id: string
          last_active_at?: string | null
          last_login_at?: string | null
          level?: Database["public"]["Enums"]["exam_level"] | null
          level_change_count?: number
          marketing_opt_in?: boolean
          mobile_number?: string | null
          onboarded?: boolean
          preferred_language?: string | null
          referral_code?: string | null
          referral_source?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          attempt?: Database["public"]["Enums"]["exam_attempt"] | null
          avatar_url?: string | null
          coaching_schedule?: string | null
          country?: string | null
          created_at?: string
          daily_study_hours?: number | null
          exam_date?: string | null
          exam_group?: Database["public"]["Enums"]["exam_group"] | null
          exam_month?: number | null
          exam_year?: number | null
          full_name?: string | null
          google_id?: string | null
          id?: string
          last_active_at?: string | null
          last_login_at?: string | null
          level?: Database["public"]["Enums"]["exam_level"] | null
          level_change_count?: number
          marketing_opt_in?: boolean
          mobile_number?: string | null
          onboarded?: boolean
          preferred_language?: string | null
          referral_code?: string | null
          referral_source?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code_used: string | null
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          code_used?: string | null
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          code_used?: string | null
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
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
      study_plans: {
        Row: {
          created_at: string
          daily_hours: number
          daily_timetable: Json
          exam_date: string
          exam_name: string
          id: string
          is_active: boolean
          monthly_goals: Json
          notes: string | null
          plan_days: Json | null
          preparation_level: string
          schedule_preference: string | null
          strategy: string | null
          strong_subjects: Json
          updated_at: string
          user_id: string
          weak_subjects: Json
          weekly_goals: Json
        }
        Insert: {
          created_at?: string
          daily_hours: number
          daily_timetable?: Json
          exam_date: string
          exam_name: string
          id?: string
          is_active?: boolean
          monthly_goals?: Json
          notes?: string | null
          plan_days?: Json | null
          preparation_level: string
          schedule_preference?: string | null
          strategy?: string | null
          strong_subjects?: Json
          updated_at?: string
          user_id: string
          weak_subjects?: Json
          weekly_goals?: Json
        }
        Update: {
          created_at?: string
          daily_hours?: number
          daily_timetable?: Json
          exam_date?: string
          exam_name?: string
          id?: string
          is_active?: boolean
          monthly_goals?: Json
          notes?: string | null
          plan_days?: Json | null
          preparation_level?: string
          schedule_preference?: string | null
          strategy?: string | null
          strong_subjects?: Json
          updated_at?: string
          user_id?: string
          weak_subjects?: Json
          weekly_goals?: Json
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          chapter_id: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          notes: string | null
          questions_attempted: number
          questions_correct: number
          started_at: string
          subject: string | null
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          questions_attempted?: number
          questions_correct?: number
          started_at?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          questions_attempted?: number
          questions_correct?: number
          started_at?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: []
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
      two_factor_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          activity_type: string
          created_at: string
          duration_seconds: number | null
          id: string
          metadata: Json
          page_path: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json
          page_path?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json
          page_path?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_settings: {
        Row: {
          created_at: string
          email_notifications: boolean
          push_notifications: boolean
          remember_me: boolean
          reminder_daily_brief: boolean
          reminder_revision: boolean
          theme: string
          two_factor_enabled: boolean
          two_factor_verified_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          push_notifications?: boolean
          remember_me?: boolean
          reminder_daily_brief?: boolean
          reminder_revision?: boolean
          theme?: string
          two_factor_enabled?: boolean
          two_factor_verified_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          push_notifications?: boolean
          remember_me?: boolean
          reminder_daily_brief?: boolean
          reminder_revision?: boolean
          theme?: string
          two_factor_enabled?: boolean
          two_factor_verified_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          current_streak: number
          last_active_date: string | null
          level: number
          longest_streak: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          current_streak?: number
          last_active_date?: string | null
          level?: number
          longest_streak?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          current_streak?: number
          last_active_date?: string | null
          level?: number
          longest_streak?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_xp: {
        Args: { _amount: number; _user_id: string }
        Returns: {
          new_level: number
          new_xp: number
          streak: number
        }[]
      }
      gen_referral_code: { Args: never; Returns: string }
      get_admin_stats: { Args: never; Returns: Json }
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
      exam_level: "inter" | "final"
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
      exam_level: ["inter", "final"],
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

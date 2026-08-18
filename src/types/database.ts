// Database types matching the Supabase schema
// Follows Supabase's generated type format for proper client typing

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subjects_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          mode: string;
          planned_duration_seconds: number | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          started_at: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          mode: string;
          planned_duration_seconds?: number | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          subject_id?: string;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          mode?: string;
          planned_duration_seconds?: number | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'study_sessions_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'study_sessions_subject_id_fkey';
            columns: ['subject_id'];
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          }
        ];
      };
      problems: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          platform: string;
          difficulty: string;
          topic: string | null;
          url: string | null;
          title_normalized: string | null;
          platform_normalized: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          platform: string;
          difficulty: string;
          topic?: string | null;
          url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          platform?: string;
          difficulty?: string;
          topic?: string | null;
          url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'problems_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      problem_attempts: {
        Row: {
          id: string;
          user_id: string;
          problem_id: string;
          study_session_id: string | null;
          started_at: string;
          ended_at: string;
          duration_seconds: number;
          result: string;
          attempt_number: number | null;
          test_cases_passed: number | null;
          test_cases_total: number | null;
          language: string | null;
          hint_used: boolean | null;
          editorial_used: boolean | null;
          time_complexity: string | null;
          space_complexity: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          problem_id: string;
          study_session_id?: string | null;
          started_at: string;
          ended_at: string;
          duration_seconds: number;
          result: string;
          attempt_number?: number | null;
          test_cases_passed?: number | null;
          test_cases_total?: number | null;
          language?: string | null;
          hint_used?: boolean | null;
          editorial_used?: boolean | null;
          time_complexity?: string | null;
          space_complexity?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          study_session_id?: string | null;
          started_at?: string;
          ended_at?: string;
          duration_seconds?: number;
          result?: string;
          attempt_number?: number | null;
          test_cases_passed?: number | null;
          test_cases_total?: number | null;
          language?: string | null;
          hint_used?: boolean | null;
          editorial_used?: boolean | null;
          time_complexity?: string | null;
          space_complexity?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'problem_attempts_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'problem_attempts_problem_id_fkey';
            columns: ['problem_id'];
            referencedRelation: 'problems';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'problem_attempts_study_session_id_fkey';
            columns: ['study_session_id'];
            referencedRelation: 'study_sessions';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Subject = Database['public']['Tables']['subjects']['Row'];
export type StudySession = Database['public']['Tables']['study_sessions']['Row'];
export type Problem = Database['public']['Tables']['problems']['Row'];
export type ProblemAttempt = Database['public']['Tables']['problem_attempts']['Row'];

// Join type for display
export interface StudySessionWithSubject extends StudySession {
  subjects: Pick<Subject, 'name'> | null;
}

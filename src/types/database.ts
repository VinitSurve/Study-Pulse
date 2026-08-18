// Database types matching the Supabase schema

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  subject_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  mode: 'timed' | 'until_stop';
  planned_duration_seconds: number | null;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

// Join types for display
export interface StudySessionWithSubject extends StudySession {
  subjects: Pick<Subject, 'name'>;
}

// Database schema for Supabase client typing
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      subjects: {
        Row: Subject;
        Insert: Omit<Subject, 'id' | 'created_at'>;
        Update: Partial<Omit<Subject, 'id' | 'user_id' | 'created_at'>>;
      };
      study_sessions: {
        Row: StudySession;
        Insert: Omit<StudySession, 'created_at'>;
        Update: Partial<Omit<StudySession, 'id' | 'user_id' | 'created_at'>>;
      };
    };
  };
}

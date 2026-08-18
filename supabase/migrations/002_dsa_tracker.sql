-- ============================================================
-- PROBLEMS
-- ============================================================
CREATE TABLE problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  topic TEXT,
  url TEXT,
  
  -- Generated normalized columns for robust uniqueness
  title_normalized TEXT GENERATED ALWAYS AS (lower(btrim(title))) STORED,
  platform_normalized TEXT GENERATED ALWAYS AS (lower(btrim(platform))) STORED,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_problem UNIQUE(user_id, title_normalized, platform_normalized)
);

CREATE INDEX idx_problems_user_id ON problems(user_id);

-- ============================================================
-- PROBLEM ATTEMPTS
-- ============================================================
CREATE TABLE problem_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE RESTRICT,
  study_session_id UUID REFERENCES study_sessions(id) ON DELETE SET NULL,
  
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('solved', 'failed', 'abandoned')),
  
  -- Display metadata
  attempt_number INTEGER,
  test_cases_passed INTEGER,
  test_cases_total INTEGER,
  language TEXT,
  hint_used BOOLEAN DEFAULT false,
  editorial_used BOOLEAN DEFAULT false,
  time_complexity TEXT,
  space_complexity TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attempts_user_id ON problem_attempts(user_id);
CREATE INDEX idx_attempts_problem_id ON problem_attempts(problem_id);
CREATE INDEX idx_attempts_session_id ON problem_attempts(study_session_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_attempts ENABLE ROW LEVEL SECURITY;

-- PROBLEMS RLS
CREATE POLICY "Users read own problems"
  ON problems FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users delete own problems"
  ON problems FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users insert own problems"
  ON problems FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own problems"
  ON problems FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- PROBLEM ATTEMPTS RLS
CREATE POLICY "Users read own attempts"
  ON problem_attempts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users delete own attempts"
  ON problem_attempts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users insert own attempts"
  ON problem_attempts FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    problem_id IN (SELECT id FROM problems WHERE user_id = auth.uid()) AND
    (study_session_id IS NULL OR study_session_id IN (SELECT id FROM study_sessions WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users update own attempts"
  ON problem_attempts FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    problem_id IN (SELECT id FROM problems WHERE user_id = auth.uid()) AND
    (study_session_id IS NULL OR study_session_id IN (SELECT id FROM study_sessions WHERE user_id = auth.uid()))
  );


-- Mock Analyses
CREATE TABLE public.mock_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('upload','manual')),
  file_path TEXT,
  file_mime TEXT,
  test_name TEXT,
  paper_code TEXT,
  overall_score NUMERIC,
  max_score NUMERIC,
  accuracy NUMERIC,
  attempted INTEGER,
  correct INTEGER,
  incorrect INTEGER,
  unattempted INTEGER,
  time_taken_minutes INTEGER,
  subject_scores JSONB DEFAULT '[]'::jsonb,
  section_scores JSONB DEFAULT '[]'::jsonb,
  chapter_performance JSONB DEFAULT '[]'::jsonb,
  strong_areas JSONB DEFAULT '[]'::jsonb,
  weak_areas JSONB DEFAULT '[]'::jsonb,
  improvement_suggestions JSONB DEFAULT '[]'::jsonb,
  readiness_score NUMERIC,
  raw_ai_response JSONB,
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_analyses TO authenticated;
GRANT ALL ON public.mock_analyses TO service_role;
ALTER TABLE public.mock_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mock analyses" ON public.mock_analyses FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_mock_analyses_user_created ON public.mock_analyses (user_id, created_at DESC);
CREATE TRIGGER mock_analyses_updated BEFORE UPDATE ON public.mock_analyses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Focus Sessions
CREATE TABLE public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  planned_minutes INTEGER NOT NULL,
  actual_seconds INTEGER NOT NULL,
  focus_mode BOOLEAN NOT NULL DEFAULT false,
  interrupted BOOLEAN NOT NULL DEFAULT false,
  phase TEXT NOT NULL DEFAULT 'focus',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.focus_sessions TO authenticated;
GRANT ALL ON public.focus_sessions TO service_role;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own focus sessions" ON public.focus_sessions FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_focus_sessions_user_created ON public.focus_sessions (user_id, created_at DESC);

-- User XP / Level / Streak
CREATE TABLE public.user_xp (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_xp TO authenticated;
GRANT ALL ON public.user_xp TO service_role;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own xp" ON public.user_xp FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_xp_updated BEFORE UPDATE ON public.user_xp
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Award XP + update streak function
CREATE OR REPLACE FUNCTION public.award_xp(_user_id UUID, _amount INTEGER)
RETURNS TABLE (new_xp INTEGER, new_level INTEGER, streak INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  today DATE := (now() AT TIME ZONE 'UTC')::date;
  row public.user_xp;
BEGIN
  INSERT INTO public.user_xp (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO row FROM public.user_xp WHERE user_id = _user_id FOR UPDATE;
  IF row.last_active_date IS NULL OR row.last_active_date < today - 1 THEN
    row.current_streak := 1;
  ELSIF row.last_active_date = today - 1 THEN
    row.current_streak := row.current_streak + 1;
  END IF;
  IF row.current_streak > row.longest_streak THEN
    row.longest_streak := row.current_streak;
  END IF;
  row.xp := row.xp + GREATEST(0, _amount);
  row.level := 1 + FLOOR(row.xp / 200)::int;
  row.last_active_date := today;
  UPDATE public.user_xp SET
    xp = row.xp, level = row.level,
    current_streak = row.current_streak, longest_streak = row.longest_streak,
    last_active_date = row.last_active_date
  WHERE user_id = _user_id;
  RETURN QUERY SELECT row.xp, row.level, row.current_streak;
END;
$$;
GRANT EXECUTE ON FUNCTION public.award_xp(UUID, INTEGER) TO authenticated;

-- Storage policies for mock-uploads bucket (per-user folder = auth.uid())
CREATE POLICY "Users read own mock uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mock-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own mock uploads"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mock-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own mock uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mock-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

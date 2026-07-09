
CREATE TABLE public.study_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  preparation_level TEXT NOT NULL,
  daily_hours NUMERIC(4,1) NOT NULL,
  schedule_preference TEXT,
  weak_subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  strong_subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  daily_timetable JSONB NOT NULL DEFAULT '[]'::jsonb,
  weekly_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  monthly_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  strategy TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plans TO authenticated;
GRANT ALL ON public.study_plans TO service_role;

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own study plans" ON public.study_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER study_plans_updated_at
  BEFORE UPDATE ON public.study_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX study_plans_user_active_idx ON public.study_plans(user_id, is_active, created_at DESC);

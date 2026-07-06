
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.exam_group AS ENUM ('group_1', 'group_2', 'both');
CREATE TYPE public.exam_attempt AS ENUM ('may_2025', 'sep_2025', 'jan_2026', 'may_2026', 'sep_2026');
CREATE TYPE public.mistake_source AS ENUM ('module', 'rtp', 'mtp', 'pyq', 'mock', 'coaching', 'other');
CREATE TYPE public.mistake_status AS ENUM ('open', 'reviewing', 'resolved');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'done', 'skipped');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  attempt exam_attempt,
  exam_group exam_group,
  daily_study_hours NUMERIC(3,1) DEFAULT 6,
  coaching_schedule TEXT,
  onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Exam config (per user editable dates)
CREATE TABLE public.exam_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL DEFAULT '3_day', -- '3_day' | '6_day'
  paper_dates JSONB NOT NULL DEFAULT '{}'::jsonb, -- { paper_code: 'YYYY-MM-DD' }
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_config TO authenticated;
GRANT ALL ON public.exam_config TO service_role;
ALTER TABLE public.exam_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exam_config" ON public.exam_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER exam_config_updated BEFORE UPDATE ON public.exam_config FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Papers (global reference)
CREATE TABLE public.papers (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  paper_group exam_group NOT NULL,
  sort_order INT NOT NULL
);
GRANT SELECT ON public.papers TO authenticated, anon;
GRANT ALL ON public.papers TO service_role;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "papers public read" ON public.papers FOR SELECT USING (true);

INSERT INTO public.papers (code, name, paper_group, sort_order) VALUES
 ('p1', 'Advanced Accounting', 'group_1', 1),
 ('p2', 'Corporate & Other Laws', 'group_1', 2),
 ('p3', 'Taxation', 'group_1', 3),
 ('p4', 'Cost & Management Accounting', 'group_2', 4),
 ('p5', 'Auditing & Ethics', 'group_2', 5),
 ('p6', 'Financial Management & Strategic Management', 'group_2', 6);

-- Chapters (global reference, ICAI weightage)
CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_code TEXT NOT NULL REFERENCES public.papers(code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weightage_min INT,
  weightage_max INT,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.chapters TO authenticated, anon;
GRANT ALL ON public.chapters TO service_role;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chapters public read" ON public.chapters FOR SELECT USING (true);

-- Chapter progress per user
CREATE TABLE public.chapter_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started | learning | revised | mastered
  confidence INT NOT NULL DEFAULT 0, -- 0-100
  last_revised_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, chapter_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_progress TO authenticated;
GRANT ALL ON public.chapter_progress TO service_role;
ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chapter_progress" ON public.chapter_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER chapter_progress_updated BEFORE UPDATE ON public.chapter_progress FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Mock tests
CREATE TABLE public.mock_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_code TEXT REFERENCES public.papers(code),
  test_name TEXT NOT NULL,
  test_date DATE NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  time_taken_minutes INT,
  weak_areas TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_tests TO authenticated;
GRANT ALL ON public.mock_tests TO service_role;
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mocks" ON public.mock_tests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER mock_tests_updated BEFORE UPDATE ON public.mock_tests FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- MTP tracker
CREATE TABLE public.mtp_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_code TEXT NOT NULL REFERENCES public.papers(code),
  session TEXT NOT NULL, -- e.g. 'May 2025 MTP 1'
  attempt_date DATE,
  score NUMERIC(5,2),
  max_score NUMERIC(5,2) DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'planned', -- planned | attempted | reviewed
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mtp_attempts TO authenticated;
GRANT ALL ON public.mtp_attempts TO service_role;
ALTER TABLE public.mtp_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mtps" ON public.mtp_attempts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER mtp_updated BEFORE UPDATE ON public.mtp_attempts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RTP & PYQ checklist (per user)
CREATE TABLE public.rtp_pyq_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session TEXT NOT NULL, -- 'May 2024', 'Sep 2024', ...
  kind TEXT NOT NULL,    -- 'rtp' | 'pyq'
  paper_code TEXT NOT NULL REFERENCES public.papers(code),
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rtp_pyq_progress TO authenticated;
GRANT ALL ON public.rtp_pyq_progress TO service_role;
ALTER TABLE public.rtp_pyq_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rtp_pyq" ON public.rtp_pyq_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER rtp_pyq_updated BEFORE UPDATE ON public.rtp_pyq_progress FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Mistake book
CREATE TABLE public.mistakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source mistake_source NOT NULL,
  source_ref TEXT,
  paper_code TEXT REFERENCES public.papers(code),
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  concept TEXT NOT NULL,
  mistake TEXT NOT NULL,
  correction TEXT,
  next_revision_date DATE,
  status mistake_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mistakes TO authenticated;
GRANT ALL ON public.mistakes TO service_role;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mistakes" ON public.mistakes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER mistakes_updated BEFORE UPDATE ON public.mistakes FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Formula vault
CREATE TABLE public.formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_code TEXT REFERENCES public.papers(code),
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  confidence INT NOT NULL DEFAULT 0,
  revision_interval_days INT NOT NULL DEFAULT 3,
  next_revision_date DATE,
  last_revised_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formulas TO authenticated;
GRANT ALL ON public.formulas TO service_role;
ALTER TABLE public.formulas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own formulas" ON public.formulas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER formulas_updated BEFORE UPDATE ON public.formulas FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Tasks / planner
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  paper_code TEXT REFERENCES public.papers(code),
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  scheduled_date DATE,
  duration_minutes INT,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'pending',
  recurring_rule TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed chapters (compact starter set; can be expanded later)
INSERT INTO public.chapters (paper_code, name, weightage_min, weightage_max, sort_order) VALUES
('p1','Introduction to Accounting Standards',5,10,1),
('p1','Framework for Preparation of Financial Statements',5,10,2),
('p1','Applicability of Accounting Standards',10,15,3),
('p1','Presentation & Disclosures Based Accounting Standards',10,15,4),
('p1','Assets Based Accounting Standards',15,20,5),
('p1','Liabilities Based Accounting Standards',10,15,6),
('p1','Accounting Standards Based on Items Impacting Financial Statements',10,15,7),
('p1','Disclosure & Miscellaneous Accounting Standards',5,10,8),
('p1','Accounting for Branches including Foreign Branches',10,15,9),
('p1','Accounting for Amalgamation',10,15,10),

('p2','Preliminary & Incorporation of Company',5,10,1),
('p2','Prospectus & Allotment of Securities',5,10,2),
('p2','Share Capital & Debentures',10,15,3),
('p2','Acceptance of Deposits',5,10,4),
('p2','Registration of Charges',5,10,5),
('p2','Management & Administration',10,15,6),
('p2','Declaration & Payment of Dividend',5,10,7),
('p2','Accounts & Audit of Companies',10,15,8),
('p2','General Clauses Act',5,10,9),
('p2','Interpretation of Statutes',5,10,10),

('p3','Basic Concepts of Income Tax',5,10,1),
('p3','Residence & Scope of Total Income',5,10,2),
('p3','Heads of Income - Salary',10,15,3),
('p3','Heads of Income - House Property',5,10,4),
('p3','Heads of Income - PGBP',15,20,5),
('p3','Heads of Income - Capital Gains',10,15,6),
('p3','Heads of Income - Other Sources',5,10,7),
('p3','Deductions from Gross Total Income',5,10,8),
('p3','Advance Tax, TDS, TCS',5,10,9),
('p3','GST - Concept & Charge',10,15,10),
('p3','GST - Input Tax Credit',10,15,11),
('p3','GST - Registration, Returns',5,10,12),

('p4','Introduction to Cost & Management Accounting',5,10,1),
('p4','Material Cost',10,15,2),
('p4','Employee Cost & Direct Expenses',5,10,3),
('p4','Overheads',10,15,4),
('p4','Activity Based Costing',5,10,5),
('p4','Cost Sheet',5,10,6),
('p4','Job, Batch & Contract Costing',5,10,7),
('p4','Process & Operation Costing',10,15,8),
('p4','Joint Products & By Products',5,10,9),
('p4','Service Costing',5,10,10),
('p4','Standard Costing',10,15,11),
('p4','Marginal Costing',10,15,12),
('p4','Budgets & Budgetary Control',10,15,13),

('p5','Nature, Objective & Scope of Audit',5,10,1),
('p5','Audit Strategy, Planning & Programming',10,15,2),
('p5','Risk Assessment & Internal Control',10,15,3),
('p5','Audit Evidence',10,15,4),
('p5','Audit of Items of Financial Statements',15,20,5),
('p5','Audit Documentation',5,10,6),
('p5','Completion & Review',5,10,7),
('p5','Audit Report',10,15,8),
('p5','Special Features of Audit of Different Entities',5,10,9),
('p5','Audit of Banks & NBFC',5,10,10),
('p5','Ethics & Terms of Audit Engagements',10,15,11),

('p6','Financial Management - Introduction & Analysis',5,10,1),
('p6','Cost of Capital',10,15,2),
('p6','Capital Structure Decisions',10,15,3),
('p6','Leverages',5,10,4),
('p6','Investment Decisions',10,15,5),
('p6','Dividend Decisions',5,10,6),
('p6','Working Capital Management',15,20,7),
('p6','SM - Introduction to Strategic Management',5,10,8),
('p6','SM - Strategic Analysis - External & Internal',10,15,9),
('p6','SM - Strategic Choices',10,15,10),
('p6','SM - Strategy Implementation & Evaluation',5,10,11);

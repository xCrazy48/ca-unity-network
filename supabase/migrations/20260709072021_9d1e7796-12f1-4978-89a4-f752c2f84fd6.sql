
-- ============================================================
-- 1. EXTEND profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mobile_number text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_source text,
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_id text;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active_at DESC);

-- Referral code generator
CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- Update the existing handle_new_user trigger function to also create defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, google_id, referral_code, referral_source)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN NEW.raw_user_meta_data->>'provider_id' IS NOT NULL
         AND NEW.raw_app_meta_data->>'provider' = 'google'
         THEN NEW.raw_user_meta_data->>'provider_id' END,
    public.gen_referral_code(),
    NEW.raw_user_meta_data->>'referral_source'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill missing referral codes
UPDATE public.profiles SET referral_code = public.gen_referral_code() WHERE referral_code IS NULL;

-- ============================================================
-- 2. user_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark',
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT true,
  reminder_daily_brief boolean NOT NULL DEFAULT true,
  reminder_revision boolean NOT NULL DEFAULT true,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  two_factor_verified_at timestamptz,
  remember_me boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.user_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read settings" ON public.user_settings FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
CREATE TRIGGER user_settings_updated BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Backfill settings for existing users
INSERT INTO public.user_settings (user_id)
SELECT id FROM public.profiles ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 3. login_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('login','logout','failed_login','session_start','session_end')),
  provider text,
  device text,
  browser text,
  os text,
  ip_address inet,
  country text,
  user_agent text,
  session_duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.login_history TO authenticated;
GRANT ALL ON public.login_history TO service_role;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own login history" ON public.login_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "insert own login history" ON public.login_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read login history" ON public.login_history FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_login_history_user_created ON public.login_history(user_id, created_at DESC);
CREATE INDEX idx_login_history_created ON public.login_history(created_at DESC);

-- ============================================================
-- 4. user_activity
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  page_path text,
  duration_seconds integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.user_activity TO authenticated;
GRANT ALL ON public.user_activity TO service_role;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity" ON public.user_activity FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "insert own activity" ON public.user_activity FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read activity" ON public.user_activity FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_user_activity_user_created ON public.user_activity(user_id, created_at DESC);
CREATE INDEX idx_user_activity_type ON public.user_activity(activity_type);
CREATE INDEX idx_user_activity_page ON public.user_activity(page_path);

-- ============================================================
-- 5. study_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text,
  chapter_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  questions_attempted integer NOT NULL DEFAULT 0,
  questions_correct integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own study sessions" ON public.study_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read study sessions" ON public.study_sessions FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_study_sessions_user_started ON public.study_sessions(user_id, started_at DESC);

-- ============================================================
-- 6. notes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  subject text,
  tags text[] NOT NULL DEFAULT '{}',
  attachment_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notes" ON public.notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER notes_updated BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_notes_user ON public.notes(user_id, updated_at DESC);

-- ============================================================
-- 7. flashcards
-- ============================================================
CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  subject text,
  tags text[] NOT NULL DEFAULT '{}',
  ease numeric(4,2) NOT NULL DEFAULT 2.5,
  interval_days integer NOT NULL DEFAULT 1,
  next_review date,
  reviews_count integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;
GRANT ALL ON public.flashcards TO service_role;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own flashcards" ON public.flashcards FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER flashcards_updated BEFORE UPDATE ON public.flashcards
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_flashcards_user_review ON public.flashcards(user_id, next_review);

-- ============================================================
-- 8. referrals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_used text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_id)
);
GRANT SELECT, INSERT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "insert as referred" ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referred_id);
CREATE POLICY "admin read referrals" ON public.referrals FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);

-- ============================================================
-- 9. notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  category text NOT NULL DEFAULT 'general',
  read_at timestamptz,
  action_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;

-- ============================================================
-- 10. admin_logs (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read logs" ON public.admin_logs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_admin_logs_created ON public.admin_logs(created_at DESC);
CREATE INDEX idx_admin_logs_actor ON public.admin_logs(actor_id);

-- ============================================================
-- 11. two_factor_recovery_codes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.two_factor_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.two_factor_recovery_codes TO authenticated;
GRANT ALL ON public.two_factor_recovery_codes TO service_role;
ALTER TABLE public.two_factor_recovery_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recovery codes" ON public.two_factor_recovery_codes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_recovery_codes_user ON public.two_factor_recovery_codes(user_id) WHERE used_at IS NULL;

-- ============================================================
-- 12. Admin dashboard aggregated view helper (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION private.get_admin_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'new_signups_7d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'new_signups_30d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '30 days'),
    'dau', (SELECT count(DISTINCT user_id) FROM public.user_activity WHERE created_at > now() - interval '1 day'),
    'mau', (SELECT count(DISTINCT user_id) FROM public.user_activity WHERE created_at > now() - interval '30 days'),
    'google_logins_30d', (SELECT count(*) FROM public.login_history WHERE provider='google' AND event_type='login' AND created_at > now() - interval '30 days'),
    'email_logins_30d', (SELECT count(*) FROM public.login_history WHERE provider='email' AND event_type='login' AND created_at > now() - interval '30 days'),
    'avg_study_minutes_7d', (SELECT COALESCE(round(avg(duration_seconds)/60.0, 1), 0) FROM public.study_sessions WHERE started_at > now() - interval '7 days'),
    'total_study_sessions', (SELECT count(*) FROM public.study_sessions),
    'top_pages', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
      SELECT page_path, count(*)::int AS visits FROM public.user_activity
      WHERE page_path IS NOT NULL AND created_at > now() - interval '30 days'
      GROUP BY page_path ORDER BY visits DESC LIMIT 10
    ) t),
    'top_countries', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
      SELECT country, count(*)::int AS logins FROM public.login_history
      WHERE country IS NOT NULL AND created_at > now() - interval '30 days'
      GROUP BY country ORDER BY logins DESC LIMIT 10
    ) t),
    'top_browsers', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
      SELECT browser, count(*)::int AS logins FROM public.login_history
      WHERE browser IS NOT NULL AND created_at > now() - interval '30 days'
      GROUP BY browser ORDER BY logins DESC LIMIT 10
    ) t),
    'top_devices', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
      SELECT device, count(*)::int AS logins FROM public.login_history
      WHERE device IS NOT NULL AND created_at > now() - interval '30 days'
      GROUP BY device ORDER BY logins DESC LIMIT 10
    ) t),
    'question_accuracy', (SELECT CASE WHEN sum(questions_attempted) > 0
      THEN round(100.0 * sum(questions_correct)::numeric / sum(questions_attempted), 1) ELSE 0 END
      FROM public.study_sessions WHERE started_at > now() - interval '30 days')
  );
$$;

REVOKE EXECUTE ON FUNCTION private.get_admin_stats() FROM PUBLIC, anon, authenticated;

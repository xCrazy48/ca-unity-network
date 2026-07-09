
DO $$ BEGIN
  CREATE TYPE public.exam_level AS ENUM ('inter', 'final');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS level public.exam_level,
  ADD COLUMN IF NOT EXISTS exam_month smallint CHECK (exam_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS exam_year smallint CHECK (exam_year BETWEEN 2024 AND 2100),
  ADD COLUMN IF NOT EXISTS exam_date date,
  ADD COLUMN IF NOT EXISTS level_change_count smallint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.tg_profiles_level_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.level IS DISTINCT FROM OLD.level THEN
    IF OLD.level IS NOT NULL THEN
      IF COALESCE(OLD.level_change_count, 0) >= 3 THEN
        RAISE EXCEPTION 'Level can only be changed 3 times in a lifetime';
      END IF;
      NEW.level_change_count := COALESCE(OLD.level_change_count, 0) + 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_level_guard ON public.profiles;
CREATE TRIGGER profiles_level_guard
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_profiles_level_guard();

REVOKE EXECUTE ON FUNCTION public.tg_profiles_level_guard() FROM PUBLIC, anon, authenticated;

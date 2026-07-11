
CREATE OR REPLACE FUNCTION private.get_admin_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    -- Users
    'total_users', (SELECT count(*) FROM public.profiles),
    'signups_today', (SELECT count(*) FROM public.profiles WHERE created_at >= date_trunc('day', now())),
    'new_signups_7d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'new_signups_30d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '30 days'),
    'dau', (SELECT count(DISTINCT user_id) FROM public.user_activity WHERE created_at > now() - interval '1 day'),
    'wau', (SELECT count(DISTINCT user_id) FROM public.user_activity WHERE created_at > now() - interval '7 days'),
    'mau', (SELECT count(DISTINCT user_id) FROM public.user_activity WHERE created_at > now() - interval '30 days'),
    'google_logins_30d', (SELECT count(*) FROM public.login_history WHERE provider='google' AND event_type='login' AND created_at > now() - interval '30 days'),
    'email_logins_30d', (SELECT count(*) FROM public.login_history WHERE provider='email' AND event_type='login' AND created_at > now() - interval '30 days'),
    'returning_users', (SELECT count(*) FROM (SELECT user_id FROM public.login_history WHERE event_type='login' GROUP BY user_id HAVING count(*) > 1) t),

    -- Timetable
    'timetables_total', (SELECT count(*) FROM public.study_plans),
    'timetables_active', (SELECT count(*) FROM public.study_plans WHERE is_active = true),
    'timetables_synced', (SELECT count(DISTINCT user_id) FROM public.tasks WHERE ai_generated = true),
    'avg_study_hours', (SELECT COALESCE(round(avg(daily_hours)::numeric, 2), 0) FROM public.study_plans),
    'most_selected_attempt', (SELECT exam_name FROM public.study_plans WHERE exam_name IS NOT NULL GROUP BY exam_name ORDER BY count(*) DESC LIMIT 1),

    -- Mocks
    'mocks_total', (SELECT count(*) FROM public.mock_tests),
    'mocks_avg_pct', (SELECT COALESCE(round(avg(CASE WHEN max_score > 0 THEN score/max_score*100 END)::numeric, 1), 0) FROM public.mock_tests),
    'mocks_high_pct', (SELECT COALESCE(round(max(CASE WHEN max_score > 0 THEN score/max_score*100 END)::numeric, 1), 0) FROM public.mock_tests),
    'mocks_low_pct', (SELECT COALESCE(round(min(CASE WHEN max_score > 0 THEN score/max_score*100 END)::numeric, 1), 0) FROM public.mock_tests),
    'mocks_by_paper', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
      SELECT paper_code, count(*)::int AS attempts,
             round(avg(CASE WHEN max_score > 0 THEN score/max_score*100 END)::numeric, 1) AS avg_pct
      FROM public.mock_tests WHERE paper_code IS NOT NULL GROUP BY paper_code ORDER BY attempts DESC LIMIT 20
    ) t),

    -- Mistakes
    'mistakes_total', (SELECT count(*) FROM public.mistakes),
    'mistakes_today', (SELECT count(*) FROM public.mistakes WHERE created_at >= date_trunc('day', now())),
    'mistakes_top_paper', (SELECT paper_code FROM public.mistakes WHERE paper_code IS NOT NULL GROUP BY paper_code ORDER BY count(*) DESC LIMIT 1),
    'mistakes_by_paper', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
      SELECT paper_code, count(*)::int AS total FROM public.mistakes WHERE paper_code IS NOT NULL GROUP BY paper_code ORDER BY total DESC LIMIT 10
    ) t),

    -- Website
    'page_visits_total', (SELECT count(*) FROM public.user_activity WHERE activity_type IN ('page_view','page_enter')),
    'page_visits_today', (SELECT count(*) FROM public.user_activity WHERE activity_type IN ('page_view','page_enter') AND created_at >= date_trunc('day', now())),

    -- Signups over time (last 14 days)
    'signups_series', (SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'day')), '[]'::jsonb) FROM (
      SELECT jsonb_build_object('day', to_char(d::date, 'YYYY-MM-DD'), 'count', (SELECT count(*) FROM public.profiles WHERE created_at::date = d::date)) AS t
      FROM generate_series(now() - interval '13 days', now(), interval '1 day') d
    ) s),

    -- Active users series (14d)
    'active_series', (SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'day')), '[]'::jsonb) FROM (
      SELECT jsonb_build_object('day', to_char(d::date, 'YYYY-MM-DD'), 'count', (SELECT count(DISTINCT user_id) FROM public.user_activity WHERE created_at::date = d::date)) AS t
      FROM generate_series(now() - interval '13 days', now(), interval '1 day') d
    ) s),

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

    -- Study stats
    'avg_study_minutes_7d', (SELECT COALESCE(round(avg(duration_seconds)/60.0, 1), 0) FROM public.study_sessions WHERE started_at > now() - interval '7 days'),
    'total_study_sessions', (SELECT count(*) FROM public.study_sessions),
    'question_accuracy', (SELECT CASE WHEN sum(questions_attempted) > 0
      THEN round(100.0 * sum(questions_correct)::numeric / sum(questions_attempted), 1) ELSE 0 END
      FROM public.study_sessions WHERE started_at > now() - interval '30 days'),

    -- Last login timestamp
    'last_login_at', (SELECT max(created_at) FROM public.login_history WHERE event_type='login'),

    -- Recent activity feed
    'recent_signups', (SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'created_at') DESC), '[]'::jsonb) FROM (
      SELECT jsonb_build_object('id', id, 'name', COALESCE(full_name, 'New user'), 'created_at', created_at) AS t
      FROM public.profiles ORDER BY created_at DESC LIMIT 10
    ) s),
    'recent_mocks', (SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'created_at') DESC), '[]'::jsonb) FROM (
      SELECT jsonb_build_object('id', id, 'paper_code', paper_code, 'test_name', test_name,
        'pct', CASE WHEN max_score > 0 THEN round((score/max_score*100)::numeric, 1) END,
        'created_at', created_at) AS t
      FROM public.mock_tests ORDER BY created_at DESC LIMIT 10
    ) s),
    'recent_mistakes', (SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'created_at') DESC), '[]'::jsonb) FROM (
      SELECT jsonb_build_object('id', id, 'paper_code', paper_code, 'concept', concept, 'created_at', created_at) AS t
      FROM public.mistakes ORDER BY created_at DESC LIMIT 10
    ) s),
    'recent_plans', (SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'created_at') DESC), '[]'::jsonb) FROM (
      SELECT jsonb_build_object('id', id, 'exam_name', exam_name, 'daily_hours', daily_hours, 'created_at', created_at) AS t
      FROM public.study_plans ORDER BY created_at DESC LIMIT 10
    ) s)
  );
$$;

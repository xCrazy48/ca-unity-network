REVOKE ALL ON FUNCTION public.get_admin_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

REVOKE ALL ON FUNCTION private.get_admin_stats() FROM PUBLIC;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('ronildodhia50@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
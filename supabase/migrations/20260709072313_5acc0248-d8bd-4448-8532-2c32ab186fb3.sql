
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO service_role;

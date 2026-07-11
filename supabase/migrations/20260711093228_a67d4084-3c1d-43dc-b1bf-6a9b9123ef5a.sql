-- Lock down public.get_admin_stats:
-- Revoke EXECUTE from authenticated so signed-in users cannot call a
-- SECURITY DEFINER function directly. The server function enforces
-- admin authorization and now invokes it through service_role.

REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO service_role;

-- Update the internal check so service_role (which has no auth.uid())
-- may invoke it. Admin authorization is enforced by the server function
-- before this RPC is called.
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (current_setting('role', true) = 'service_role')
     OR EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE user_id = auth.uid() AND role = 'admin'
     ) THEN
    RETURN private.get_admin_stats();
  END IF;
  RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO service_role;
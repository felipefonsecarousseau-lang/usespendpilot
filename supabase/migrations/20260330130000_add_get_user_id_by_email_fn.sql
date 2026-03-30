
-- Function for webhook fallback: look up a Supabase user ID by email.
-- Queries auth.users directly — O(1), no pagination, 100% deterministic.
-- SECURITY DEFINER runs as the function owner with access to the auth schema.
-- Access is restricted to service_role only (used exclusively by edge functions).

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;

-- Revoke from all roles, then grant only to service_role
REVOKE ALL ON FUNCTION public.get_user_id_by_email(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role;

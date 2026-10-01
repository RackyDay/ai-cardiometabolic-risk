-- Username-based login previously resolved a username to an email in two
-- round trips: public.profiles (by user_displayname) for user_id, then the
-- Admin API's get_user_by_id for email. That two-step was deliberate -
-- email is read live from auth.users, not duplicated into profiles, so
-- there's no second copy that could ever drift out of sync (see
-- auth.py's _resolve_login_email). This function keeps that same property
-- (email is still read live from auth.users, not stored anywhere else)
-- while doing the join server-side in one round trip instead of two.
--
-- SECURITY DEFINER (needed here, unlike the write functions in the prior
-- migration) because the calling role for login can't read auth.users
-- directly - this function is the only thing allowed to. It's granted to
-- service_role only, so it's reachable exclusively through the backend's
-- trusted service-role client, the same trust boundary the Admin API call
-- it replaces already required.
CREATE OR REPLACE FUNCTION public.resolve_username_to_email(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT au.email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.user_displayname = p_username
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_username_to_email FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_username_to_email TO service_role;

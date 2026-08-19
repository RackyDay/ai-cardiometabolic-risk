-- Adds username/email login support on top of Supabase Auth.
--
-- auth.users already stores email + the securely hashed/salted password
-- (GoTrue handles this internally). This migration denormalizes email onto
-- public.profiles and adds a unique username, both populated atomically by
-- handle_new_user() when a new auth.users row is created. Denormalizing
-- email here is what lets the backend resolve "username -> email" via the
-- service-role client (bypassing RLS) without ever exposing a public
-- "look up any user" endpoint - profiles' existing RLS policies still only
-- let a user read their own row.

ALTER TABLE public.profiles
  ADD COLUMN username text,
  ADD COLUMN email text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_key UNIQUE (username);

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  insert into public.profiles (user_id, username, email)
  values (new.id, new.raw_user_meta_data->>'username', new.email);

  return new;
end;
$function$;

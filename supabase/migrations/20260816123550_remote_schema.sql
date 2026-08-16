-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE UPDATE ON SEQUENCES FROM anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE UPDATE ON SEQUENCES FROM authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE UPDATE ON SEQUENCES FROM service_role;

CREATE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  insert into public.profiles (user_id)
  values(new.id);

  return new;
end;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE TABLE public.profiles (
  user_id          uuid                     DEFAULT auth.uid() NOT NULL,
  user_displayname text,
  created_at       timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.profiles IS 'User profile information';

ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);

GRANT ALL ON public.profiles TO anon;

GRANT ALL ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can edit their own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE TABLE public.risk_calculations (
  riskcalc_id        uuid                     DEFAULT gen_random_uuid() NOT NULL,
  riskcalc_timestamp timestamp with time zone DEFAULT now() NOT NULL,
  risk_score         double precision         NOT NULL,
  model_version      text,
  user_id            uuid                     DEFAULT auth.uid() NOT NULL
);

COMMENT ON TABLE public.risk_calculations IS 'risk calculation information';

ALTER TABLE public.risk_calculations
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.risk_calculations
  ADD CONSTRAINT risk_calculations_pkey PRIMARY KEY (riskcalc_id);

ALTER TABLE public.risk_calculations
  ADD CONSTRAINT risk_calculations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public.risk_calculations TO anon;

GRANT ALL ON public.risk_calculations TO authenticated;

GRANT ALL ON public.risk_calculations TO service_role;

CREATE POLICY "Users can delete their own risk calculations" ON public.risk_calculations
  FOR DELETE
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own risk calculations" ON public.risk_calculations
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own risk calculations" ON public.risk_calculations
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE TABLE public.risk_inputs (
  riskinput_id      uuid  DEFAULT gen_random_uuid() NOT NULL,
  riskcalc_id       uuid  DEFAULT gen_random_uuid() NOT NULL,
  "inputs_JSON"     jsonb NOT NULL,
  "input_mask_JSON" jsonb,
  "context_JSON"    jsonb
);

COMMENT ON TABLE public.risk_inputs IS 'Inputs for risk calculation';

ALTER TABLE public.risk_inputs
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.risk_inputs
  ADD CONSTRAINT risk_inputs_pkey PRIMARY KEY (riskinput_id);

ALTER TABLE public.risk_inputs
  ADD CONSTRAINT risk_inputs_riskcalc_id_fkey FOREIGN KEY (riskcalc_id) REFERENCES public.risk_calculations(riskcalc_id) ON UPDATE CASCADE ON DELETE CASCADE;

GRANT ALL ON public.risk_inputs TO anon;

GRANT ALL ON public.risk_inputs TO authenticated;

GRANT ALL ON public.risk_inputs TO service_role;

CREATE POLICY "Users can insert risk inputs for their own risk assessments" ON public.risk_inputs
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.risk_calculations rc
  WHERE ((rc.riskcalc_id = risk_inputs.riskcalc_id) AND (rc.user_id = auth.uid())))));

CREATE POLICY "Users can view risk inputs for their own risk assessments" ON public.risk_inputs
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.risk_calculations rc
  WHERE ((rc.riskcalc_id = risk_inputs.riskcalc_id) AND (rc.user_id = auth.uid())))));

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();

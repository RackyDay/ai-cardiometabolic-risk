-- save_assessment/update_assessment each made two sequential round trips
-- (risk_calculations then risk_inputs) to write one logical assessment.
-- PostgREST's REST API can't express a write spanning two tables in a
-- single call the way a read can via relation embedding, so this moves
-- each pair into one server-side function instead - one round trip, and
-- the two writes become atomic (both succeed or neither does) as a side
-- effect of running inside a single plpgsql function body/transaction.
--
-- SECURITY INVOKER (the default, stated explicitly) is deliberate: the
-- function runs as whichever role calls it - here, the same user-scoped,
-- RLS-bound role the two-call version ran as - so the existing RLS
-- policies on risk_calculations/risk_inputs still apply exactly as
-- before. This is a round-trip optimization, not a privilege change.
CREATE OR REPLACE FUNCTION public.save_assessment_atomic(
  p_user_id uuid,
  p_risk_score double precision,
  p_model_version text,
  p_inputs jsonb,
  p_top_contributors jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_riskcalc_id uuid;
BEGIN
  INSERT INTO public.risk_calculations (user_id, risk_score, model_version, top_contributors)
  VALUES (p_user_id, p_risk_score, p_model_version, p_top_contributors)
  RETURNING riskcalc_id INTO v_riskcalc_id;

  INSERT INTO public.risk_inputs (riskcalc_id, "inputs_JSON")
  VALUES (v_riskcalc_id, p_inputs);

  RETURN v_riskcalc_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_assessment_atomic(
  p_riskcalc_id uuid,
  p_risk_score double precision,
  p_inputs jsonb,
  p_top_contributors jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE public.risk_calculations
  SET risk_score = p_risk_score, top_contributors = p_top_contributors
  WHERE riskcalc_id = p_riskcalc_id;

  UPDATE public.risk_inputs
  SET "inputs_JSON" = p_inputs
  WHERE riskcalc_id = p_riskcalc_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_assessment_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_assessment_atomic TO authenticated;

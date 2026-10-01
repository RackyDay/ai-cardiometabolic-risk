-- top_contributors is deterministic given the stored inputs (see
-- test_predict_is_deterministic), but was never persisted - every read of
-- /predictions/latest and /api/risk-calculations/{id} recomputed it from
-- scratch by rerunning the EBM model's explain_local() on every request.
-- Storing it at write time (POST /predict, PUT /api/risk-calculations/{id})
-- turns every later read into a plain column read instead of a model
-- inference. Nullable: existing rows have no value until they're next
-- edited, so reads fall back to recomputing only for those, exactly like
-- the existing fallback for pre-migration input shapes.
ALTER TABLE public.risk_calculations
  ADD COLUMN IF NOT EXISTS top_contributors jsonb;

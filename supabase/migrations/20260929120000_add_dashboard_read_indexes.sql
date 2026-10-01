-- The dashboard's "latest results" read (GET /predictions/latest) and its
-- history read (GET /api/risk-calculations) both filter risk_calculations by
-- user_id (via the RLS policy's auth.uid() = user_id check) and order by
-- riskcalc_timestamp. Postgres doesn't auto-index foreign-key columns, only
-- primary keys, so both operations were full table scans + sorts. Same
-- problem for risk_inputs.riskcalc_id, used by risk_inputs' own RLS EXISTS
-- subquery and by the app's direct .eq("riskcalc_id", ...) lookups.
CREATE INDEX IF NOT EXISTS idx_risk_calculations_user_id_timestamp
  ON public.risk_calculations (user_id, riskcalc_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_risk_inputs_riskcalc_id
  ON public.risk_inputs (riskcalc_id);

-- The original schema only granted INSERT/SELECT/DELETE on risk_calculations
-- and risk_inputs - editing a saved assessment in place needs UPDATE too,
-- otherwise it's silently rejected by RLS regardless of what the API does.

CREATE POLICY "Users can update their own risk calculations" ON public.risk_calculations
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update risk inputs for their own risk assessments" ON public.risk_inputs
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.risk_calculations rc
  WHERE ((rc.riskcalc_id = risk_inputs.riskcalc_id) AND (rc.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.risk_calculations rc
  WHERE ((rc.riskcalc_id = risk_inputs.riskcalc_id) AND (rc.user_id = auth.uid())))));

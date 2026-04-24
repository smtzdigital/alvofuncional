DROP POLICY IF EXISTS "anyone read active plans" ON public.plans;
CREATE POLICY "public read active plans"
ON public.plans
FOR SELECT
TO anon, authenticated
USING (is_active = true OR is_admin(auth.uid()));
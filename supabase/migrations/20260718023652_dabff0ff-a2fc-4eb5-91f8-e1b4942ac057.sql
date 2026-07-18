DROP POLICY IF EXISTS "Public lookup by short token" ON public.payment_links;
REVOKE SELECT ON public.payment_links FROM anon;
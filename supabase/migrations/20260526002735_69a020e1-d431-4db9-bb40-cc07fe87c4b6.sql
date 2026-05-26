
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS coming_soon_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.leads_interessados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  activity_level activity_level,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads_interessados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert lead"
ON public.leads_interessados
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(full_name)) BETWEEN 2 AND 120
  AND length(trim(phone)) BETWEEN 8 AND 30
);

CREATE POLICY "admin manage leads"
ON public.leads_interessados
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

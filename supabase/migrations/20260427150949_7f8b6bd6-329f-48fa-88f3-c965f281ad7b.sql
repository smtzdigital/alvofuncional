
CREATE TABLE public.app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  app_name TEXT NOT NULL DEFAULT 'Alvo Funcional',
  app_short_name TEXT NOT NULL DEFAULT 'Alvo Funcional',
  app_description TEXT NOT NULL DEFAULT 'Plataforma completa de academia: treinos, dieta, metas, ranking e gestão.',
  primary_color TEXT NOT NULL DEFAULT 'oklch(0.85 0.22 130)',
  primary_glow TEXT NOT NULL DEFAULT 'oklch(0.92 0.20 135)',
  accent_color TEXT NOT NULL DEFAULT 'oklch(0.70 0.20 30)',
  background_color TEXT NOT NULL DEFAULT 'oklch(0.18 0.02 260)',
  logo_url TEXT,
  logo_icon_url TEXT,
  favicon_url TEXT,
  pwa_icon_192_url TEXT,
  pwa_icon_512_url TEXT,
  pwa_theme_color TEXT NOT NULL DEFAULT '#0b0b0f',
  pwa_background_color TEXT NOT NULL DEFAULT '#0b0b0f',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = true)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read settings" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin manage settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER tg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "branding public read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'branding');

CREATE POLICY "branding admin insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND public.is_admin(auth.uid()));

CREATE POLICY "branding admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND public.is_admin(auth.uid()));

CREATE POLICY "branding admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND public.is_admin(auth.uid()));

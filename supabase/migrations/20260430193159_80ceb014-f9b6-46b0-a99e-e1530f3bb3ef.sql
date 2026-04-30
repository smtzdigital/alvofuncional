
CREATE TABLE public.equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage equipments" ON public.equipments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "auth read equipments" ON public.equipments FOR SELECT TO authenticated USING (true);

CREATE TRIGGER equipments_set_updated_at BEFORE UPDATE ON public.equipments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gif_url TEXT,
  instructions TEXT,
  muscles TEXT[] NOT NULL DEFAULT '{}',
  equipment_id UUID REFERENCES public.equipments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage exercises" ON public.exercises FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "auth read exercises" ON public.exercises FOR SELECT TO authenticated USING (true);

CREATE TRIGGER exercises_set_updated_at BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO storage.buckets (id, name, public) VALUES ('exercises', 'exercises', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "exercises bucket public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'exercises');
CREATE POLICY "exercises bucket admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exercises' AND public.is_admin(auth.uid()));
CREATE POLICY "exercises bucket admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'exercises' AND public.is_admin(auth.uid()));
CREATE POLICY "exercises bucket admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'exercises' AND public.is_admin(auth.uid()));

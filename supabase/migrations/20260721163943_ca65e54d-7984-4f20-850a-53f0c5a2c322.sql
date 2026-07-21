
-- Enum de estágios do funil
DO $$ BEGIN
  CREATE TYPE public.lead_stage AS ENUM ('novo','contato','experimental','negociacao','venda','perdido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agenda_event_type AS ENUM ('aula','experimental','contato','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.agenda_event_status AS ENUM ('agendado','concluido','cancelado','no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extensão da tabela leads_interessados
ALTER TABLE public.leads_interessados
  ADD COLUMN IF NOT EXISTS stage public.lead_stage NOT NULL DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS next_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Permitir professor gerenciar leads também
DROP POLICY IF EXISTS "staff manage leads" ON public.leads_interessados;
CREATE POLICY "staff manage leads" ON public.leads_interessados
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'professor'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'professor'));

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads_interessados;
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads_interessados
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Tabela de eventos da agenda
CREATE TABLE IF NOT EXISTS public.agenda_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads_interessados(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  type public.agenda_event_type NOT NULL DEFAULT 'aula',
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  status public.agenda_event_status NOT NULL DEFAULT 'agendado',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_events TO authenticated;
GRANT ALL ON public.agenda_events TO service_role;

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage agenda" ON public.agenda_events
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'professor'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'professor'));

CREATE INDEX IF NOT EXISTS idx_agenda_scheduled_at ON public.agenda_events(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_agenda_lead ON public.agenda_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_agenda_student ON public.agenda_events(student_id);

CREATE TRIGGER trg_agenda_updated_at BEFORE UPDATE ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

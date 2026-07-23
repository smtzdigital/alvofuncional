ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS series_id uuid;
CREATE INDEX IF NOT EXISTS agenda_events_series_id_idx ON public.agenda_events(series_id);
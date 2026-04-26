-- Add gender enum and assessment fields to profiles
DO $$ BEGIN
  CREATE TYPE public.gender AS ENUM ('masculino', 'feminino');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender public.gender,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS assessment_completed_at timestamptz;

-- Enums for assessment fields
DO $$ BEGIN
  CREATE TYPE public.fitness_goal AS ENUM ('emagrecimento','ganho_massa','condicionamento','reabilitacao','saude_geral','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.activity_level AS ENUM ('sedentario','iniciante','intermediario','avancado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sleep_quality AS ENUM ('boa','media','ruim');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stress_level AS ENUM ('baixo','medio','alto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.workout_preference AS ENUM ('curto_intenso','longo_moderado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.motivation_type AS ENUM ('estetica','saude','autoestima');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goal public.fitness_goal,
  ADD COLUMN IF NOT EXISTS goal_other text,
  ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2),
  ADD COLUMN IF NOT EXISTS height_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS health_conditions text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS health_details text,
  ADD COLUMN IF NOT EXISTS uses_medication boolean,
  ADD COLUMN IF NOT EXISTS medications text,
  ADD COLUMN IF NOT EXISTS activity_level public.activity_level,
  ADD COLUMN IF NOT EXISTS sleep_quality public.sleep_quality,
  ADD COLUMN IF NOT EXISTS stress_level public.stress_level,
  ADD COLUMN IF NOT EXISTS gives_up_easily boolean,
  ADD COLUMN IF NOT EXISTS workout_preference public.workout_preference,
  ADD COLUMN IF NOT EXISTS motivation public.motivation_type;
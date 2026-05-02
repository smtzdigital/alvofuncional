-- 1) Evolui workouts: adiciona audience, gender, muscle_group, level
DO $$ BEGIN
  CREATE TYPE public.workout_audience AS ENUM ('app','personal');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.workout_gender AS ENUM ('masculino','feminino','unissex');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.weekday AS ENUM ('seg','ter','qua','qui','sex','sab','dom');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS audience public.workout_audience NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS gender public.workout_gender NOT NULL DEFAULT 'unissex',
  ADD COLUMN IF NOT EXISTS muscle_group TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT;

-- 2) workout_exercises: exercícios dentro do treino
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL DEFAULT 0,
  sets INTEGER,
  reps TEXT,
  rest_seconds INTEGER,
  load_suggestion TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON public.workout_exercises(workout_id, position);

ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read workout_exercises" ON public.workout_exercises
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin manage workout_exercises" ON public.workout_exercises
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 3) student_workouts: plano semanal personalizado por aluno
CREATE TABLE IF NOT EXISTS public.student_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  weekday public.weekday,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_workouts_student ON public.student_workouts(student_id, weekday, position);

ALTER TABLE public.student_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_workouts view own" ON public.student_workouts
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR student_id = get_student_id(auth.uid()));

CREATE POLICY "admin manage student_workouts" ON public.student_workouts
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 4) weekly_workout_plans: divisão semanal genérica do app por gênero (Seg=A, Ter=B...)
CREATE TABLE IF NOT EXISTS public.weekly_workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gender public.workout_gender NOT NULL,
  weekday public.weekday NOT NULL,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_lookup ON public.weekly_workout_plans(gender, weekday, position);

ALTER TABLE public.weekly_workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read weekly plans" ON public.weekly_workout_plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin manage weekly plans" ON public.weekly_workout_plans
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
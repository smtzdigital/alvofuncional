ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS trial_period_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_duration_months integer NULL;
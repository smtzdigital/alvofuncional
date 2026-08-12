-- Secure config storage for the nightly recurring-billing job
CREATE TABLE IF NOT EXISTS public.cron_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.cron_config FROM anon, authenticated;
GRANT ALL ON public.cron_config TO service_role;
ALTER TABLE public.cron_config ENABLE ROW LEVEL SECURITY;

-- Reschedule the nightly job so it authenticates with the stored secret
SELECT cron.unschedule('financial-run-recurring-daily');
SELECT cron.schedule(
  'financial-run-recurring-daily',
  '0 3 * * *',
  $cronjob$
  SELECT net.http_post(
    url:='https://alvofuncional.lovable.app/api/public/financial-run-recurring',
    headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(SELECT value FROM public.cron_config WHERE key='cron_secret')),
    body:='{}'::jsonb
  );
  $cronjob$
);

-- Prevent students from awarding themselves points through goals
CREATE OR REPLACE FUNCTION public.tg_guard_goal_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'professor'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.points_reward := 0;
    NEW.status := COALESCE(NEW.status, 'ativa');
    IF NEW.status = 'concluida' THEN
      NEW.status := 'ativa';
    END IF;
    NEW.completed_at := NULL;
  ELSE
    NEW.points_reward := OLD.points_reward;
  END IF;

  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS trg_guard_goal_points ON public.goals;
CREATE TRIGGER trg_guard_goal_points
BEFORE INSERT OR UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.tg_guard_goal_points();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'financeiro' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'financeiro';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'recepcao' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'recepcao';
  END IF;
END $$;

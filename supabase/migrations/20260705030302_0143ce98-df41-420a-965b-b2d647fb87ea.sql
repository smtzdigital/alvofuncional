-- ============================================================
-- Payments (Stone/Pagar.me) — schema, RLS, GRANTs
-- ============================================================

-- 1) Extend existing tables ---------------------------------------------------
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS stone_plan_id text,
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'month',
  ADD COLUMN IF NOT EXISTS billing_interval_count int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installments int NOT NULL DEFAULT 1;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS stone_customer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS students_stone_customer_id_key
  ON public.students(stone_customer_id) WHERE stone_customer_id IS NOT NULL;

-- 2) payment_cards ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  stone_card_id text NOT NULL,
  brand text,
  last4 text,
  holder_name text,
  exp_month int,
  exp_year int,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, stone_card_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_cards TO authenticated;
GRANT ALL ON public.payment_cards TO service_role;
ALTER TABLE public.payment_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all cards"
  ON public.payment_cards FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Students view own cards"
  ON public.payment_cards FOR SELECT TO authenticated
  USING (student_id = public.get_student_id(auth.uid()));

-- 3) subscriptions ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  stone_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  amount numeric(12,2) NOT NULL,
  next_billing_date timestamptz,
  current_card_id uuid REFERENCES public.payment_cards(id) ON DELETE SET NULL,
  canceled_at timestamptz,
  cancel_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_student_idx ON public.subscriptions(student_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all subscriptions"
  ON public.subscriptions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Students view own subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (student_id = public.get_student_id(auth.uid()));

-- 4) payment_links ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stone_payment_link_id text,
  short_token text NOT NULL UNIQUE,
  url text NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_links_student_idx ON public.payment_links(student_id);
CREATE INDEX IF NOT EXISTS payment_links_status_idx ON public.payment_links(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_links TO authenticated;
GRANT SELECT ON public.payment_links TO anon; -- public page lookup by short_token
GRANT ALL ON public.payment_links TO service_role;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all payment links"
  ON public.payment_links FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Students view own payment links"
  ON public.payment_links FOR SELECT TO authenticated
  USING (student_id = public.get_student_id(auth.uid()));

CREATE POLICY "Public lookup by short token"
  ON public.payment_links FOR SELECT TO anon
  USING (true); -- token is unguessable; app queries by short_token

-- 5) payment_charges ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  payment_link_id uuid REFERENCES public.payment_links(id) ON DELETE SET NULL,
  stone_charge_id text UNIQUE,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  method text,
  failure_reason text,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_charges_student_idx ON public.payment_charges(student_id);
CREATE INDEX IF NOT EXISTS payment_charges_status_idx ON public.payment_charges(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_charges TO authenticated;
GRANT ALL ON public.payment_charges TO service_role;
ALTER TABLE public.payment_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all charges"
  ON public.payment_charges FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Students view own charges"
  ON public.payment_charges FOR SELECT TO authenticated
  USING (student_id = public.get_student_id(auth.uid()));

-- 6) webhook_events -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'stone',
  external_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received',
  error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS webhook_events_type_idx ON public.webhook_events(event_type);

GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view webhook events"
  ON public.webhook_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 7) payment_audit_logs -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL,
  request_summary jsonb,
  response_summary jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_audit_logs_action_idx ON public.payment_audit_logs(action);
CREATE INDEX IF NOT EXISTS payment_audit_logs_created_idx ON public.payment_audit_logs(created_at DESC);

GRANT SELECT ON public.payment_audit_logs TO authenticated;
GRANT ALL ON public.payment_audit_logs TO service_role;
ALTER TABLE public.payment_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit logs"
  ON public.payment_audit_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 8) updated_at triggers ------------------------------------------------------
DO $$ BEGIN
  CREATE TRIGGER tg_payment_cards_updated_at BEFORE UPDATE ON public.payment_cards
    FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tg_payment_links_updated_at BEFORE UPDATE ON public.payment_links
    FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tg_payment_charges_updated_at BEFORE UPDATE ON public.payment_charges
    FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

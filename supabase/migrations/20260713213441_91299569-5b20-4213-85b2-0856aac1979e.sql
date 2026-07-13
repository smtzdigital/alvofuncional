CREATE TABLE IF NOT EXISTS public.payment_gateway_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  provider text NOT NULL DEFAULT 'stone',
  environment text NOT NULL DEFAULT 'sandbox',
  secret_key text,
  public_key text,
  webhook_user text,
  webhook_password text,
  enabled boolean NOT NULL DEFAULT false,
  whatsapp_template text NOT NULL DEFAULT 'Olá, {{nome}}! Segue o link para concluir sua matrícula.
Plano: {{plano}} — Valor: {{valor}}
{{payment_url}}
Após o pagamento sua matrícula será ativada automaticamente.',
  link_expires_days int NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.payment_gateway_config (id) VALUES (true) ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON public.payment_gateway_config TO authenticated;
GRANT ALL ON public.payment_gateway_config TO service_role;

ALTER TABLE public.payment_gateway_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payment gateway config"
  ON public.payment_gateway_config FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DO $$ BEGIN
  CREATE TRIGGER tg_payment_gateway_config_updated_at
    BEFORE UPDATE ON public.payment_gateway_config
    FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
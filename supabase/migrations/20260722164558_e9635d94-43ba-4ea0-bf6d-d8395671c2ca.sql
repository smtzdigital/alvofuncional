
-- Helper
CREATE OR REPLACE FUNCTION public.can_manage_finance(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role) OR public.has_role(_user_id, 'financeiro'::public.app_role)
$$;
REVOKE ALL ON FUNCTION public.can_manage_finance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_finance(uuid) TO authenticated, service_role;

-- Tables
CREATE TABLE IF NOT EXISTS public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('receita','despesa')),
  color text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT ALL ON public.financial_categories TO service_role;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin cat read" ON public.financial_categories FOR SELECT TO authenticated USING (public.can_manage_finance(auth.uid()) OR public.has_role(auth.uid(),'recepcao'::public.app_role));
CREATE POLICY "fin cat write" ON public.financial_categories FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid())) WITH CHECK (public.can_manage_finance(auth.uid()));
CREATE TRIGGER trg_updated_at_fin_cat BEFORE UPDATE ON public.financial_categories FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.financial_cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_cost_centers TO authenticated;
GRANT ALL ON public.financial_cost_centers TO service_role;
ALTER TABLE public.financial_cost_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin cc read" ON public.financial_cost_centers FOR SELECT TO authenticated USING (public.can_manage_finance(auth.uid()) OR public.has_role(auth.uid(),'recepcao'::public.app_role));
CREATE POLICY "fin cc write" ON public.financial_cost_centers FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid())) WITH CHECK (public.can_manage_finance(auth.uid()));
CREATE TRIGGER trg_updated_at_fin_cc BEFORE UPDATE ON public.financial_cost_centers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('caixa','banco','digital')),
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_accounts TO authenticated;
GRANT ALL ON public.financial_accounts TO service_role;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin acc read" ON public.financial_accounts FOR SELECT TO authenticated USING (public.can_manage_finance(auth.uid()) OR public.has_role(auth.uid(),'recepcao'::public.app_role));
CREATE POLICY "fin acc write" ON public.financial_accounts FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid())) WITH CHECK (public.can_manage_finance(auth.uid()));
CREATE TRIGGER trg_updated_at_fin_acc BEFORE UPDATE ON public.financial_accounts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.financial_recurring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('in','out')),
  template jsonb NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('mensal','semanal','anual','trimestral','semestral','custom')),
  interval_count int NOT NULL DEFAULT 1,
  day_rule jsonb,
  start_date date NOT NULL,
  end_date date,
  next_run_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_recurring TO authenticated;
GRANT ALL ON public.financial_recurring TO service_role;
ALTER TABLE public.financial_recurring ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin rec all" ON public.financial_recurring FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid())) WITH CHECK (public.can_manage_finance(auth.uid()));
CREATE TRIGGER trg_updated_at_fin_rec BEFORE UPDATE ON public.financial_recurring FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('in','out')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago','pendente','vencido','cancelado','estornado')),
  description text NOT NULL,
  category_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  cost_center_id uuid REFERENCES public.financial_cost_centers(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  supplier text,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  gross_amount numeric(14,2) NOT NULL,
  fees numeric(14,2) NOT NULL DEFAULT 0,
  net_amount numeric(14,2) GENERATED ALWAYS AS (gross_amount - fees) STORED,
  due_date date,
  paid_at timestamptz,
  payment_method text CHECK (payment_method IN ('pix','boleto','credit_card','dinheiro','transferencia','outro')),
  origin text NOT NULL DEFAULT 'manual' CHECK (origin IN ('pagarme','manual','recorrente','sistema')),
  source_type text,
  source_id text,
  notes text,
  attachment_url text,
  tags text[],
  recurring_id uuid REFERENCES public.financial_recurring(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_tx_source ON public.financial_transactions (source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_fin_tx_dsd ON public.financial_transactions (direction, status, due_date);
CREATE INDEX IF NOT EXISTS ix_fin_tx_cat ON public.financial_transactions (category_id);
CREATE INDEX IF NOT EXISTS ix_fin_tx_acc ON public.financial_transactions (account_id);
CREATE INDEX IF NOT EXISTS ix_fin_tx_stu ON public.financial_transactions (student_id);
CREATE INDEX IF NOT EXISTS ix_fin_tx_paid ON public.financial_transactions (paid_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;
GRANT ALL ON public.financial_transactions TO service_role;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin tx read" ON public.financial_transactions FOR SELECT TO authenticated USING (public.can_manage_finance(auth.uid()));
CREATE POLICY "fin tx write" ON public.financial_transactions FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid())) WITH CHECK (public.can_manage_finance(auth.uid()));
CREATE POLICY "recep insert desp" ON public.financial_transactions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'recepcao'::public.app_role) AND direction = 'out');
CREATE POLICY "recep read own" ON public.financial_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'recepcao'::public.app_role) AND created_by = auth.uid());
CREATE TRIGGER trg_updated_at_fin_tx BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.financial_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  mime text,
  size int,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_attachments TO authenticated;
GRANT ALL ON public.financial_attachments TO service_role;
ALTER TABLE public.financial_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin att all" ON public.financial_attachments FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid())) WITH CHECK (public.can_manage_finance(auth.uid()));

CREATE TABLE IF NOT EXISTS public.financial_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id uuid NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  to_account_id uuid NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL,
  date date NOT NULL DEFAULT current_date,
  notes text,
  out_tx_id uuid REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  in_tx_id uuid REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transfers TO authenticated;
GRANT ALL ON public.financial_transfers TO service_role;
ALTER TABLE public.financial_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin tf all" ON public.financial_transfers FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid())) WITH CHECK (public.can_manage_finance(auth.uid()));
CREATE TRIGGER trg_updated_at_fin_tf BEFORE UPDATE ON public.financial_transfers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.financial_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.financial_categories(id) ON DELETE CASCADE,
  month date NOT NULL,
  amount_limit numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_budgets TO authenticated;
GRANT ALL ON public.financial_budgets TO service_role;
ALTER TABLE public.financial_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin bg all" ON public.financial_budgets FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid())) WITH CHECK (public.can_manage_finance(auth.uid()));
CREATE TRIGGER trg_updated_at_fin_bg BEFORE UPDATE ON public.financial_budgets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.financial_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  message text NOT NULL,
  transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_notifications TO authenticated;
GRANT ALL ON public.financial_notifications TO service_role;
ALTER TABLE public.financial_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin notif all" ON public.financial_notifications FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid())) WITH CHECK (public.can_manage_finance(auth.uid()));

-- Seeds
INSERT INTO public.financial_categories (name, kind, sort_order) VALUES
  ('Mensalidade','receita',1),('Personal','receita',2),('Produto','receita',3),('Avaliação','receita',4),('Outra receita','receita',99),
  ('Aluguel','despesa',1),('Água','despesa',2),('Energia','despesa',3),('Internet','despesa',4),('Telefone','despesa',5),
  ('Marketing','despesa',6),('Folha','despesa',7),('Pró-labore','despesa',8),('Impostos','despesa',9),('Contabilidade','despesa',10),
  ('Equipamentos','despesa',11),('Produtos limpeza','despesa',12),('Materiais','despesa',13),('Software','despesa',14),
  ('Seguros','despesa',15),('Manutenção','despesa',16),('Outros','despesa',99)
ON CONFLICT (name, kind) DO NOTHING;

INSERT INTO public.financial_cost_centers (name) VALUES
  ('Academia'),('Marketing'),('Operacional'),('Administrativo'),('Equipamentos'),('Eventos'),('Loja')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.financial_accounts (name, type, opening_balance) VALUES
  ('Caixa Principal','caixa',0)
ON CONFLICT (name) DO NOTHING;

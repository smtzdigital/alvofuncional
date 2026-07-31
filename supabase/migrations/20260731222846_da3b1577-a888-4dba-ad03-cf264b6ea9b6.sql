ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'credit_card',
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS cycles integer;

DROP INDEX IF EXISTS public.financial_transactions_source_uniq;
CREATE UNIQUE INDEX financial_transactions_source_uniq
  ON public.financial_transactions (source_type, source_id);

CREATE OR REPLACE FUNCTION public.map_payment_method_to_financial(m text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE m
    WHEN 'pix' THEN 'pix'
    WHEN 'dinheiro' THEN 'cash'
    WHEN 'cartao' THEN 'credit_card'
    WHEN 'credit_card' THEN 'credit_card'
    WHEN 'transferencia' THEN 'transfer'
    WHEN 'boleto' THEN 'boleto'
    ELSE 'other' END
$$;

CREATE OR REPLACE FUNCTION public.sync_payment_income()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  SELECT p.full_name INTO v_name
  FROM public.students s JOIN public.profiles p ON p.id = s.user_id
  WHERE s.id = NEW.student_id;

  IF NEW.status = 'pago' THEN
    INSERT INTO public.financial_transactions
      (direction, description, gross_amount, status, paid_at, due_date,
       payment_method, student_id, origin, source_type, source_id)
    VALUES
      ('income', 'Mensalidade - ' || COALESCE(v_name, 'Aluno'), NEW.amount, 'paid',
       COALESCE(NEW.paid_at, now()), NEW.due_date,
       public.map_payment_method_to_financial(NEW.method::text), NEW.student_id,
       'manual', 'payment', NEW.id)
    ON CONFLICT (source_type, source_id) DO UPDATE
      SET status = 'paid', gross_amount = EXCLUDED.gross_amount,
          paid_at = EXCLUDED.paid_at, payment_method = EXCLUDED.payment_method, updated_at = now();
  ELSIF NEW.status = 'cancelado' THEN
    UPDATE public.financial_transactions SET status = 'canceled', updated_at = now()
    WHERE source_type = 'payment' AND source_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_payment_income ON public.payments;
CREATE TRIGGER trg_sync_payment_income
AFTER INSERT OR UPDATE OF status, amount, paid_at, method ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_payment_income();

CREATE OR REPLACE FUNCTION public.sync_charge_income()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  SELECT p.full_name INTO v_name
  FROM public.students s JOIN public.profiles p ON p.id = s.user_id
  WHERE s.id = NEW.student_id;

  INSERT INTO public.financial_transactions
    (direction, description, gross_amount, status, paid_at,
     payment_method, student_id, origin, source_type, source_id)
  VALUES
    ('income', 'Assinatura (cartão) - ' || COALESCE(v_name, 'Aluno'), NEW.amount, 'paid',
     COALESCE(NEW.paid_at, now()), 'credit_card', NEW.student_id, 'pagarme', 'payment_charge', NEW.id)
  ON CONFLICT (source_type, source_id) DO UPDATE
    SET status = 'paid', gross_amount = EXCLUDED.gross_amount,
        paid_at = EXCLUDED.paid_at, updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_charge_income ON public.payment_charges;
CREATE TRIGGER trg_sync_charge_income
AFTER INSERT OR UPDATE OF status, amount, paid_at ON public.payment_charges
FOR EACH ROW EXECUTE FUNCTION public.sync_charge_income();

INSERT INTO public.financial_transactions
  (direction, description, gross_amount, status, paid_at, due_date,
   payment_method, student_id, origin, source_type, source_id)
SELECT 'income', 'Mensalidade - ' || COALESCE(pr.full_name, 'Aluno'), pay.amount, 'paid',
       COALESCE(pay.paid_at, pay.due_date::timestamptz), pay.due_date,
       public.map_payment_method_to_financial(pay.method::text), pay.student_id,
       'manual', 'payment', pay.id
FROM public.payments pay
LEFT JOIN public.students s ON s.id = pay.student_id
LEFT JOIN public.profiles pr ON pr.id = s.user_id
WHERE pay.status = 'pago'
ON CONFLICT (source_type, source_id) DO NOTHING;
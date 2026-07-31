
CREATE OR REPLACE FUNCTION public.sync_payment_income()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_name text; v_cat uuid;
BEGIN
  SELECT p.full_name INTO v_name
  FROM public.students s JOIN public.profiles p ON p.id = s.user_id
  WHERE s.id = NEW.student_id;

  SELECT id INTO v_cat FROM public.financial_categories
  WHERE name = 'Mensalidade' AND kind = 'income' LIMIT 1;

  IF NEW.status = 'pago' THEN
    INSERT INTO public.financial_transactions
      (direction, description, gross_amount, status, paid_at, due_date,
       payment_method, student_id, origin, source_type, source_id, category_id)
    VALUES
      ('income', 'Mensalidade - ' || COALESCE(v_name, 'Aluno'), NEW.amount, 'paid',
       COALESCE(NEW.paid_at, now()), NEW.due_date,
       public.map_payment_method_to_financial(NEW.method::text), NEW.student_id,
       'manual', 'payment', NEW.id, v_cat)
    ON CONFLICT (source_type, source_id) DO UPDATE
      SET status = 'paid', gross_amount = EXCLUDED.gross_amount,
          paid_at = EXCLUDED.paid_at, payment_method = EXCLUDED.payment_method,
          category_id = COALESCE(public.financial_transactions.category_id, EXCLUDED.category_id),
          updated_at = now();
  ELSIF NEW.status = 'cancelado' THEN
    UPDATE public.financial_transactions SET status = 'canceled', updated_at = now()
    WHERE source_type = 'payment' AND source_id = NEW.id;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.sync_charge_income()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_name text; v_cat uuid;
BEGIN
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  SELECT p.full_name INTO v_name
  FROM public.students s JOIN public.profiles p ON p.id = s.user_id
  WHERE s.id = NEW.student_id;

  SELECT id INTO v_cat FROM public.financial_categories
  WHERE name = 'Mensalidade' AND kind = 'income' LIMIT 1;

  INSERT INTO public.financial_transactions
    (direction, description, gross_amount, status, paid_at,
     payment_method, student_id, origin, source_type, source_id, category_id)
  VALUES
    ('income', 'Assinatura (cartão) - ' || COALESCE(v_name, 'Aluno'), NEW.amount, 'paid',
     COALESCE(NEW.paid_at, now()), 'credit_card', NEW.student_id, 'pagarme', 'payment_charge', NEW.id, v_cat)
  ON CONFLICT (source_type, source_id) DO UPDATE
    SET status = 'paid', gross_amount = EXCLUDED.gross_amount,
        paid_at = EXCLUDED.paid_at,
        category_id = COALESCE(public.financial_transactions.category_id, EXCLUDED.category_id),
        updated_at = now();
  RETURN NEW;
END $function$;

UPDATE public.financial_transactions ft
SET category_id = (SELECT id FROM public.financial_categories WHERE name='Mensalidade' AND kind='income' LIMIT 1)
WHERE ft.category_id IS NULL
  AND ft.direction = 'income'
  AND ft.source_type IN ('payment','payment_charge');

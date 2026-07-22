
-- Align financial_* constraints and existing data with the app's English vocabulary

-- financial_categories.kind: receita/despesa -> income/expense
ALTER TABLE public.financial_categories DROP CONSTRAINT IF EXISTS financial_categories_kind_check;
UPDATE public.financial_categories SET kind = 'income'  WHERE kind = 'receita';
UPDATE public.financial_categories SET kind = 'expense' WHERE kind = 'despesa';
ALTER TABLE public.financial_categories ADD CONSTRAINT financial_categories_kind_check
  CHECK (kind IN ('income','expense'));

-- financial_accounts.type: caixa/banco/digital -> cash/bank/gateway/wallet
ALTER TABLE public.financial_accounts DROP CONSTRAINT IF EXISTS financial_accounts_type_check;
UPDATE public.financial_accounts SET type = 'cash' WHERE type = 'caixa';
UPDATE public.financial_accounts SET type = 'bank' WHERE type = 'banco';
UPDATE public.financial_accounts SET type = 'wallet' WHERE type = 'digital';
ALTER TABLE public.financial_accounts ADD CONSTRAINT financial_accounts_type_check
  CHECK (type IN ('cash','bank','gateway','wallet'));

-- financial_recurring.direction: in/out -> income/expense
ALTER TABLE public.financial_recurring DROP CONSTRAINT IF EXISTS financial_recurring_direction_check;
UPDATE public.financial_recurring SET direction = 'income'  WHERE direction = 'in';
UPDATE public.financial_recurring SET direction = 'expense' WHERE direction = 'out';
ALTER TABLE public.financial_recurring ADD CONSTRAINT financial_recurring_direction_check
  CHECK (direction IN ('income','expense'));

-- financial_transactions.direction: in/out -> income/expense
ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_direction_check;
UPDATE public.financial_transactions SET direction = 'income'  WHERE direction = 'in';
UPDATE public.financial_transactions SET direction = 'expense' WHERE direction = 'out';
ALTER TABLE public.financial_transactions ADD CONSTRAINT financial_transactions_direction_check
  CHECK (direction IN ('income','expense'));

-- financial_transactions.status: pago/pendente/vencido/cancelado/estornado -> paid/pending/overdue/canceled
ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_status_check;
UPDATE public.financial_transactions SET status = 'paid'     WHERE status = 'pago';
UPDATE public.financial_transactions SET status = 'pending'  WHERE status = 'pendente';
UPDATE public.financial_transactions SET status = 'overdue'  WHERE status = 'vencido';
UPDATE public.financial_transactions SET status = 'canceled' WHERE status IN ('cancelado','estornado');
ALTER TABLE public.financial_transactions ADD CONSTRAINT financial_transactions_status_check
  CHECK (status IN ('paid','pending','overdue','canceled'));

-- financial_transactions.payment_method: allow app values
ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_payment_method_check;
UPDATE public.financial_transactions SET payment_method = 'cash'     WHERE payment_method = 'dinheiro';
UPDATE public.financial_transactions SET payment_method = 'transfer' WHERE payment_method = 'transferencia';
UPDATE public.financial_transactions SET payment_method = 'other'    WHERE payment_method = 'outro';
ALTER TABLE public.financial_transactions ADD CONSTRAINT financial_transactions_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('pix','credit_card','debit_card','boleto','cash','transfer','other'));

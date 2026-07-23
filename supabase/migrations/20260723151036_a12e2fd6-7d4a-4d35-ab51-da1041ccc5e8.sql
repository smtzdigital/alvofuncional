ALTER TABLE public.financial_transactions DROP CONSTRAINT financial_transactions_origin_check;
ALTER TABLE public.financial_transactions ADD CONSTRAINT financial_transactions_origin_check CHECK (origin = ANY (ARRAY['pagarme','manual','recurring','system']));
UPDATE public.financial_transactions SET origin='recurring' WHERE origin='recorrente';
UPDATE public.financial_transactions SET origin='system' WHERE origin='sistema';
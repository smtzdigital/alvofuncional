ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_origin_check;
ALTER TABLE public.financial_transactions ADD CONSTRAINT financial_transactions_origin_check CHECK (origin = ANY (ARRAY['pagarme'::text,'manual'::text,'recurring'::text,'system'::text,'transfer'::text]));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transfers TO authenticated;
GRANT ALL ON public.financial_transfers TO service_role;
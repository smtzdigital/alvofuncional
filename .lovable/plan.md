
## Objetivo
Expor no admin e enviar à Pagar.me os campos:
- **Plano**: `interval_count`, `trial_period_days`, duração total (4/8/12 meses ou indeterminado)
- **Assinatura**: `payment_methods` (crédito/boleto/pix) e `start_at`

## 1. Banco (migração)
Adicionar em `public.plans`:
- `trial_period_days int not null default 0`
- `plan_duration_months int null` (4, 8, 12 ou null = sem prazo)

`billing_interval` e `billing_interval_count` já existem na tabela — apenas passarão a ser editáveis pela UI.

## 2. Cadastro de planos (`src/routes/admin.planos.tsx`)
Adicionar controles no formulário:
- **Intervalo de cobrança**: select `month` / `week` / `year` (`billing_interval`)
- **A cada N**: input numérico (`billing_interval_count`)
- **Dias de teste grátis**: input numérico (`trial_period_days`)
- **Duração total**: select `Sem prazo` / `4 meses` / `8 meses` / `12 meses` (`plan_duration_months`)

Incluir os campos no payload salvo e no card de exibição.

## 3. Sync com Pagar.me (`src/lib/payments/stone.server.ts` + `admin.plans-sync.ts`)
- Estender `PlanSyncInput` com `trialPeriodDays` e `minimumPrice`/`quantity` conforme aplicável.
- No `createPlan`/`updatePlan`, enviar `trial_period_days` no body Pagar.me.
- A "duração em meses" é usada apenas no lado da aplicação para calcular `plan_expires_at` do aluno; a Pagar.me trata como recorrência aberta e o cancelamento automático ocorre quando o ciclo terminar (o cron/webhook já existente encerra o plano localmente).

## 4. Contratação de assinatura
### UI (`src/routes/admin.assinaturas.tsx`)
No diálogo de nova assinatura adicionar:
- **Formas de pagamento aceitas** (checkboxes múltiplas): `credit_card`, `boleto`, `pix`
- **Início da cobrança** (`start_at`): input date opcional (default = hoje)

Ajustar validação: se apenas `credit_card`, exige token; se boleto/pix, o token do cartão fica opcional.

### API (`src/routes/api/admin.payments-subscription.ts`)
- Aceitar `payment_methods: string[]` e `start_at?: string (ISO)` no body.
- Repassar ao gateway.

### Gateway (`stone.server.ts`)
Estender `createSubscription`:
- Novo argumento `paymentMethods: string[]` (default `["credit_card"]`) e `startAt?: string`.
- No corpo enviado à Pagar.me:
  - Quando um único método → `payment_method` string (compat atual).
  - Quando vários → enviar `payment_method` = primário e registrar demais como opções aceitas no `metadata` (Pagar.me exige uma forma primária por assinatura; boleto/pix ficam disponíveis via cobranças avulsas — documentar no toast).
  - `start_at` (ISO) quando informado.

## 5. Regeneração de tipos
Após a migração, os tipos Supabase serão regenerados automaticamente; nenhum arquivo manual precisa ser tocado além dos citados.

## Fora de escopo
- Alterar checkout público (`pagar.$token`) — links de pagamento continuam credit_card apenas.
- Fluxo de cancelamento automático ao fim da duração — reaproveita cron/webhook existente.

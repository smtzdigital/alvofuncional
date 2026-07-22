
# Módulo Financeiro — ALVO Funcional

Novo módulo no painel admin com dashboard, receitas (automáticas via Pagar.me + manuais), despesas com recorrência, fluxo de caixa, contas a pagar/receber, indicadores e relatórios. Segue o padrão visual atual (dark, verde da marca, cards arredondados).

## 1. Banco de dados (migration única)

Novas tabelas em `public`, todas com `id`, `created_at`, `updated_at`, RLS + GRANTs (authenticated + service_role), políticas via `is_admin(auth.uid())` para escrita e leitura restrita a admin/financeiro:

- `financial_categories` — `name`, `kind` ('receita' | 'despesa'), `color`, `is_active`, `sort_order`.
- `financial_cost_centers` — `name`, `is_active`.
- `financial_accounts` — contas bancárias/caixa: `name`, `type` ('caixa'|'banco'|'digital'), `opening_balance`, `is_active`.
- `financial_transactions` — núcleo do módulo:
  - `direction` ('in'|'out'), `status` ('pago'|'pendente'|'vencido'|'cancelado'|'estornado'),
  - `description`, `category_id`, `cost_center_id`, `account_id`, `supplier` (texto), `student_id` (nullable),
  - `gross_amount`, `fees`, `net_amount` (generated), `due_date`, `paid_at`,
  - `payment_method` ('pix'|'boleto'|'credit_card'|'dinheiro'|'transferencia'|'outro'),
  - `origin` ('pagarme'|'manual'|'recorrente'|'sistema'), `source_type`, `source_id` (para dedupe com `payments`/`payment_charges`),
  - `notes`, `attachment_url`, `tags text[]`, `recurring_id` (nullable).
- `financial_recurring` — regras de recorrência: `direction`, `template` (jsonb com categoria/valor/centro/conta/descrição), `frequency` ('mensal'|'semanal'|'anual'|'trimestral'|'semestral'|'custom'), `interval_count`, `day_rule` (jsonb: dia fixo, dia útil, dia da semana), `start_date`, `end_date`, `next_run_date`, `is_active`.
- `financial_attachments` — `transaction_id`, `file_url`, `mime`, `size`, `uploaded_by`.
- `financial_transfers` — `from_account_id`, `to_account_id`, `amount`, `date`, `notes` (cria 2 transactions vinculadas).
- `financial_budgets` — `category_id`, `month` (date), `amount_limit`.

Índices em `(direction, status, due_date)`, `(category_id)`, `(account_id)`, `(source_type, source_id)` UNIQUE (para dedupe Pagar.me).

Trigger `tg_set_updated_at` em todas.

Seeds iniciais de categorias (Aluguel, Água, Energia, Internet, Marketing, Folha, Impostos, Equipamentos, Outros; Mensalidade, Personal, Produto, Avaliação, Outra receita) e centros de custo (Academia, Marketing, Operacional, Administrativo, Equipamentos, Eventos, Loja).

## 2. Integração automática Pagar.me / sistema

- No webhook `src/routes/api/public.webhooks-stone.ts`: ao marcar charge como `paid`, upsert em `financial_transactions` usando `source_type='pagarme_charge'` + `source_id=charge.id` (UNIQUE evita duplicata). Categoria "Mensalidade" (ou mapeada), `origin='pagarme'`, `fees` calculado (se disponível), `payment_method` do charge.
- Estornos/cancelamentos: atualizar status para `estornado`/`cancelado`.
- Backfill: server fn `financial-backfill` que varre `payments` e `payment_charges` existentes e cria transactions faltantes.

Receitas Pagar.me nunca são criadas manualmente — form manual bloqueia origem `pagarme`.

## 3. Recorrências

Server route `src/routes/api/public.financial-run-recurring.ts` (protegido por `apikey`), agendado via `pg_cron` diário às 03:00: para cada regra ativa com `next_run_date <= today`, cria a próxima `financial_transaction` pendente e avança `next_run_date` segundo `frequency`/`day_rule`.

## 4. Rotas admin (novas)

Menu novo **"Financeiro"** na sidebar (`src/routes/admin.tsx`) com subitens:

- `/admin/financeiro` — Dashboard: cards (Receita mês, Despesa mês, Lucro, Saldo, Inadimplência, Vencendo hoje, Próximos recebimentos 7/30d) + 3 gráficos (linha 12m Receitas×Despesas, pizza despesas por categoria, barras receitas por tipo) usando `recharts`.
- `/admin/financeiro/receitas` — lista com filtros (período, categoria, origem, forma, aluno), botão "Nova receita manual" (bloqueia origem pagarme).
- `/admin/financeiro/despesas` — CRUD completo, upload de anexo (bucket `financial` novo), marcar recorrente.
- `/admin/financeiro/fluxo-caixa` — extrato: linhas verde/vermelho com saldo acumulado, filtros período/conta/categoria/status.
- `/admin/financeiro/contas-pagar` — agrupado (Vencidas, Hoje, 7d, 30d) + botão "Registrar pagamento".
- `/admin/financeiro/contas-receber` — pendentes de alunos, botão "Enviar cobrança" (reusa link Pagar.me existente).
- `/admin/financeiro/categorias` — CRUD categorias, centros de custo, contas bancárias (tabs).
- `/admin/financeiro/recorrentes` — CRUD regras de recorrência.
- `/admin/financeiro/relatorios` — exportar PDF/Excel/CSV (Fluxo, DRE simplificado, Receitas por modalidade, Despesas por categoria, Inadimplência).

Todos usam TanStack Query + server functions (`*.functions.ts`) com `requireSupabaseAuth` + verificação `is_admin`. Escritas sensíveis (webhook, backfill, recorrência) via server routes com `supabaseAdmin` importado dentro do handler.

## 5. Indicadores

Server fn `getFinancialKpis({ from, to })` retorna: ticket médio, MRR (soma assinaturas ativas), ARR (MRR×12), lucro líquido, margem, break-even (despesas fixas ÷ ticket médio), inadimplência (valor + qtd), CAC (despesas marketing ÷ novos alunos período), LTV (ticket médio × meses médios), receita por modalidade/professor.

## 6. Permissões

- `admin` + novo role `financeiro`: acesso total.
- `professor`: apenas GET de receitas dos próprios alunos (server fn dedicada).
- `recepcao` (novo role): pode inserir despesas simples.

Adicionar `financeiro` e `recepcao` ao enum `app_role` na migration.

## 7. Notificações

Trigger diária (mesma cron das recorrências) que insere avisos em uma tabela `financial_notifications` (ou reusa toast + badge no menu): vencendo amanhã, vencidas, saldo negativo. UI mostra badge com contagem no item "Financeiro".

## 8. Detalhes técnicos

- Bucket storage `financial` (privado) para anexos; upload via server route admin.
- Reutiliza `StudentCombobox` para vincular receita a aluno.
- Exports: PDF via `jspdf` + `jspdf-autotable` (já usados em contrato); Excel via `xlsx`; CSV nativo.
- Dedupe: constraint UNIQUE `(source_type, source_id) WHERE source_id IS NOT NULL`.
- Cache de dashboard: `staleTime: 60s`.

## Ordem de implementação

1. Migration (tabelas, RLS, GRANTs, seeds, enum roles, bucket).
2. Integração webhook + backfill.
3. Rotas de CRUD (categorias, contas, centros → despesas → receitas manuais).
4. Recorrências + cron.
5. Dashboard + gráficos + KPIs.
6. Fluxo de caixa, contas a pagar/receber.
7. Relatórios/exportações.
8. Notificações + permissões refinadas.

Confirma que posso seguir com este escopo? Alguma prioridade para entregar primeiro (ex: dashboard + despesas antes de relatórios)?

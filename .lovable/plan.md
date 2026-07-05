# Integração Stone/Pagar.me (Core API v5) — Entrega Completa

## Pré-requisitos (você precisa providenciar)

Antes de qualquer código rodar em produção, você precisa:

1. Criar conta na Stone/Pagar.me em https://dashboard.pagar.me
2. Gerar **Secret Key de Sandbox** (`sk_test_...`) — usaremos primeiro
3. Depois, gerar Secret Key de Produção (`sk_...`)
4. Definir o **Webhook Secret** (senha HTTP Basic para validar webhooks)

Vou pedir esses valores via formulário seguro no momento certo. Enquanto não chegarem, o código fica pronto mas as chamadas reais só funcionam após você colar as chaves.

---

## Arquitetura

Camada de abstração `PaymentGateway` (interface) com implementação `StonePaymentGateway`. Toda a app usa só a interface — trocar de gateway no futuro não mexe em regra de negócio.

```text
Frontend (admin + aluno)
        │
        ▼
Server Functions (createServerFn)  ──► PaymentGateway (interface)
        │                                     │
        │                                     ▼
        │                             StonePaymentGateway
        │                                     │
        ▼                                     ▼
   Supabase (RLS)                    api.pagar.me/core/v5
        ▲
        │
Server Route pública /api/public/webhooks/stone
```

Nenhum código do frontend fala com a Stone diretamente. Só o servidor (que tem a Secret Key) faz isso.

---

## Estrutura de Arquivos

```text
src/
├── lib/
│   └── payments/
│       ├── gateway.interface.ts        # Interface PaymentGateway
│       ├── stone/
│       │   ├── stone.gateway.server.ts # Implementação Stone
│       │   ├── stone.client.server.ts  # HTTP client (Basic Auth, retry, idempotency)
│       │   ├── stone.dto.ts            # Tipos dos payloads Stone
│       │   └── stone.errors.ts         # Mapeamento de erros amigáveis
│       ├── payments.functions.ts       # Server functions (chamadas do frontend)
│       ├── payments.repository.server.ts # Acesso ao banco
│       └── logger.server.ts            # Log sanitizado (sem PAN/CVV/secret)
└── routes/
    ├── api/
    │   └── public/
    │       └── webhooks.stone.ts       # Endpoint de webhook (Basic Auth)
    ├── admin.pagamentos.tsx            # Reescrito: painel financeiro completo
    └── pagar.$token.tsx                # Página pública para o aluno pagar
```

---

## Banco de Dados (migração única)

Reutiliza `plans` acrescentando colunas Stone. Cria tabelas novas com RLS + GRANTs.

**Alterações em `plans`:**
- `stone_plan_id text` (id do plano espelhado na Stone, opcional)
- `billing_interval text default 'month'`
- `billing_interval_count int default 1`
- `installments int default 1`

**Alterações em `students`:**
- `stone_customer_id text unique`

**Novas tabelas:**

- `payment_cards` — cartões tokenizados (id, student_id, stone_card_id, brand, last4, holder_name, exp_month, exp_year, is_default)
- `subscriptions` — assinaturas (id, student_id, plan_id, stone_subscription_id, status, amount, next_billing_date, current_card_id, canceled_at, cancel_reason)
- `payment_links` — links de pagamento (id, student_id, plan_id, subscription_id nullable, stone_payment_link_id, short_token, url, amount, status, expires_at, paid_at)
- `payment_charges` — histórico de cobranças (id, student_id, subscription_id nullable, payment_link_id nullable, stone_charge_id, amount, status, method, failure_reason, paid_at, created_at)
- `webhook_events` — log auditável (id, provider, event_type, external_id, payload_hash, status, error, received_at) + índice unique em (provider, external_id) para idempotência
- `payment_audit_logs` — log de chamadas outbound (id, actor_user_id, action, request_summary, response_summary, error, created_at)

**RLS resumida (leia-se em português):**
- Admin vê e gerencia tudo.
- Aluno vê apenas seus próprios cartões, assinaturas, links e cobranças (via `students.user_id = auth.uid()`).
- `webhook_events` e `payment_audit_logs`: só service_role escreve; admin lê.
- Página pública de pagamento (`/pagar/:token`) usa server function pública que lê `payment_links` pelo `short_token` sem exigir login.

---

## Segredos (via `add_secret`)

Solicito num único formulário:
- `STONE_SECRET_KEY` (sandbox primeiro; troca depois)
- `STONE_WEBHOOK_BASIC_USER`
- `STONE_WEBHOOK_BASIC_PASSWORD`
- `STONE_ENVIRONMENT` (`sandbox` | `live`)

`STONE_API_URL` fica hardcoded (`https://api.pagar.me/core/v5`).

---

## Fluxos Implementados

### 1. Cadastro de cliente (customer) na Stone
Ao criar/editar aluno, se não houver `stone_customer_id`, cria via `POST /customers` (nome, email, documento, telefone) e persiste.

### 2. Tokenização de cartão (PCI-safe)
Formulário no admin (`admin.pagamentos`) e na página pública `/pagar/:token` usa **fetch client-side direto para `POST /core/v5/tokens?appId=<PUBLIC_KEY>`** com a **chave pública** da Stone (não a secret). O número do cartão nunca chega ao nosso servidor. Recebemos apenas o `card_token`, mandamos para a server function que cria o `card` vinculado ao customer e salva `brand/last4/exp_*`.

> Para isso vou pedir também a **Public Key** (`pk_test_...` / `pk_...`) como `VITE_STONE_PUBLIC_KEY` no `.env` — é pública, pode ir no bundle.

### 3. Assinatura recorrente (recepcionista digita o cartão)
Recepcionista → seleciona aluno → seleciona plano → tokeniza cartão no navegador → server function `createSubscription` cria (ou reusa) customer, cria card, cria `POST /subscriptions` (plan_id ou pricing_scheme inline, `payment_method=credit_card`, `interval=month`), persiste `subscriptions` e primeira `payment_charges`.

### 4. Link de pagamento (aluno paga no celular)
Server function `createPaymentLink` chama `POST /paymentlinks` com `amount`, `payment_settings` (credit_card, installments), `expires_in`, `metadata.student_id/plan_id`. Salva URL + `short_token` local. Retorna:
- URL da Stone
- URL curta interna `/pagar/:token` (opcional, com nossa marca)
- QR Code (gerado client-side com `qrcode.react`)

Botões no painel: **Copiar**, **Abrir**, **WhatsApp** (`https://wa.me/?text=...` com template configurado nas configurações), **E-mail** (template HTML enviado via Resend se já configurado; senão, `mailto:`), **Gerar novo link**, **Cancelar link**.

Ao confirmar pagamento via webhook `charge.paid` cujo `payment_link_id` bate: se o link tem `plan_id` recorrente, cria a `subscription` automaticamente reutilizando o cartão salvo. Ativa a matrícula (`students.is_active = true`, atualiza `plan_started_at`/`plan_expires_at`).

### 5. Alterar cartão da assinatura
Server function `updateSubscriptionCard` → tokeniza novo cartão → `PATCH /subscriptions/{id}/card` → atualiza `current_card_id`. Não cancela recorrência.

### 6. Cancelar assinatura
`cancelSubscription` → `DELETE /subscriptions/{id}` → marca `status='canceled'`, `canceled_at`, motivo. Não apaga histórico.

### 7. Webhook `/api/public/webhooks/stone`
- Valida **HTTP Basic Auth** (`STONE_WEBHOOK_BASIC_USER/PASSWORD`) — mecanismo oficial da Pagar.me.
- Deduplica pelo `id` do evento (unique em `webhook_events`).
- Trata: `charge.paid`, `charge.payment_failed`, `charge.refunded`, `subscription.created`, `subscription.updated`, `subscription.canceled`, `subscription.charges_created`, `order.paid` (usado como payment_link.paid quando o link vira order).
- Toda atualização é idempotente (upsert por `stone_charge_id` / `stone_subscription_id`).
- Retorna 200 mesmo em erro de negócio (com log) para evitar reentrega infinita; retorna 401 só em falha de auth.

---

## Interface (`/admin/pagamentos` reescrita)

Lista de alunos com colunas: nome, plano, status assinatura (badge), próxima cobrança, último pagamento, ações.

Ao clicar num aluno, abre painel lateral com:
- **Dados do aluno + plano atual**
- **Cartão salvo** (bandeira + `**** 1234`) + botão "Alterar cartão"
- **Assinatura**: status, `next_billing_date`, botão "Cancelar"
- **Botões de link**: Gerar link · Copiar · Abrir · QR · WhatsApp · E-mail
- **Histórico financeiro**: tabela de `payment_charges` + links gerados, com filtros

Ao criar nova matrícula (`admin.alunos`), acrescento seleção de forma: **Cobrar agora (cartão)** ou **Enviar link**.

## Interface pública `/pagar/:token`

Página sem login, mobile-first:
- Logo da academia (`app_settings`)
- Dados do aluno (nome), plano, valor, validade
- Formulário de cartão com tokenização
- Botão "Pagar R$ X,XX"
- Estado pós-pagamento (sucesso / falha)

---

## Templates

**WhatsApp** (configurável em `app_settings`, com placeholders):
```
Olá, {{nome}}!
Segue o link para concluir sua matrícula.
Plano: {{plano}} — Valor: {{valor}}
{{payment_url}}
Após o pagamento sua matrícula será ativada automaticamente.
```

**E-mail HTML** (arquivo `src/lib/payments/templates/payment-link.email.ts`) — logo, nome, plano, valor, botão "Realizar Pagamento", link alternativo, data de validade, disclaimer. Envio via Resend se `RESEND_API_KEY` existir; senão, retorna HTML para o admin copiar/usar `mailto:`.

---

## Tratamento de erros (mensagens amigáveis)

Mapa em `stone.errors.ts`:
- `card_declined` → "Cartão recusado pela operadora"
- `insufficient_funds` → "Saldo insuficiente"
- `expired_card` → "Cartão expirado"
- `invalid_card` → "Dados do cartão inválidos"
- `subscription_not_found` → "Assinatura não encontrada"
- `customer_not_found` → "Cliente não encontrado"
- `timeout` / `503` / `502` → "Serviço indisponível, tente novamente"
- `401` na Stone → "Configuração de pagamento inválida (contatar suporte)"
- Assinatura inválida no webhook → 401

Toast no frontend, log detalhado no servidor.

---

## Segurança / PCI

- HTTPS obrigatório (Lovable Cloud já garante).
- Nunca persistir PAN, CVV, expiração completa em texto — só `last4/brand/exp_month/exp_year`.
- Tokenização client-side com Public Key.
- Idempotência: `Idempotency-Key` header em todas as escritas na Stone (UUID gerado + hash do payload).
- Webhook: Basic Auth + dedupe por event id + rate-limit por IP (simples in-memory).
- Log sanitizado: campos `card_number`, `cvv`, `Authorization`, `password` são substituídos por `[REDACTED]` antes de gravar.
- RLS em todas as tabelas novas.

---

## Documentação gerada

Arquivo `docs/payments.md` com:
- Diagrama da arquitetura (ASCII)
- Fluxo de assinatura e de link (passo a passo)
- Lista de endpoints Stone usados + payloads
- Estrutura de tabelas
- Variáveis de ambiente (sandbox e produção)
- Como configurar webhook no dashboard da Pagar.me (URL, Basic Auth)
- Exemplos de payloads de webhook e resposta esperada

---

## Ordem de Execução

1. Migração SQL (todas as tabelas + RLS + GRANTs) — **requer sua aprovação**.
2. Solicitar segredos (`STONE_SECRET_KEY`, `STONE_WEBHOOK_BASIC_USER`, `STONE_WEBHOOK_BASIC_PASSWORD`, `STONE_ENVIRONMENT`) — **você preenche o formulário**.
3. Adicionar `VITE_STONE_PUBLIC_KEY` (você me passa no chat, é pública).
4. Camada de gateway (`interface + Stone impl + client HTTP + logger + errors`).
5. Server functions + repositório.
6. Webhook público.
7. Reescrita de `admin.pagamentos` + integração no cadastro de alunos.
8. Página pública `/pagar/:token`.
9. Templates WhatsApp/e-mail + configurações em `admin.configuracoes`.
10. `docs/payments.md`.

## Detalhes técnicos

- Stack: TanStack Start + `createServerFn` (nunca Edge Functions) — camada server acessa Stone via `fetch` nativo.
- Auth Stone: `Authorization: Basic base64(SECRET_KEY:)` (nota o `:` no final, padrão Pagar.me).
- Cliente HTTP com retry exponencial (3 tentativas) para 5xx/timeout, sem retry em 4xx.
- Server function protegida com `requireSupabaseAuth` + checagem `has_role(userId, 'admin')` em toda operação de escrita.
- Página pública de pagamento usa server function **sem** middleware de auth, lookup por `short_token`.
- Webhook em `api/public/*` bypassa auth Lovable e valida Basic Auth manualmente.
- Idempotência armazenada em `webhook_events` com unique constraint.
- Sem `child_process`, `sharp` etc. (proibidos no Worker).

## Aviso de escopo

Isto é uma entrega grande (≈15 arquivos novos + 1 migração pesada + reescrita de 2 telas). Após a implementação vou precisar que você:
1. Aprove a migração.
2. Cole as chaves da Stone no formulário seguro.
3. Configure o webhook no dashboard da Pagar.me apontando para `https://alvofuncional.lovable.app/api/public/webhooks/stone` com Basic Auth.
4. Teste em sandbox com cartão de teste antes de trocar para produção.

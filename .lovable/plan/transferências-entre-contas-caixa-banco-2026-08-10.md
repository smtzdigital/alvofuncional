# Transferências entre contas (caixa → banco)

Hoje o financeiro já tem contas (Caixa, Banco etc.) em "Categorias & contas", mas não existe nenhuma tela para mover dinheiro de uma conta para outra. A tabela de transferências já existe no banco, só falta a interface e a lógica.

## O que será feito

Nova aba no menu Financeiro: **Transferências**.

Nela o admin poderá:
- Registrar uma transferência informando: conta de origem, conta de destino, valor, data e observação.
- Ver a lista das transferências já feitas, com filtros por período e por conta.
- Excluir uma transferência (removendo também os lançamentos gerados).

Regras aplicadas ao salvar:
- Origem e destino precisam ser diferentes e o valor precisa ser maior que zero.
- A transferência cria automaticamente dois lançamentos já quitados: uma saída na conta de origem e uma entrada na conta de destino, ambos com a descrição "Transferência: Caixa → Banco".
- Esses lançamentos são marcados como transferência, então **não** entram nos totais de Receitas e Despesas do dashboard nem do fluxo de caixa — apenas alteram o saldo de cada conta. Isso evita inflar o resultado do mês com dinheiro que apenas mudou de lugar.

Também será adicionado, na página de contas, o **saldo atual de cada conta** (saldo inicial + entradas − saídas + transferências), para que a movimentação faça sentido visualmente.

## Detalhes técnicos

- Nova rota `src/routes/admin.financeiro-transferencias.tsx`, com item no menu Financeiro em `src/routes/admin.tsx`.
- Usa a tabela existente `financial_transfers` (`from_account_id`, `to_account_id`, `amount`, `date`, `notes`, `out_tx_id`, `in_tx_id`).
- Cada transferência grava 2 linhas em `financial_transactions` com `origin = 'transfer'`, `status = 'paid'`, `payment_method = 'transfer'`, e vincula os IDs em `out_tx_id`/`in_tx_id`.
- Migração necessária: permitir `'transfer'` no check de `origin` em `financial_transactions` (hoje aceita apenas os valores atuais) e garantir GRANTs/RLS de `financial_transfers` para admin/financeiro via `can_manage_finance`.
- Telas de Receitas & Despesas, Dashboard e Fluxo de caixa passam a excluir `origin = 'transfer'` dos totais de receita/despesa.
- Exclusão de transferência remove os dois lançamentos vinculados e depois a transferência.

## Objetivo
Permitir editar um evento da agenda e propagar a alteração para os demais eventos da mesma série recorrente, com a opção de escolher o escopo da edição.

## Mudanças no banco (migration)
- Adicionar coluna `series_id uuid` em `agenda_events` (nullable, indexada).
- Nenhum backfill: séries antigas continuam como eventos independentes.

## Criação de eventos recorrentes
Em `src/routes/admin.agenda.tsx` (bloco `if (!isEditing && recurring)`):
- Gerar um `series_id = crypto.randomUUID()` antes do loop.
- Incluir `series_id` em cada linha inserida em lote.

## Edição com propagação
No modal de evento (quando `isEditing` e o registro possui `series_id`):
- Mostrar um seletor de escopo com 3 opções:
  1. **Somente este evento** (padrão)
  2. **Este e os próximos** (mesmo `series_id` e `scheduled_at >= evento atual`)
  3. **Todos da série** (mesmo `series_id`)
- No submit:
  - Escopo 1 → update por `id` (comportamento atual).
  - Escopos 2 e 3 → montar `patch` apenas com os campos alterados relativos ao original, preservando a data/hora individual de cada evento (aplicar somente `time-of-day` + `duration` quando o horário for alterado, mantendo a data de cada ocorrência). Campos como `title`, `type`, `student_id`, `lead_id`, `teacher_id`, `location`, `notes`, `status` são copiados diretamente.
  - Executar `update` filtrando por `series_id` (+ `scheduled_at >= atual` no escopo 2).
- Se o evento não tiver `series_id`, o seletor não aparece (comportamento atual mantido).

## Exclusão (bônus pequeno, mesmo padrão)
No botão excluir, quando houver `series_id`, oferecer confirm com escopo semelhante (somente este / este e próximos / toda a série). Opcional — incluir se aprovado.

## Detalhes técnicos
- Recalcular horário preservando data original: usar `setHours/setMinutes` do novo `scheduled_at` sobre a data original de cada linha.
- Buscar linhas da série antes do update para calcular novos `scheduled_at` por ocorrência quando o horário mudar.
- Após salvar, recarregar eventos (`loadData()` já existente).

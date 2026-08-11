# Otimizar carregamento da página Agenda & Funil

## O que está acontecendo hoje

A página baixa **todos os 5.187 eventos** da agenda antes de mostrar qualquer coisa, e faz isso em blocos de 1.000 registros **um depois do outro** (6 idas ao servidor em fila). Cada bloco traz todas as colunas, inclusive campos grandes como observações. Só depois disso a tela aparece.

## Como vai ficar

1. **Carregar por período, não tudo**
   - Ao abrir, buscar apenas os eventos de uma janela padrão (últimos 30 dias + próximos 90 dias). Isso corta a maior parte dos registros.
   - Nos filtros das abas "Agenda" e "Horários", quando o usuário escolher datas fora da janela (ou marcar "mostrar passados"), buscar o período extra sob demanda, com indicador de carregamento.

2. **Buscar em paralelo e só o necessário**
   - Contar os registros do período primeiro e disparar as páginas restantes em paralelo em vez de em fila.
   - Selecionar apenas as colunas usadas na tela (id, lead_id, student_id, type, title, scheduled_at, duration_minutes, status, series_id, notes) em vez de `*`.

3. **Mostrar a tela antes dos eventos**
   - Leads, alunos e eventos deixam de esperar uns aos outros: o Kanban/funil renderiza assim que os leads chegam, com um estado de carregamento apenas na parte da agenda.

4. **Renderização mais leve**
   - As abas "Agenda" e "Horários" passam a montar seu conteúdo só quando abertas.
   - A lista de horários agrupados ganha paginação/limite de exibição para não renderizar milhares de linhas de uma vez.

5. **Índice de banco**
   - Adicionar índice composto em `agenda_events (scheduled_at, status)` para acelerar as consultas por janela de data.

## Detalhes técnicos

- Arquivo principal: `src/routes/admin.agenda.tsx` (função `loadAllEvents` / `load`).
- Nova assinatura: `loadEvents({ fromISO, toISO })` com `.gte("scheduled_at", from).lte("scheduled_at", to)`, `count: "exact"` na primeira chamada e `Promise.all` para as páginas seguintes.
- Estado adicional: janela carregada (`loadedRange`) para evitar refetch quando o filtro já está coberto; merge por `id` ao expandir a janela.
- Migração: `create index idx_agenda_scheduled_status on public.agenda_events (scheduled_at, status);`
- Sem mudança de comportamento nas ações de criar/editar/excluir eventos, séries recorrentes e conversão de leads.

## Resultado esperado

Abertura da página com ~1 requisição pequena em vez de 6 grandes, tela útil em poucos instantes, e dados antigos carregados só quando o usuário pedir.

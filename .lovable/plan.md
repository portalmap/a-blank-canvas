

# Incluir transferências no card de produtividade + registro completo

## Problema

1. O card de **Produtividade** não tem a chave "Incluir transferidas" (só o Ranking tem)
2. A função SQL `get_productivity_stats` só conta tarefas pela `tasks.completed_at` — ignora registros de `task_assignee_history` (transferências). Quando um usuário é transferido, sua contribuição não entra nas métricas de produtividade
3. A cada transferência, o sistema precisa registrar um "snapshot de conclusão parcial" com data/hora exata, para rastrear ciclos como A→B→A corretamente

## Alterações

### 1. Migration SQL — Atualizar `get_productivity_stats`
- Quando `p_include_transferred = true`, incluir também registros de `task_assignee_history` onde `unassigned_at IS NOT NULL` (transferências)
- Para cada registro transferido, usar `assigned_at` como início e `unassigned_at` como referência de entrega, junto com `start_date` e `due_date` do snapshot no histórico
- Adicionar parâmetro `p_include_transferred boolean DEFAULT false` na função
- Unir os dois conjuntos (concluídas + transferidas) antes de calcular score/classificação

### 2. `src/hooks/useProductivityStats.ts`
- Adicionar `includeTransferred?: boolean` nas options
- Passar `p_include_transferred` na chamada RPC

### 3. `src/components/dashboards/DashboardEditor.tsx` — `ProductivityCardWrapper`
- Adicionar estado `includeTransferred` (como já existe no `ProductivityRankingCardWrapper`)
- Passar para `useProductivityStats`
- Passar toggle para o `ProductivityCard`

### 4. `src/components/dashboards/cards/ProductivityCard.tsx`
- Adicionar props `includeTransferred` e `onToggleTransferred`
- Exibir checkbox/switch "Incluir transferidas" abaixo do breakdown, similar ao que já existe no card de ranking

### 5. `src/components/tasks/TaskAssigneesManager.tsx` — Garantir registro completo
- No `handleRemoveAssignee`, já existe a lógica de classificação na transferência
- Garantir que o `task_assignee_history` tenha `classification` preenchido + a data/hora exata em `unassigned_at` (já existe via trigger)
- O registro de atividade `productivity.classified` com `isTransferred: true` já está implementado — verificar que funciona em cenários A→B→A (múltiplas atribuições do mesmo usuário)

## Resultado
- Card de produtividade mostra toggle "Incluir transferidas"
- Ao ativar, métricas incluem registros de transferência com score individual
- Cada transferência gera registro com data/hora para rastreamento completo de ciclos
- 4 arquivos editados + 1 migration SQL


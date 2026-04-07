

# Corrigir Relatório de Produtividade — Classificação e Transferências

## Diagnóstico

Três falhas combinadas fazem o relatório mostrar "0 tarefas":

1. **`get_productivity_stats`** recebe `p_include_transferred` mas nunca o usa — só consulta `task_assignees` (responsável atual)
2. **Triggers de assignee** (`on_task_assignee_added/removed`) não calculam `classification` — campo é sempre NULL
3. **Não existe trigger de conclusão** (`tasks.completed_at`) que classifique o registro no `task_assignee_history`

## Alterações

### 1. Migration SQL — Triggers de classificação + Refatorar função RPC

**Trigger na remoção de assignee (transferência)**:
- Ao fazer `on_task_assignee_removed`, calcular `classification` usando `calc_delivery_pct` e os thresholds do `productivity_settings`
- Preencher o campo `classification` no `task_assignee_history`

**Trigger na conclusão de tarefa**:
- Criar trigger `on_task_completed` em `tasks` que dispara quando `completed_at` muda de NULL para um valor
- Para cada registro em `task_assignee_history` do task onde `unassigned_at IS NULL`, preencher `classification` usando `completed_at` como referência

**Refatorar `get_productivity_stats`**:
- Quando `p_include_transferred = true`: buscar dados do `task_assignee_history` (tanto concluídas quanto transferidas) em vez de só `tasks + task_assignees`
- Quando `p_include_transferred = false` (padrão): manter comportamento atual mas usando `task_assignee_history` onde `unassigned_at IS NULL` e a tarefa tem `completed_at`
- Usar o `classification` já preenchido pela trigger ou calcular inline via `calc_delivery_pct`

**Backfill dos dados existentes**:
- Script que preenche `classification` para todos os registros históricos existentes com base nas datas registradas

### 2. Nenhuma alteração de frontend necessária

Os hooks e componentes já passam `includeTransferred` e consomem o resultado — o problema é 100% no banco de dados.

## Arquivos
- 1 migration SQL (triggers + refatorar RPC + backfill)

## Resultado
- Victor Borges (e qualquer usuário transferido) aparece no relatório com suas contribuições classificadas
- Tarefas concluídas pelo responsável atual também são classificadas no histórico
- O toggle "Incluir transferidas" passa a funcionar de verdade


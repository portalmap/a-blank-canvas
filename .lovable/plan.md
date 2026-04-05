

# Adicionar filtro "Tarefas transferidas" no EverythingFilters

## Resumo

Adicionar uma nova opção no popover de filtros (usado em Tudo, Listas, Home) que permite visualizar tarefas que foram transferidas (onde o usuário atual já foi responsável mas não é mais). Isso complementa o sistema de produtividade existente.

## Alterações

### 1. `src/components/everything/EverythingFilters.tsx`
- Adicionar campo `showTransferred: boolean` ao `FilterState`
- Adicionar checkbox "Mostrar tarefas transferidas" (ao lado de "Mostrar tarefas concluídas")
- Incluir no contador de filtros ativos e no `clearFilters`

### 2. `src/hooks/useFilteredAllTasks.ts`
- Quando `showTransferred` não está ativo, comportamento atual (sem mudança)
- Quando `showTransferred` está ativo, buscar também tarefas da `task_assignee_history` onde o usuário foi responsável mas já saiu (`unassigned_at IS NOT NULL`), e incluí-las no resultado

### 3. Consumidores (`EverythingView.tsx`, `ListDetailView.tsx`, `MyTasksCard.tsx`)
- Atualizar o `FilterState` inicial para incluir `showTransferred: false`
- Passar o filtro para o hook de dados, onde o filtro será aplicado

## Resultado
- Checkbox "Mostrar tarefas transferidas" aparece no popover de filtros
- Ao ativar, tarefas que passaram pelo usuário mas foram transferidas aparecem na listagem
- 4 arquivos editados


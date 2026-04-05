

# Classificar produtividade na transferência de responsável

## Problema

Quando um responsável é **removido** (transferido), o sistema:
- ✅ Registra corretamente no `task_assignee_history` (com `unassigned_at`)
- ❌ **NÃO** calcula a classificação de produtividade (early/on_time/late) para essa transferência
- ❌ **NÃO** registra atividade `productivity.classified` no histórico da tarefa
- ❌ **NÃO** atualiza o campo `classification` no `task_assignee_history`

A classificação só acontece quando o status muda para "Concluído" (em `TaskMainContent.handleStatusChange`). Transferências são ignoradas.

Na tarefa em questão, houve 4 trocas de responsável (06:08, 06:18, 06:20) mas nenhuma gerou registro de produtividade.

## Solução

### `src/components/tasks/TaskAssigneesManager.tsx`
- No `handleRemoveAssignee`, após remover o responsável:
  - Buscar a tarefa atual (start_date, due_date) para calcular a classificação
  - Chamar `calculateClassification` com `now()` como data de referência
  - Registrar atividade `productivity.classified` com metadata indicando que é transferência (`isTransferred: true`) e o nome do usuário
  - Atualizar `task_assignee_history` setando `classification` no registro correspondente (via query por `task_id`, `user_id`, ordenado pelo mais recente)

### `src/hooks/useTaskActivities.ts`
- Ajustar o texto de `productivity.classified` para diferenciar quando é transferência vs conclusão (usar metadata `isTransferred`)

### `src/components/tasks/TaskActivityItem.tsx`
- Exibir texto diferenciado para classificações de transferência (ex: "Victor Borges transferiu a tarefa — Antecipada (35%)")

## Resultado
- Toda troca de responsável registra a classificação de produtividade
- O histórico da tarefa mostra a lâmpada colorida para cada transferência
- O `task_assignee_history.classification` é preenchido tanto em conclusões quanto transferências
- 3 arquivos editados


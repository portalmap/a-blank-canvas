
# Automacoes Executam Mas UI Nao Atualiza Imediatamente

## Problema

As funcoes `executeStatusChangeAutomations` e `reevaluateConditionAutomations` executam corretamente no banco de dados, mas a interface so reflete as mudancas quando o usuario sai da pagina. Isso acontece porque:

1. As funcoes modificam dados diretamente via Supabase (criam subtarefas, movem tarefas, mudam status, adicionam tags, etc.)
2. Mas **nao invalidam o cache do React Query** apos a execucao
3. O React Query so refaz as consultas quando o usuario navega para outra pagina (refetch on mount)

## Solucao

Fazer as funcoes de automacao invalidarem as queries relevantes apos executar as acoes. Para isso:

1. Passar o `queryClient` como parametro para as funcoes
2. Apos executar todas as acoes, invalidar queries de tarefas, subtarefas, tags, etc.

## Detalhes Tecnicos

### Arquivo: `src/hooks/useStatusChangeAutomations.ts`

Modificar as duas funcoes exportadas para aceitar `queryClient` opcional e invalidar queries apos execucao:

```typescript
import { QueryClient } from '@tanstack/react-query';

export const executeStatusChangeAutomations = async (
  info: StatusChangeInfo,
  queryClient?: QueryClient
): Promise<AutomationExecutionResult> => {
  // ... logica existente ...
  
  // Ao final, apos executar todas as acoes:
  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['task', info.taskId] });
    queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    queryClient.invalidateQueries({ queryKey: ['task-tag-relations'] });
    queryClient.invalidateQueries({ queryKey: ['task-assignees'] });
    queryClient.invalidateQueries({ queryKey: ['task-activities'] });
  }
  return result;
};

export const reevaluateConditionAutomations = async (
  taskId: string,
  workspaceId: string,
  queryClient?: QueryClient
): Promise<void> => {
  // ... logica existente ...
  
  // Apos executar acoes com sucesso:
  if (queryClient && alguma_automacao_executou) {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    queryClient.invalidateQueries({ queryKey: ['task-tag-relations'] });
    queryClient.invalidateQueries({ queryKey: ['task-assignees'] });
    queryClient.invalidateQueries({ queryKey: ['task-activities'] });
  }
};
```

### Arquivo: `src/hooks/useTaskTags.ts`

Passar o `queryClient` nas chamadas de re-avaliacao:

```typescript
export function useAddTaskTag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    // ...
    onSuccess: async (_, variables) => {
      // ...
      if (task) {
        await reevaluateConditionAutomations(
          variables.taskId,
          task.workspace_id,
          queryClient  // <-- passar queryClient
        );
      }
    },
  });
}
```

### Arquivo: `src/components/tasks/TaskMainContent.tsx`

Passar `queryClient` na chamada de automacoes:

```typescript
import { useQueryClient } from '@tanstack/react-query';

// Dentro do componente:
const queryClient = useQueryClient();

// Na handleStatusChange:
await executeStatusChangeAutomations({
  taskId,
  workspaceId: task.workspace_id,
  listId: task.list_id,
  oldStatusId: task.status_id,
  newStatusId: statusId,
}, queryClient);
```

### Arquivo: `src/components/tasks/TaskDetailDrawer.tsx`

Mesma alteracao: passar `queryClient` na chamada.

### Arquivo: `src/components/tasks/bulk-actions/StatusBulkPopover.tsx`

Mesma alteracao: passar `queryClient` na chamada.

### Arquivo: `src/components/views/TaskKanbanView.tsx`

Mesma alteracao: passar `queryClient` na chamada existente.

### Arquivos modificados

- `src/hooks/useStatusChangeAutomations.ts` - aceitar `queryClient` e invalidar queries
- `src/hooks/useTaskTags.ts` - passar `queryClient` para re-avaliacao
- `src/components/tasks/TaskMainContent.tsx` - passar `queryClient`
- `src/components/tasks/TaskDetailDrawer.tsx` - passar `queryClient`
- `src/components/tasks/bulk-actions/StatusBulkPopover.tsx` - passar `queryClient`
- `src/components/views/TaskKanbanView.tsx` - passar `queryClient`

Nenhuma alteracao no banco de dados necessaria.



# Automacao Nao Funciona: Causa Raiz e Correcao

## Problema Encontrado

A funcao `executeStatusChangeAutomations` so e chamada em **um unico lugar**: no `TaskKanbanView.tsx` (drag & drop no Kanban). Quando o usuario muda o status de uma tarefa pela **tela de detalhe** (`TaskMainContent.tsx`) ou pelo **drawer** (`TaskDetailDrawer.tsx`), a automacao **nunca e executada**.

Ou seja, o motor de automacoes existe e esta correto, mas ninguem o chama quando o status muda fora do Kanban.

## Locais que mudam status sem chamar automacoes

| Arquivo | Funcao | Situacao |
|---------|--------|----------|
| `TaskMainContent.tsx` | `handleStatusChange` (linha 112) | Chama `updateTask` + `createActivity`, mas **nao chama** `executeStatusChangeAutomations` |
| `TaskDetailDrawer.tsx` | `handleStatusChange` (linha 85) | Chama apenas `updateTask`, **nao chama** `executeStatusChangeAutomations` |
| `TaskListView.tsx` | Mudancas de status inline | Precisa verificar se ha mudanca de status inline |
| Bulk actions (`StatusBulkPopover.tsx`) | Mudanca em lote | Precisa verificar |

## Solucao

Adicionar a chamada `executeStatusChangeAutomations` em todos os locais onde o status e alterado.

## Detalhes Tecnicos

### 1. `src/components/tasks/TaskMainContent.tsx`

Na funcao `handleStatusChange` (linha 112), apos o `createActivity`, adicionar:

```typescript
import { executeStatusChangeAutomations } from '@/hooks/useStatusChangeAutomations';

const handleStatusChange = async (statusId: string) => {
  const taskId = task.id;
  const oldStatus = statuses?.find(s => s.id === task.status_id);
  const newStatus = statuses?.find(s => s.id === statusId);
  const oldStatusName = oldStatus?.name || null;
  const newStatusName = newStatus?.name || null;

  try {
    await updateTask.mutateAsync({ id: taskId, statusId });
    await createActivity.mutateAsync({
      taskId,
      activityType: 'status.changed',
      fieldName: 'status_id',
      oldValue: oldStatusName,
      newValue: newStatusName,
    });

    // NOVO: Executar automacoes de mudanca de status
    if (task.status_id !== statusId) {
      executeStatusChangeAutomations({
        taskId,
        workspaceId: task.workspace_id,
        listId: task.list_id,
        oldStatusId: task.status_id,
        newStatusId: statusId,
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
  }
};
```

### 2. `src/components/tasks/TaskDetailDrawer.tsx`

Na funcao `handleStatusChange` (linha 85), adicionar a mesma logica:

```typescript
import { executeStatusChangeAutomations } from '@/hooks/useStatusChangeAutomations';

const handleStatusChange = async (statusId: string) => {
  const oldStatusId = task.status_id;
  await updateTask.mutateAsync({ id: task.id, statusId });

  // NOVO: Executar automacoes de mudanca de status
  if (oldStatusId !== statusId) {
    executeStatusChangeAutomations({
      taskId: task.id,
      workspaceId: task.workspace_id,
      listId: task.list_id,
      oldStatusId,
      newStatusId: statusId,
    });
  }
};
```

### 3. Verificar `TaskListView.tsx` e `StatusBulkPopover.tsx`

Verificar se ha mudancas de status inline nesses arquivos e adicionar a mesma chamada se necessario.

### Nota sobre invalidacao de queries

Apos a execucao das automacoes (que podem mover tarefas, mudar status, etc.), e necessario invalidar as queries relevantes para a UI refletir as mudancas. Isso sera feito chamando `queryClient.invalidateQueries` apos o retorno de `executeStatusChangeAutomations`.

### Arquivos modificados

- `src/components/tasks/TaskMainContent.tsx` - adicionar chamada de automacao
- `src/components/tasks/TaskDetailDrawer.tsx` - adicionar chamada de automacao
- Possivelmente `src/components/views/TaskListView.tsx` e `src/components/tasks/bulk-actions/StatusBulkPopover.tsx`

Nenhuma alteracao no banco de dados necessaria.

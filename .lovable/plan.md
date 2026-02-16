
# Executar Automacoes da Lista de Destino Quando Uma Tarefa e Movida

## Problema

Quando uma tarefa e movida para outra lista (seja por automacao ou manualmente), as automacoes configuradas na lista de destino (como "atribuicao automatica") nao disparam. Isso acontece porque:

1. A funcao `applyAutomationsToTask` so e chamada na **criacao** de tarefas
2. A acao `move_task` no motor de automacoes move a tarefa mas nao dispara automacoes da lista destino
3. O `useMoveTask` (mover manual) tambem nao dispara automacoes

O resultado e que a tarefa chega na lista nova sem responsavel, mesmo existindo uma automacao de atribuicao automatica configurada.

## Solucao

Chamar `applyAutomationsToTask` apos qualquer movimentacao de tarefa, para que as automacoes da lista destino (atribuicao automatica, seguir automaticamente, etc.) sejam executadas.

## Detalhes Tecnicos

### 1. Arquivo: `src/hooks/useStatusChangeAutomations.ts` - Funcao `executeMoveTask`

Apos mover a tarefa, chamar `applyAutomationsToTask` com o novo `list_id`:

```typescript
const executeMoveTask = async (info, config, automationName) => {
  // ... logica existente de mover ...

  // Apos mover com sucesso, aplicar automacoes da lista destino
  await applyAutomationsToTask({
    id: info.taskId,
    workspace_id: info.workspaceId,
    list_id: targetListId,
  });
};
```

### 2. Arquivo: `src/hooks/useTasks.ts` - Hook `useMoveTask`

No `mutationFn`, apos mover a tarefa manualmente, tambem chamar `applyAutomationsToTask`:

```typescript
mutationFn: async ({ id, listId, workspaceId, ... }) => {
  // ... update existente ...

  // Aplicar automacoes da lista destino
  await applyAutomationsToTask({
    id,
    workspace_id: workspaceId,
    list_id: listId,
  });

  return data;
};
```

### Arquivos modificados

- `src/hooks/useStatusChangeAutomations.ts` - adicionar chamada `applyAutomationsToTask` no `executeMoveTask`
- `src/hooks/useTasks.ts` - adicionar chamada `applyAutomationsToTask` no `useMoveTask`

Nenhuma alteracao no banco de dados necessaria.

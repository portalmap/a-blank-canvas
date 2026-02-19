
# Corrigir registro de atividade "criou esta tarefa"

## Problema

Quando uma tarefa e criada, a atividade "criou esta tarefa" **nao e registrada no momento da criacao**. Em vez disso, existe um `useEffect` em `TaskView.tsx` que verifica se a atividade de criacao existe quando alguem **abre** a tarefa. Se nao existe, ele registra usando o usuario logado atual -- ou seja, quem abre a tarefa primeiro aparece como criador, e nao quem realmente criou.

## Solucao

1. Mover o registro da atividade `task.created` para o momento real da criacao
2. Remover o codigo que registra erroneamente ao abrir a tarefa

## Alteracoes

### 1. `src/hooks/useTasks.ts` - `useCreateTask`

Adicionar o registro da atividade `task.created` logo apos a criacao da tarefa (antes das automacoes), usando o `user.id` real do criador:

```typescript
// Registrar atividade de criacao
await supabase.from('task_activities').insert({
  task_id: data.id,
  user_id: user.id,
  activity_type: 'task.created',
  metadata: { created_by: 'user' },
});
```

### 2. `src/pages/TaskView.tsx`

Remover:
- O state `hasLoggedCreation`
- O `useEffect` inteiro que faz `checkAndLogCreation`
- O import de `useCreateTaskActivity` (se nao usado em outro lugar)
- O import de `supabase` (se nao usado em outro lugar)

Nenhuma alteracao de banco de dados e necessaria.

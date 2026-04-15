

# Registrar atividade de criação de tarefa com data e hora

## Problema identificado

Existem **dois pontos** onde tarefas são criadas:

1. **Frontend** (`src/hooks/useTasks.ts`) — registra a atividade `task.created`, mas sem incluir a data/hora de criação no metadata.
2. **API Gateway** (`supabase/functions/api-tasks/index.ts`) — usado pelo Portal MAP — **não registra nenhuma atividade** `task.created`.

A tarefa do screenshot (criada em 08/04 via Portal MAP) não tem registro de criação porque veio pela API.

## Solução

### 1. `supabase/functions/api-tasks/index.ts`
Após criar a tarefa com sucesso (linha ~246), inserir a atividade:

```typescript
await supabase.from('task_activities').insert({
  task_id: task.id,
  user_id: tokenData.created_by,
  activity_type: 'task.created',
  metadata: {
    created_by: 'api',
    created_at_date: task.created_at,
  },
});
```

Isso garante que tarefas criadas pelo Portal MAP tenham registro no histórico.

### 2. `src/hooks/useTasks.ts`
Enriquecer o metadata do insert existente (linha ~243-248) para incluir a data de criação:

```typescript
metadata: {
  created_by: 'user',
  created_at_date: data.created_at,
},
```

### 3. `src/hooks/useTaskActivities.ts`
Atualizar o label do `task.created` para mostrar a data e hora:

```typescript
case 'task.created': {
  const createdDate = activity.metadata?.created_at_date;
  if (createdDate) {
    const formatted = new Date(createdDate).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    return `${prefix}criou esta tarefa em ${formatted}`;
  }
  return `${prefix}criou esta tarefa`;
}
```

### Impacto no Portal MAP
Nenhum impacto negativo — apenas adiciona um INSERT extra na tabela `task_activities` após a criação. O fluxo existente continua funcionando normalmente.

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/api-tasks/index.ts` | Adicionar registro de atividade `task.created` |
| `src/hooks/useTasks.ts` | Incluir `created_at_date` no metadata |
| `src/hooks/useTaskActivities.ts` | Exibir data/hora no label de criação |


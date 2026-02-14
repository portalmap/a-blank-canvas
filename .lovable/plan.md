

# Corrigir Salvamento de Atribuicao ao Editar Comentario

## Problema Identificado

Quando o usuario edita um comentario que foi criado sem atribuicao (`comment.created`) e adiciona um atribuido, o sistema:

1. Atualiza o `assignee_id` no comentario no banco (funciona)
2. Atualiza o `metadata` da atividade com `assignee_id` e `assignee_name` (funciona)
3. **NAO atualiza o `activity_type`** — permanece como `comment.created` em vez de mudar para `assignment.created`
4. A interface so mostra o badge de atribuicao quando `activity_type === 'assignment.created'`, entao o badge nunca aparece

## Solucao

### 1. `src/hooks/useTaskActivities.ts` — Expandir `useUpdateActivityMetadata`

Permitir que a mutacao tambem atualize o `activity_type`, alem do `metadata`:

- Adicionar campo opcional `activityType` nos parametros
- Incluir `activity_type` no update quando fornecido

### 2. `src/components/tasks/TaskActivityItem.tsx` — Atualizar `handleSaveEdit`

Quando o usuario adicionar um atribuido a um comentario simples:

- Passar o novo `activityType: 'assignment.created'` na chamada de `updateActivityMetadata`
- Quando o usuario remover o atribuido de um `assignment.created`, mudar para `comment.edited`
- Quando apenas editar o conteudo sem mudar atribuicao, manter o tipo atual mas marcar como `comment.edited` se era `comment.created`

Logica:

```
Se tem assignee agora -> activity_type = 'assignment.created'
Se nao tem assignee e era assignment -> activity_type = 'comment.edited'
Se nao tem assignee e era comment -> activity_type = 'comment.edited'
```

## Detalhes Tecnicos

### `src/hooks/useTaskActivities.ts`

Na funcao `useUpdateActivityMetadata`, alterar:

```typescript
mutationFn: async ({
  activityId,
  metadata,
  activityType, // novo campo opcional
}: {
  activityId: string;
  metadata: Record<string, any>;
  activityType?: string;
}) => {
  const updateData: Record<string, any> = { metadata };
  if (activityType) {
    updateData.activity_type = activityType;
  }
  // ... update com updateData
}
```

### `src/components/tasks/TaskActivityItem.tsx`

No `handleSaveEdit`, determinar o novo `activityType`:

```typescript
const newActivityType = newAssigneeId 
  ? 'assignment.created' 
  : 'comment.edited';

await updateActivityMetadata.mutateAsync({
  activityId: activity.id,
  activityType: newActivityType,
  metadata: { ... }
});
```

Nenhuma alteracao no banco de dados necessaria.


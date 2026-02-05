
# Correção: Resolver Atribuição pela Atividade da Tarefa

## Problema Identificado

Quando você clica em "Resolver" na atividade dentro de uma tarefa, o sistema busca o comentário por **conteúdo** (`content`) e **assignee_id**. Se o comentário foi editado, essa busca falha e a resolução não acontece.

O card "Comentários atribuídos" na Home não é atualizado porque a resolução nunca acontece de verdade.

## Causa Raiz

```typescript
// Busca frágil - falha se conteúdo foi editado
const relatedComment = comments.find(c => 
  c.assignee_id === activity.metadata?.assignee_id &&
  c.content === activity.metadata?.content  // ❌ Pode não bater
)
```

## Solução

Usar o `comment_id` que já está salvo nos metadados da atividade:

```typescript
// Busca robusta - usa o ID direto
const relatedComment = comments.find(c => 
  c.id === activity.metadata?.comment_id  // ✅ Sempre funciona
)
```

## Alterações

### Arquivo: `src/components/tasks/TaskActivityItem.tsx`

Atualizar a lógica de busca do comentário relacionado (linhas 102-108):

**Antes:**
```typescript
const relatedComment = activity.activity_type === 'assignment.created' && comments
  ? comments.find(c => 
      c.assignee_id === activity.metadata?.assignee_id &&
      c.content === activity.metadata?.content
    )
  : null;
```

**Depois:**
```typescript
const relatedComment = activity.activity_type === 'assignment.created' && comments
  ? comments.find(c => c.id === activity.metadata?.comment_id)
  : null;
```

## Resultado Esperado

1. Clicar em "Resolver" na atividade da tarefa atualiza o banco corretamente
2. O card "Comentários atribuídos" na Home é atualizado automaticamente (a invalidação já existe no hook)
3. Funciona mesmo se o comentário foi editado

## Escopo Técnico

- **1 arquivo modificado**: `TaskActivityItem.tsx`
- **1 linha alterada**: a busca do `relatedComment`
- **Sem mudanças no banco de dados**
- **Sem novos componentes**

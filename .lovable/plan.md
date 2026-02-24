

# Corrigir modulo "Tudo" - query de assignees excede limite de URL

## Problema

O modulo "Tudo" nao exibe tarefas porque a query de `task_assignees` falha com erro **400 Bad Request**. O usuario logado e `global_owner` (admin), entao TODAS as tarefas do workspace sao carregadas. Quando o hook tenta buscar os assignees, passa centenas de task IDs em um unico `.in()` filter, gerando uma URL que excede o limite de tamanho aceito pela API.

A request que falha:
```
GET /task_assignees?task_id=in.(id1,id2,...id200+) -> 400 Bad Request
```

## Causa raiz

No `useFilteredAllTasks.ts`, linhas 160-166, todos os IDs sao passados de uma vez:
```typescript
const { data: assignees, error: assigneesError } = await supabase
  .from('task_assignees')
  .select('task_id, user_id')
  .in('task_id', fetchedTaskIds); // <- centenas de IDs = URL muito longa
```

O mesmo problema existe em `useAllTasks.ts` (hook `useAllTasksWithAssignees`).

## Solucao

Dividir as queries de `task_assignees` e `profiles` em lotes (batches) de no maximo 50 IDs por requisicao, depois juntar os resultados.

## Alteracoes

### 1. `src/hooks/useFilteredAllTasks.ts`

Substituir a query unica de `task_assignees` (linhas 156-168) por uma funcao que divide os IDs em chunks de 50 e faz as requisicoes em paralelo:

```typescript
// Dividir em lotes de 50
const BATCH_SIZE = 50;
const chunks = [];
for (let i = 0; i < fetchedTaskIds.length; i += BATCH_SIZE) {
  chunks.push(fetchedTaskIds.slice(i, i + BATCH_SIZE));
}

const allAssignees = [];
for (const chunk of chunks) {
  const { data, error } = await supabase
    .from('task_assignees')
    .select('task_id, user_id')
    .in('task_id', chunk);
  if (error) throw error;
  if (data) allAssignees.push(...data);
}
```

Aplicar a mesma logica de batching para a query de `profiles`.

### 2. `src/hooks/useAllTasks.ts`

Aplicar a mesma correcao de batching no hook `useAllTasksWithAssignees`, que tem o mesmo problema potencial.

Nenhuma alteracao de banco de dados e necessaria.


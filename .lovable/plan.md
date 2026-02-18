

# Corrigir Recorrência Não Salvando

## Causa Raiz

O problema não é no salvamento — os dados são gravados corretamente no banco. O problema é que a query que busca a tarefa na página de detalhe (`TaskView.tsx`, linha 66) **não inclui `recurrence_config` no SELECT**, então o campo sempre volta como `undefined`. Após salvar, o React Query invalida o cache e refaz a busca, mas como `recurrence_config` não está na lista de campos, ele nunca aparece.

## Correção

**Arquivo:** `src/pages/TaskView.tsx`

Adicionar `recurrence_config` à lista de campos no SELECT da query local `useTask` (linha 66-82). Trocar a seleção explícita de campos por `*` (que já é usado em outros hooks como `useTask.ts`) ou simplesmente adicionar o campo faltante.

A abordagem mais simples e segura é adicionar `recurrence_config` à lista existente de campos selecionados, mantendo a consistência com o padrão atual do arquivo.

### Detalhe técnico

Linha ~67 do `TaskView.tsx`, no `.select(...)`:

```text
Antes:
  id, title, description, status_id, priority, assignee_id,
  start_date, due_date, list_id, workspace_id, parent_id,
  completed_at, created_at, ...

Depois:
  id, title, description, status_id, priority, assignee_id,
  start_date, due_date, list_id, workspace_id, parent_id,
  completed_at, created_at, recurrence_config, ...
```

Nenhuma outra alteração é necessária — o salvamento e a invalidação de cache já estão funcionando corretamente.


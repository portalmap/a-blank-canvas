
# Correcao: Incompatibilidade de Campos entre UI e Motor de Automacao

## Problema Raiz

A interface do construtor de automacoes salva os campos de configuracao com nomes **diferentes** dos que o motor de execucao espera. Isso faz com que as acoes falhem silenciosamente (retornam sem fazer nada).

## Incompatibilidades Encontradas

| Acao | Campo salvo pela UI | Campo esperado pelo motor | Resultado |
|------|---------------------|--------------------------|-----------|
| `remove_tag` | `tag_id` (UUID da tag) | `tag_name` (nome da tag) | Falha silenciosa |
| `add_tag` | `tag_id` (UUID da tag) | `tag_name` (nome da tag) | Falha silenciosa |
| `set_start_date` | `date_type` + `days_count` | `days_from_now` | Falha silenciosa |
| `set_due_date` | `date_type` + `days_count` | `days_from_now` | Falha silenciosa |
| `send_webhook` | `url` | `webhook_url` | Falha silenciosa |

As acoes `move_task`, `set_status`, `remove_all_assignees` e `add_assignee` estao corretas.

## Solucao

Corrigir o motor de execucao (`useStatusChangeAutomations.ts`) para usar os mesmos nomes de campos que a UI salva. Tambem adicionar suporte a todos os tipos de data configurados na UI (`first_day_of_month`, `last_day_of_month`, `days_after_trigger`, `specific_day`).

## Detalhes Tecnicos

### Arquivo: `src/hooks/useStatusChangeAutomations.ts`

**1. Corrigir `executeRemoveTag` (linha 726-752):**

Atualmente busca por `config?.tag_name`. Deve buscar por `config?.tag_id` e deletar diretamente pela relacao tag_id:

```typescript
const executeRemoveTag = async (info, config, automationName) => {
  const tagId = config?.tag_id;
  if (!tagId) return;

  await supabase
    .from('task_tag_relations')
    .delete()
    .eq('task_id', info.taskId)
    .eq('tag_id', tagId);
};
```

**2. Corrigir `executeAddTag` (linha 680-721):**

Atualmente busca por `config?.tag_name`. Deve usar `config?.tag_id` diretamente:

```typescript
const executeAddTag = async (info, config, automationName) => {
  const tagId = config?.tag_id;
  if (!tagId) return;

  await supabase
    .from('task_tag_relations')
    .upsert(
      { task_id: info.taskId, tag_id: tagId },
      { onConflict: 'task_id,tag_id' }
    );
};
```

**3. Corrigir `executeSetDueDate` (linha 607-651):**

Deve suportar `date_type` e `days_count` da UI:

```typescript
const executeSetDueDate = async (info, config, automationName) => {
  let dueDate: string | null = null;

  if (config?.date_type === 'days_after_trigger') {
    const days = parseInt(config.days_count) || 0;
    const date = new Date();
    date.setDate(date.getDate() + days);
    dueDate = date.toISOString().split('T')[0];
  } else if (config?.date_type === 'first_day_of_month') {
    const now = new Date();
    dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      .toISOString().split('T')[0];
  } else if (config?.date_type === 'last_day_of_month') {
    const now = new Date();
    dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().split('T')[0];
  } else if (config?.date_type === 'specific_day') {
    const day = parseInt(config.day_of_month) || 1;
    const now = new Date();
    dueDate = new Date(now.getFullYear(), now.getMonth(), day)
      .toISOString().split('T')[0];
  } else if (config?.days_from_now) {
    // Compatibilidade legada
    const date = new Date();
    date.setDate(date.getDate() + parseInt(config.days_from_now));
    dueDate = date.toISOString().split('T')[0];
  } else if (config?.due_date) {
    dueDate = config.due_date;
  }

  if (!dueDate) return;
  // ... update task
};
```

**4. Corrigir `executeSetStartDate` (linha 802-843):**

Mesma logica da correcao de `executeSetDueDate`, mas atualizando o campo `start_date`.

**5. Corrigir `executeSendWebhook` (linha 972-1003):**

Usar `config?.url` alem de `config?.webhook_url`:

```typescript
const url = config?.webhook_url || config?.url;
```

### Arquivo modificado

- `src/hooks/useStatusChangeAutomations.ts`

Nenhuma alteracao no banco de dados necessaria.

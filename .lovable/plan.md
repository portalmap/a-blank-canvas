## Registrar atividade "Tarefa criada" para tarefas geradas via API (GCSM)

### Diagnóstico

Você está correto. O Gerador de Criativos (GCSM) cria as tarefas chamando a edge function **`api-gateway`** (`POST /tasks`). Esse handler insere a tarefa em `tasks`, mas **não grava** o registro `task.created` em `task_activities` — diferente da função `api-tasks`, que faz esse insert. Por isso o feed "Atividade" da tarefa aparece com **0 registros**.

A criação de **subtarefas** via `api-gateway` (`POST /subtasks`) também tem o mesmo problema.

### Correções

**1. `supabase/functions/api-gateway/index.ts` — `handleTasks` (POST)**

Após o insert bem-sucedido em `tasks`, gravar:
```ts
await supabase.from("task_activities").insert({
  task_id: newTask.id,
  user_id: creatorUserId,
  activity_type: "task.created",
  metadata: {
    created_by: "api",
    source: "api-gateway",
    created_at_date: newTask.created_at,
  },
});
```

**2. `supabase/functions/api-gateway/index.ts` — `handleSubtasks` (POST)**

Mesma lógica após o insert da subtarefa, usando `subtaskCreatorUserId`.

Falhas no insert da atividade não devem derrubar a criação da tarefa (try/catch silencioso com log).

### Backfill retroativo (tarefas antigas do GCSM)

Migration única que insere `task.created` em `task_activities` para todas as tarefas que **ainda não possuem** esse registro, usando `tasks.created_at` e `tasks.created_by_user_id`. Cobre a tarefa POST 13 da imagem e qualquer outra anterior.

```sql
INSERT INTO public.task_activities (task_id, user_id, activity_type, metadata, created_at)
SELECT t.id, t.created_by_user_id, 'task.created',
       jsonb_build_object('backfilled', true, 'created_at_date', t.created_at),
       t.created_at
FROM public.tasks t
WHERE t.created_by_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.task_activities a
    WHERE a.task_id = t.id AND a.activity_type = 'task.created'
  );
```

### Resultado esperado

- Toda nova tarefa/subtarefa criada pelo GCSM (ou qualquer integração via api-gateway) passa a registrar imediatamente "Tarefa criada" no feed de Atividade.
- Tarefas antigas sem o registro recebem retroativamente a entrada com a data correta de criação.
- Nenhum impacto em fluxos existentes; criação manual já registrava normalmente.
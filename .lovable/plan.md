## Diagnóstico (confirmado)

As tarefas do print foram criadas via **api-gateway** usando o token chamado **GCSM** (mantido com esse nome). Como o GCSM não envia `created_by_user_id`, o api-gateway grava como criador o admin do workspace (Victor Borges). Por isso a Atividade mostra "Victor Borges criou esta tarefa".

Token mantido: `GCSM` (sem renomear, para não quebrar nada).

## Solução

### 1. Edge Function `api-gateway` — marcar a origem
- Selecionar `id, name` ao validar o token (linhas 68-72).
- Ao registrar a `task.created` (linhas 696-705) e da subtask (898-905), incluir no metadata:
  ```ts
  metadata: {
    created_by: "api",
    source: "api-gateway",
    api_token_id: tokenInfo.id,
    api_token_name: tokenInfo.name,        // "GCSM" (nome real do token)
    integration_label: "Social Flow",       // rótulo exibido na UI
    created_at_date: newTask.created_at,
  }
  ```
  Por enquanto todos os tokens vão exibir "Social Flow" como rótulo de integração. Se no futuro quiser rótulos diferentes por token (Portal X, Contrato Flow), basta mapear pelo `name`.

### 2. Frontend — exibir "Integração Social Flow"
- `src/hooks/useTaskActivities.ts` (case `task.created`, linhas 165-175): se `metadata.integration_label` existir, retornar:
  > `criou esta tarefa via Integração "Social Flow" em DD/MM/YYYY HH:mm`
- `src/components/tasks/TaskActivityItem.tsx`: quando houver `integration_label`, substituir o nome/avatar do usuário pelo rótulo `Integração "Social Flow"` (com ícone de engrenagem/plug em vez do avatar).

### 3. Backfill das tarefas antigas já criadas pelo GCSM
Migration única para reescrever as atividades já existentes:
```sql
UPDATE task_activities
SET metadata = COALESCE(metadata, '{}'::jsonb)
  || jsonb_build_object(
       'api_token_name','GCSM',
       'integration_label','Social Flow'
     )
WHERE activity_type = 'task.created'
  AND metadata->>'source' IN ('api-gateway','backfill');
```
(Hoje só o token GCSM gera tarefas; é seguro rotular tudo como Social Flow. Reversível a qualquer momento.)

## Resultado esperado

No painel de Atividade da tarefa do print, em vez de:
> 👤 Victor Borges criou esta tarefa em 22/04/2026, 12:38

Vai aparecer:
> ⚙️ **Integração "Social Flow"** criou esta tarefa em 22/04/2026, 12:38

Tarefas criadas manualmente continuam mostrando o nome real do usuário, sem mudança.
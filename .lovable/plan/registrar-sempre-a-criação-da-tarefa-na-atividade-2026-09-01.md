# Registrar sempre a criação da tarefa na atividade

## Problema confirmado

Hoje o registro "criou esta tarefa" só é gravado quando a tarefa é criada pela interface (`useTasks`). Tarefas que chegam pela integração com o Hub não geram esse registro:

- `calendario.publicar` cria a tarefa do post sem nenhuma atividade de criação.
- `briefing.publicar` cria a subtarefa e registra apenas `subtask.created` na tarefa-mãe — na própria subtarefa a aba Atividade fica vazia ("Nenhuma atividade registrada", como no print).

## Solução: garantir no banco, não em cada caminho

Criar um gatilho no banco que, a cada tarefa inserida (por qualquer origem: interface, integração do Hub, importação, SQL), grave automaticamente a atividade de criação. Assim nenhum caminho novo pode "esquecer" de registrar.

Regras do registro automático:
- Autor: o usuário que consta como criador da tarefa (quando não houver, fica sem autor identificado).
- Data: a data real de criação da tarefa.
- Origem: marcada como "integração" quando a tarefa vier com referência externa (posts/briefings do Hub) e como "usuário" nos demais casos; subtarefas também ganham o registro.

Ajustes complementares:
- Remover a gravação manual de criação feita pela interface, para não duplicar o registro.
- Na caixa de entrada do Hub, complementar o registro já criado pelo gatilho com o detalhe do assunto recebido (calendário do post / briefing), mantendo o texto "criou esta tarefa via Integração ...".
- Preencher retroativamente o registro de criação nas tarefas que hoje estão sem ele (usando a data de criação e o criador gravados na tarefa), para que a aba Atividade deixe de aparecer vazia nas tarefas já importadas/recebidas.

## Detalhes técnicos

1. Migration:
   - `CREATE FUNCTION public.log_task_created()` (security definer, `SET search_path = public`) inserindo em `task_activities` (`activity_type = 'task.created'`, `metadata` com `created_by` = `integration`/`user`, `created_at_date` = `NEW.created_at`, `origem` quando `external_post_ref` existir, `is_subtask` quando `parent_id` existir); `user_id` = `NEW.created_by_user_id`.
   - `CREATE TRIGGER trg_tasks_log_created AFTER INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.log_task_created()`.
   - Backfill: inserir `task.created` para tarefas sem atividade desse tipo, usando `created_at`/`created_by_user_id`.
   - Nota: `task_activities.user_id` precisa aceitar nulo para tarefas sem criador; se for `NOT NULL`, o gatilho só grava quando houver `created_by_user_id`.
2. `src/hooks/useTasks.ts`: remover o `insert` manual de `task.created` (o gatilho passa a cuidar).
3. `supabase/functions/hub-inbox/index.ts`: após criar tarefa/subtarefa, dar `update` no `task_activities` de `task.created` daquela tarefa acrescentando `integration_label` (`Calendário` / `Briefing`) e a referência externa em `metadata`.
4. `src/hooks/useTaskActivities.ts` já renderiza `integration_label` e `created_at_date` — sem mudança de rótulo necessária.

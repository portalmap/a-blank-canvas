# Diagnóstico: estrutura de subtarefas (briefings)

## 1. Onde vive a subtarefa
Não existe tabela separada. Subtarefa é uma linha na própria tabela `public.tasks`, ligada à mãe pela coluna:

- `tasks.parent_id` (uuid, nullable) → aponta para `tasks.id` da tarefa-mãe.

Se `parent_id` é nulo, é tarefa normal; se preenchido, aparece como subtarefa na aba de subtarefas da tarefa-mãe.

## 2. Campos obrigatórios para criar subtarefa
Colunas NOT NULL sem default em `tasks`:

- `workspace_id`
- `list_id`
- `title`
- `status_id`
- `created_by_user_id`

Ou seja: **não há herança automática** (nenhum trigger copia da mãe). Quem cria precisa informar cada um. O padrão atual do app é copiar da tarefa-mãe: `workspace_id`, `list_id` e `parent_id` da mãe, e `status_id` = status default do workspace/lista.

Com default (opcionais): `priority` ('medium'), `cliente_devolucoes_count` (0), `time_spent` (0), `is_milestone` (false), datas, `description`, `assignee_id`, etc.

## 3. Identificação da mãe
Sim — `tasks.id` (uuid). É o mesmo identificador usado no `hub-inbox` para as decisões do cliente (`calendario.post.aprovado/reprovado`).

## 4. Anexos da subtarefa
Idêntico à tarefa normal: `public.task_attachments` com `task_id` = id da **subtarefa**.

Obrigatórios: `task_id`, `file_name`, `file_url`, `uploaded_by`. Opcionais: `file_size`, `file_type`.
Arquivos ficam no bucket privado `task-attachments` (mesmo padrão já usado no recebimento de anexos do Portal).

## 5. Fluxo antigo (send-to-mapflow / onlyBriefings)
Não existe nada disso neste projeto: nenhuma Edge Function, server function ou referência a `send-to-mapflow`, `onlyBriefings` ou "briefing" no código atual. Portanto não há padrão anterior de título/estrutura de subtarefa herdado aqui — esse fluxo vivia no sistema de origem (Social Flow / Hub), não no MAP Flow.

O único padrão existente no MAP Flow é o da UI (`useCreateSubtask`): cria em `tasks` com `parent_id`, herdando `workspace_id`/`list_id` da mãe, `status_id` default, e registra atividade `subtask.created` na tarefa-mãe (metadata com `subtask_id` e `subtask_title`).

## Observação para o próximo passo
Para receber briefings do Hub como subtarefas, o padrão consistente seria:
1. resolver a tarefa-mãe por `tasks.id` (ou por `external_post_ref`, se o Hub mandar a referência do post);
2. inserir a subtarefa em `tasks` herdando workspace/lista da mãe;
3. gravar anexos em `task_attachments` após download para o bucket;
4. registrar `subtask.created` (+ `attachment.added`) em `task_activities` para aparecer no histórico;
5. idempotência via `hub_inbox_processed`.

Nada foi alterado.

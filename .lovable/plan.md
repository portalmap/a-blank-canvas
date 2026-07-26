## Contexto verificado

- Workspace único: `8405df05-33a9-4f4e-a23a-8a84bc75d694` (TESTE HUB)
- Lista única com space preenchido: `8c066634-f5a9-4f27-af8f-94340ed0a9d3` (Lista teste) → space `a787fb85-bffd-476d-a6d9-94b9fa5b5a8a` (Comunicação HUB)
- `task_tags` está vazia → não existe tag parecida com "enviar cliente", pode criar sem risco de duplicata
- Status válido: `0db5cca8-d80c-4dcc-becd-e51259898f5c` (To Do, default do workspace)
- `task_attachments` está vazia; padrão de path usado pelo app: `{user_id}/{task_id}/{timestamp}_{arquivo}` no bucket `task-attachments` (guarda-se o path relativo, e o hub-inbox converte em signed URL)
- Criador/uploader: `b7e892cf-ea9e-4d15-86d8-5243bce7034c` (mesmo da tarefa existente)

## O que será feito

Uma única execução de inserção de dados (sem migration, sem alteração de schema, funções ou edge functions):

1. `task_tags`: criar "enviar cliente" no workspace TESTE HUB
2. `tasks`: criar a tarefa
   - title: `TESTE RELAY — Post carrossel`
   - description: HTML no formato Tiptap usado pelo editor (ex.: `<h2>…</h2><p>…</p><ul><li>…</li></ul>`)
   - list_id / workspace_id / status_id conforme acima, priority `medium`, start_date hoje, due_date +7 dias
   - parent_id null, archived_at null
3. `task_tag_relations`: vincular a tarefa à tag
4. `task_attachments`: um registro
   - file_name `briefing-teste.pdf`
   - file_url `b7e892cf-ea9e-4d15-86d8-5243bce7034c/{task_id}/1769000000000_briefing-teste.pdf`
   - file_type `application/pdf`, file_size `284512`
   - sem arquivo real no storage (o objetivo é só validar que a signed URL é gerada)

Nenhuma escrita em `task_activities` e nenhum webhook disparado manualmente.

## Entrega

Ao final devolvo o id da tarefa, o list_id, o workspace_id e o resultado da consulta de conferência (lista + space via tag "enviar cliente").

### Observação técnica
`task_tag_relations` e `task_attachments` precisam do id da tarefa; o SQL usará CTEs encadeadas (`with nova_tarefa as (insert … returning id)`) para inserir tudo numa só execução.

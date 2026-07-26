## Objetivo

Adicionar ao `supabase/functions/hub-inbox/index.ts` o tratamento do assunto `tarefa.listar_para_aprovacao`, mantendo intactos o gate de `HUB_INBOX_TOKEN`, o log em `relay_diagnostico_log` e o fluxo de `diagnostico.ping`. Nenhuma outra função é tocada.

## Verificações feitas

- `supabase/functions/api-gateway/index.ts` linhas 4-30: existem `resolveAttachmentUrls` e `resolveTasksAttachments`, que trocam `file_url` (path no bucket `task-attachments`) por signed URL de 3.888.000s via `createSignedUrls`. Como Edge Functions não compartilham módulos entre si, a função será **replicada** dentro do hub-inbox (api-gateway não é alterado).
- Tabela `tasks` possui de fato `list_id`, `parent_id`, `archived_at` e `description`.

## Alteração única: `supabase/functions/hub-inbox/index.ts`

1. Adicionar no topo, ao lado dos helpers já existentes, a cópia de `resolveAttachmentUrls` / `resolveTasksAttachments`.
2. Manter toda a estrutura atual (CORS, auth por token, insert em `relay_diagnostico_log`).
3. Substituir o `if (assunto !== "diagnostico.ping") return 422` por um roteamento por assunto: `diagnostico.ping` segue exatamente como está hoje; `tarefa.listar_para_aprovacao` vai para um novo handler; qualquer outro assunto continua retornando 422 `assunto_nao_suportado`.

### Handler do novo assunto

Validações:
- `modo !== "consulta"` → 422 `{ error: "modo_nao_suportado" }`
- `payload.list_ids` ausente/não-array/vazio → 422 `{ error: "list_ids_obrigatorio" }`

Consulta (client admin já criado no arquivo):
1. `lists` → `select id, workspace_id` com `in("id", list_ids)`. Nenhuma linha → `200 { tarefas: [] }`. Mais de um `workspace_id` distinto → 422 `listas_de_workspaces_distintos`.
2. `task_tags` → `select id` filtrando `workspace_id` e `ilike("name", "enviar cliente")` com `.maybeSingle()`. Não encontrada → `200 { tarefas: [] }`. O literal da tag nunca aparece na resposta.
3. `task_tag_relations` → `select task_id` por `tag_id`. Vazio → `200 { tarefas: [] }`.
4. `tasks` com o select combinado (`lists!inner(workspace_id, name, space_id, space:spaces(id, name))` + `task_attachments(id, file_url, file_name, file_type, file_size)`), `.in("id", taskIds)`, `.in("list_id", list_ids)`, `.eq("lists.workspace_id", ws)`, `.is("parent_id", null)`, `.is("archived_at", null)`, ordenado por `created_at` desc.
5. Resolver anexos com `resolveTasksAttachments` antes de montar a resposta.

Resposta 200:

```json
{ "tarefas": [ { "id": "...", "title": "...", "description": "<cru do banco>",
  "list_name": "Design", "space_name": "Cliente ACME",
  "attachments": [ { "id": "...", "url": "<signed>", "title": "briefing.pdf" } ] } ] }
```

- `list_name` = `lists.name`; `space_name` = `lists.space.name`; ausentes → `null`.
- `attachments` achatado para `{ id, url: file_url resolvido, title: file_name }`; nulo/vazio → `[]`.
- `description` devolvida sem qualquer conversão.

Erros: qualquer falha de banco → 500 `{ error: "erro_consulta" }`, com `console.error` contendo apenas a mensagem do erro (sem dados de tarefa). Lista vazia nunca é erro.

## Fora do escopo

Nenhuma escrita em tabelas, nenhum novo assunto, nenhuma mudança em `api-gateway`, `api-tasks`, `webhooks-*`, `sso-*` ou no frontend.

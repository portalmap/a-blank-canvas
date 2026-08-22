# Receber `calendario.publicar` na caixa de entrada (hub-inbox)

Objetivo: o Hub envia um calendário (cliente + lista de posts) em modo consulta; o MAP Flow cria uma tarefa por post e responde, post por post, com o código da tarefa e se ela foi criada agora ou já existia.

## O que entra no hub-inbox

Novo `case` no mesmo switch de assuntos, com schema Zod próprio:

```
{ id, origem, assunto: "calendario.publicar", modo: "consulta",
  payload: { name, cliente_chave, tasks: [ { external_post_ref, title,
    description?, social_channel?, format?, due_date?, attachments?: [
    { url, file_name?, file_type?, file_size? } ] } ] } }
```

Regras de validação: `cliente_chave` e `tasks` obrigatórios, `tasks` com pelo menos 1 item, cada post com `external_post_ref` e `title` obrigatórios. Payload inválido → 422 com o motivo, sem criar nada.

## 1. Resolver o cliente (uma vez só)

`cliente_chave` é comparado contra `workspaces.name` normalizado (minúsculo, sem acento, espaços aparados) no próprio banco. Zero correspondência → **rejeita a mensagem inteira** (`cliente_nao_encontrado`, 422) e nenhuma tarefa é criada. Mais de uma correspondência → `cliente_ambiguo` (422). Nunca cria workspace.

## 2. Lista e status de destino

Lista (primeira regra que resolver ganha):
1. `payload.list_id`, se o Hub mandar — validado como pertencente ao workspace resolvido.
2. Lista do workspace cujo nome normalizado seja `calendario` / `calendário` (a lista dedicada ao calendário de conteúdo).
3. Se o workspace tiver **exatamente uma** lista, usa essa.
4. Caso contrário → rejeita com `lista_destino_indefinida` e diz quais listas existem, para o Social Flow/Hub passar `list_id`.

Assim nada é criado "em lugar aleatório": ou a regra é inequívoca, ou a mensagem é recusada com instrução.

Status: o status default aplicável à lista, seguindo a hierarquia já usada pelo sistema — status de escopo `list` da lista, senão do `space`, senão do `workspace`, sempre o `is_default = true`; sem default, o de menor `order_index`. Nenhum default encontrado → `status_destino_indefinido` (422).

Autor: `created_by_user_id` = criador do workspace; se o workspace não tiver criador, o proprietário global do sistema. Nenhum dos dois → rejeita (a coluna é obrigatória).

## 3. Idempotência (duas camadas)

- **Por mensagem**: tabela nova `hub_inbox_processed` (`mensagem_id` único, `assunto`, `resposta` jsonb, `criado_em`). Se a mesma `id` de mensagem chegar de novo, devolve a resposta guardada, sem reprocessar.
- **Por post**: antes de inserir, busca tarefa com aquele `external_post_ref` no workspace. Se existir, reaproveita (`status: "ja_existia"`). O índice único parcial em (`workspace_id`, `external_post_ref`) é a rede de segurança: violação de unicidade em corrida é tratada relendo a tarefa existente, não como erro.

Post sem `external_post_ref` não é aceito (é a chave de idempotência) — validação Zod já barra.

## 4. Anexos

Para cada anexo do post, um registro em `task_attachments` (`file_name`, `file_url`, `file_type`, `file_size`, `uploaded_by` = mesmo autor da tarefa). Só para tarefas criadas agora; tarefa que já existia não recebe anexo duplicado. Falha de anexo é registrada em log e não invalida a tarefa (a tarefa é o dado principal).

## 5. Resposta ao Hub

```json
{ "cliente": { "workspace_id": "…", "name": "TESTE HUB" },
  "list_id": "…",
  "resultados": [
    { "external_post_ref": "post-1", "task_id": "…", "status": "criada" },
    { "external_post_ref": "post-2", "task_id": "…", "status": "ja_existia" }
  ] }
```

Um item por post, na mesma ordem em que chegou, sempre com o `external_post_ref` original ecoado — é assim que o Social Flow casa cada código com o post certo.

## O que NÃO muda

- SSO (`sso-exchange`, rotas `/sso/*`) — intocado.
- `diagnostico.ping` e `tarefa.listar_para_aprovacao` — o código atual permanece idêntico; o novo assunto é um `case` adicional antes do 422 final.
- `verify_jwt = false` e a comparação de token em tempo constante — mantidos como estão.
- Nenhuma outra edge function é tocada.

## Detalhes técnicos

- `supabase/functions/hub-inbox/index.ts`: handler `handleCalendarioPublicar(admin, modo, payload, mensagemId, origin)`; `modo !== "consulta"` → `modo_nao_suportado`.
- Zod via `https://esm.sh/zod@3`.
- Normalização de nome no Postgres: função `imutable` auxiliar ou `lower(unaccent(...))`; se `unaccent` não estiver disponível, `translate()` para os acentos usados em português.
- Migration: tabela `hub_inbox_processed` com RLS ligada, sem política para `anon`/`authenticated`, `GRANT ALL ... TO service_role` (uso exclusivo da edge function).
- Log em `relay_diagnostico_log` continua acontecendo antes do processamento, como hoje.

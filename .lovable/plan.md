# Receber `briefing.publicar` no hub-inbox (briefing = subtarefa)

Novo módulo isolado dentro de `supabase/functions/hub-inbox/index.ts`, no mesmo padrão dos módulos que já existem. Nenhum assunto atual é tocado.

## 1. Entrada

Schema Zod próprio (`BriefingSchema`), separado dos demais:

- raiz: `name` (opcional, só referência do cliente — não resolve Space), `subtasks` (lista, mínimo 1)
- cada item: `parent_id` (obrigatório), `external_briefing_ref` (obrigatório), `title` (obrigatório), `description`, `social_channel`, `attachments` (lista de `{ file_name?, file_url }`, pode vir vazia)

Payload inválido → 422 com a mesma forma de erro já usada (`payload_invalido` + campo/motivo).

## 2. Criação da subtarefa (por item)

1. Buscar a mãe: `tasks` por `id = parent_id`, lendo `id, workspace_id, list_id`. Não achou → item devolve `{ external_briefing_ref, status: "erro", error: "tarefa_mae_nao_encontrada" }` e o laço continua.
2. Autor técnico: criador do workspace da mãe (mesma função já usada pelo `calendario.publicar`).
3. `status_id`: reusa a resolução de status da lista já existente (hierarquia lista → space → workspace) e escolhe o status marcado como padrão; sem padrão, o de menor `order_index`.
4. Insert em `tasks` com: `parent_id`, `workspace_id` e `list_id` herdados da mãe, `status_id` resolvido, `title`, `description`, `social_channel`, `external_post_ref = external_briefing_ref`, `created_by_user_id = autor técnico`.
5. Atividade `subtask.created` em `task_activities` na tarefa-mãe, `user_id` = autor técnico, `metadata` com `subtask_id` e `subtask_title` — igual ao `useCreateSubtask` da interface.

Se o insert da subtarefa falhar, o item devolve erro e nada parcial é criado (anexos e atividade só rodam depois do insert bem-sucedido).

## 3. Idempotência

Duas camadas, iguais às do `calendario.publicar`:

- **Por mensagem:** `hub_inbox_processed` guarda `mensagem_id` + resposta; reenvio da mesma mensagem devolve a resposta gravada sem reprocessar.
- **Por briefing:** antes de inserir, consulta `tasks` por `workspace_id` da mãe + `external_post_ref = external_briefing_ref`. Se existir, devolve essa linha com `status: "ja_existia"` e não duplica. O banco já garante isso com o índice único parcial `tasks_workspace_external_post_ref_uidx (workspace_id, external_post_ref)`.
- Detalhe de borda: se a referência do briefing coincidir com a `external_post_ref` de uma tarefa que **não** é subtarefa dessa mãe, o índice único bloquearia o insert. Nesse caso a subtarefa é gravada com a referência prefixada (`briefing:<ref>`), e a mesma regra é usada na checagem de duplicidade — o eco na resposta continua sendo o `external_briefing_ref` original.

## 4. Anexos

Reaproveita exatamente o padrão de anexos da decisão do cliente: download da URL assinada → upload no bucket `task-attachments` no path `autor_tecnico/subtarefa_id/timestamp_nome` (nome sanitizado) → registro em `task_attachments` com `task_id` = id da **subtarefa**, `uploaded_by` = autor técnico, `file_url` = path no bucket, `file_type`/`file_size` preenchidos.

Falha de um anexo (download, upload ou registro) é logada e devolvida como item de anexo com erro; a subtarefa continua válida e os outros anexos seguem.

## 5. Resposta síncrona ao Hub

```text
{
  assunto: "briefing.publicar",
  status: "ok",
  resultados: [
    { external_briefing_ref, id: "<uuid da subtarefa>", parent_id, status: "criada" | "ja_existia", anexos: [...] },
    { external_briefing_ref, status: "erro", error: "tarefa_mae_nao_encontrada" }
  ]
}
```

`id` é o campo canônico do subtarefa_id no MAP Flow, permitindo ao Social Flow casar cada briefing com sua subtarefa. Nada é enviado de volta ao Portal/Social Flow além dessa resposta.

## 6. O que continua intacto

- `calendario.publicar`, `calendario.post.aprovado`, `calendario.post.reprovado`, `tarefa.listar_para_aprovacao` e `diagnostico.ping`: nenhuma linha alterada; só um novo `if (assunto === "briefing.publicar")` no mesmo roteador.
- `verify_jwt = false` em `supabase/config.toml` e a validação de token da função: mantidos como estão.
- SSO (`sso-exchange`, rotas `/sso/*`, `session-guard`): não tocados.
- Banco: **nenhuma migration** — todas as colunas e índices necessários já existem.

## Detalhes técnicos

Arquivo único alterado: `supabase/functions/hub-inbox/index.ts` (novas funções `resolverStatusPadraoDaLista`, `processarAnexosSubtarefa` reutilizando o helper existente, `tratarBriefingPublicar`), mais o deploy da função.

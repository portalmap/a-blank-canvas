# Diagnóstico completo — chaves de campos por fluxo (nada alterado)

## RECEBE (hub-inbox)

### 1. `calendario.publicar` (modo entrega)

Raiz (`CalendarioSchema`):

```text
name           string | null      opcional
cliente_chave  string            OBRIGATÓRIO
tasks          array (mín. 1)    OBRIGATÓRIO
```

Cada item de `tasks` (`PostSchema`):

```text
external_post_ref  string   OBRIGATÓRIO
title              string   OBRIGATÓRIO
description        string?  opcional (aceita null)
social_channel     string?  opcional
format             string?  opcional
due_date           string?  opcional
attachments        array    opcional
```

Cada anexo (`AnexoSchema`):

```text
url        string   OBRIGATÓRIO   <- URL do arquivo
file_name  string   opcional      <- nome (se ausente, deriva do final da url)
file_type  string   opcional
file_size  number   opcional
```

### 2. `calendario.post.aprovado` / `calendario.post.reprovado` (modo entrega)

Raiz (`DecisaoSchema`):

```text
aprovador_nome  string          OBRIGATÓRIO
tasks           array (mín. 1)  OBRIGATÓRIO
```

Cada item (`DecisaoItemSchema`):

```text
id           uuid     OBRIGATÓRIO  (tasks.id do MAP Flow)
comentario   string?  opcional
attachments  array    opcional
```

Cada anexo (`DecisaoAnexoSchema`):

```text
file_url   string  OBRIGATÓRIO  <- URL do arquivo
file_name  string  opcional     <- nome
```

### 3. `briefing.publicar` (modo consulta)

Raiz (`BriefingSchema`):

```text
name      string | null   opcional
subtasks  array (mín. 1)  OBRIGATÓRIO
```

Cada item (`BriefingItemSchema`):

```text
parent_id              uuid     OBRIGATÓRIO (tarefa-mãe)
external_briefing_ref  string   OBRIGATÓRIO
title                  string   OBRIGATÓRIO
description            string?  opcional
social_channel         string?  opcional
attachments            array    opcional
```

Cada anexo (`BriefingAnexoSchema`):

```text
file_url   string  OBRIGATÓRIO  <- URL do arquivo
file_name  string  opcional     <- nome
```

## ENVIA

### 4. `calendario.aprovacao` (MAP Flow → Hub → Portal, ao marcar a tag)

Envelope: `destinos: ["portal-map"]`, `assunto`, `modo: "entrega"`, `referencia_origem`, `payload`.

Payload raiz:

```text
name   nome do cliente (spaces.client_name > spaces.name > workspaces.name)
tasks  lista com 1 item
```

Item de `tasks`:

```text
id              tasks.id
title
description
social_channel
format
due_date
attachments     lista
```

Cada anexo:

```text
file_url   URL assinada (45 dias)  <- URL do arquivo
file_name  nome do arquivo         <- nome
```

Não envia `url`, `title`, `file_type`, `attachment_id` nem `image_url`.

## RESPONDE

### 5. `tarefa.listar_para_aprovacao` (consulta do Portal)

```text
{ tarefas: [ { id, title, description, list_name, space_name,
               attachments: [ { attachment_id, url, title } ] } ] }
```

Anexo na resposta: **`url`** (URL assinada) e **`title`** (nome do arquivo), mais `attachment_id`.

### 6. Respostas de `calendario.publicar` e `briefing.publicar`

`calendario.publicar`:

```text
{
  cliente: { nome_recebido, client_name, space_id, space_name },
  workspace_id, list_id, list_name,
  resultados: [ { external_post_ref, task_id, status: "criada"|"ja_existia"|... , error? } ]
}
```

`briefing.publicar`:

```text
{
  assunto: "briefing.publicar", status: "ok", cliente,
  resultados: [ { external_briefing_ref, id, parent_id, status: "criada"|"ja_existia"|"erro",
                  anexos: [ { file_name, status: "ok"|"erro", error? } ], error? } ]
}
```

Decisões (`calendario.post.*`) respondem:

```text
{ decisao, aprovador_nome,
  resultados: [ { id, status, comment_id, cliente_devolucoes_count?,
                  tag_enviar_aprovacao_removida?,
                  attachments: [ { file_name, status, error? } ] } ] }
```

## Resumo das chaves de anexo

| Fluxo | Direção | Chave da URL | Chave do nome | Extras |
|---|---|---|---|---|
| `calendario.publicar` | recebe e anexa na tarefa | `url` | `file_name` | `file_type`, `file_size` |
| `calendario.post.aprovado/reprovado` | recebe e anexa na tarefa | `file_url` | `file_name` | — |
| `briefing.publicar` | recebe e anexa na subtarefa | `file_url` | `file_name` | — |
| `calendario.aprovacao` | **envia a arte** ao Portal | `file_url` | `file_name` | — |
| `tarefa.listar_para_aprovacao` | **responde a arte** ao Portal | `url` | `title` | `attachment_id` |

Distinção "anexo que recebo" vs "arte que eu envio": ela **não é consistente hoje**.

- Entradas: usam `file_url`+`file_name`, exceto `calendario.publicar`, que usa `url`+`file_name`.
- Saídas para o Portal: a **consulta** usa `url`+`title` (formato que o Portal entende no mockup), mas o **envio ativo** (`calendario.aprovacao`) usa `file_url`+`file_name`.

É exatamente essa divergência nas duas saídas que explica o anexo não aparecer no mockup do Portal quando a tag "enviar aprovação" é usada, mesmo com entrega confirmada (200).

Nada foi alterado — apenas diagnóstico.

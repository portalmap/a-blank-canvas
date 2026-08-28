# Diagnóstico — Nomes das chaves de anexo por fluxo (nada alterado)

## 1. ENVIO `calendario.aprovacao` (relay-approval.server.ts) — MAP Flow → Hub → Portal

Cada anexo é montado com:

```text
{ "file_name": "<nome do arquivo>", "file_url": "<URL assinada>" }
```

- Arquivo/URL: **`file_url`**
- Nome: **`file_name`**

## 2. RESPOSTA `tarefa.listar_para_aprovacao` (hub-inbox) — Portal consulta o MAP Flow

Cada anexo volta com:

```text
{ "attachment_id": "<id>", "url": "<URL assinada>", "title": "<nome do arquivo>", ... }
```

- Arquivo/URL: **`url`** (resolvida para URL assinada antes de responder; se não resolver, volta `null`)
- Nome: **`title`**
- Bônus: **`attachment_id`** (id do registro em `task_attachments`)

## 3. RECEBIMENTO (hub-inbox) — outros sistemas → MAP Flow

### 3a. `calendario.publicar` (posts vindos do Social Flow/Hub)

Zod (`AnexoSchema`):

```text
url: string (obrigatório)
file_name: string (opcional)
file_type: string (opcional)
```

- Arquivo/URL: **`url`** (obrigatório)
- Nome: **`file_name`** (opcional; se ausente, deriva do final da `url`)
- Bônus: **`file_type`** (opcional)

### 3b. `calendario.post.aprovado` / `calendario.post.reprovado` (decisão do cliente, vinda do Portal)

Zod (`DecisaoAnexoSchema`):

```text
file_url: string (obrigatório)
file_name: string (opcional)
```

- Arquivo/URL: **`file_url`** (URL assinada do Portal; o MAP Flow baixa e regrava no bucket próprio)
- Nome: **`file_name`** (opcional; se ausente, deriva do final da `file_url`)

### 3c. `briefing.publicar` (briefings do Hub viram subtarefas)

Zod (`BriefingAnexoSchema`):

```text
file_url: string (obrigatório)
file_name: string (opcional)
```

- Arquivo/URL: **`file_url`**
- Nome: **`file_name`** (opcional; mesma derivação pelo final da `file_url`)

## Resumo

| Fluxo | Chave do arquivo/URL | Chave do nome |
|---|---|---|
| Envio `calendario.aprovacao` | `file_url` | `file_name` |
| Resposta `tarefa.listar_para_aprovacao` | `url` | `title` |
| Entrada `calendario.publicar` | `url` | `file_name` |
| Entrada decisões `calendario.post.*` | `file_url` | `file_name` |
| Entrada `briefing.publicar` | `file_url` | `file_name` |

## Ponto de atenção (ligado ao problema dos anexos no Portal)

O mockup do Portal MAP lê anexos pelas chaves **`url` + `title`** (mesmas chaves que o próprio MAP Flow usa na resposta de `tarefa.listar_para_aprovacao`). O envio `calendario.aprovacao`, porém, sai com **`file_url` + `file_name`** — é o único fluxo que conversa com o Portal usando essa nomenclatura. É essa diferença que faz o anexo não aparecer no mockup mesmo com entrega confirmada (200).

Nenhuma alteração foi feita — apenas diagnóstico.

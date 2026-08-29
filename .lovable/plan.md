# Diagnóstico — chaves reais dos três fluxos (nada alterado)

## 1. RECEBE `briefing.publicar` (do Hub)

### Schema Zod

Raiz (`BriefingSchema`):

```text
name      string | null   opcional
subtasks  array (min 1)   OBRIGATÓRIO
```

Cada item (`BriefingItemSchema`):

```text
parent_id              string (uuid)  OBRIGATÓRIO
external_briefing_ref  string (min 1) OBRIGATÓRIO
title                  string (min 1) OBRIGATÓRIO
description            string | null  opcional
social_channel         string | null  opcional
attachments            array          opcional
```

Cada anexo (`BriefingAnexoSchema`):

```text
file_url   string (min 1)  OBRIGATÓRIO  <- URL do arquivo
file_name  string          opcional     <- nome do arquivo
```

### Resposta devolvida

```text
{
  assunto: "briefing.publicar",
  status: "ok",
  cliente: string | null,      // eco do name
  resultados: [ ... ]
}
```

Item de `resultados` — sucesso:

```text
{
  external_briefing_ref: string,
  id: string,            // uuid da subtarefa criada
  parent_id: string,
  status: "criada",
  anexos: [ { file_name, status, error? } ]
}
```

Item já existente:

```text
{ external_briefing_ref, id, parent_id, status: "ja_existia" }
```

Item com erro:

```text
{ external_briefing_ref, status: "erro", error: "tarefa_mae_nao_encontrada"
                                              | "autor_tecnico_nao_encontrado"
                                              | "status_nao_encontrado"
                                              | "criacao_falhou" }
```

## 2. ENVIA `calendario.aprovacao` (para portal-map, com anexo)

Payload real do último envio (2026-08-29 10:08:14 UTC, `status_code` 200):

```json
{
  "name": "Assessoria MAP",
  "tasks": [
    {
      "id": "e2322362-1102-4c6a-b7aa-3f5ad862d244",
      "title": "POST 1 | OUTUBRO | Instagram | Outubro Teste começa pela clareza",
      "description": "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null},\"content\":[{\"type\":\"text\",\"text\":\"GOSTEI MUITO, BORA APARECER NAS REDES SOCIAIS\"}]}]}",
      "social_channel": "Instagram",
      "format": null,
      "due_date": "2026-08-27",
      "attachments": [
        {
          "file_name": "briefing-instagram-77f66973-15fb-494e-99fd-a05916e80fae.png",
          "file_url": "https://efqnscrnyyyjpswctahq.supabase.co/storage/v1/object/sign/task-attachments/.../1787950538066_briefing-instagram-....png?token=..."
        }
      ]
    }
  ]
}
```

Envelope enviado ao Hub:

```text
{
  destinos: ["portal-map"],
  assunto: "calendario.aprovacao",
  modo: "entrega",
  referencia_origem: <tasks.id>,
  payload: { ...acima }
}
```

Chaves:

```text
raiz do payload:  name, tasks
cada item:        id, title, description, social_channel, format, due_date, attachments
cada anexo:       file_url  (URL do arquivo, assinada 45 dias)
                  file_name (nome do arquivo)
```

Observação factual: `description` sai como **string JSON do TipTap**, não texto puro. `format` saiu `null`.

## 3. RECEBE `calendario.post.aprovado` / `calendario.post.reprovado` (do Portal)

### Schema Zod

Raiz (`DecisaoSchema`):

```text
aprovador_nome  string (min 1)  OBRIGATÓRIO
tasks           array (min 1)   OBRIGATÓRIO
```

Cada item (`DecisaoItemSchema`):

```text
id           string (uuid)  OBRIGATÓRIO   // tasks.id do MAP Flow
comentario   string | null  opcional
attachments  array          opcional
```

Cada anexo (`DecisaoAnexoSchema`):

```text
file_url   string (min 1)  OBRIGATÓRIO  <- URL do arquivo
file_name  string          opcional     <- nome do arquivo
```

## Resumo das chaves de anexo nos três fluxos

| Fluxo | Direção | URL | Nome |
|---|---|---|---|
| `briefing.publicar` | recebe | `file_url` | `file_name` |
| `calendario.aprovacao` | envia | `file_url` | `file_name` |
| `calendario.post.aprovado/reprovado` | recebe | `file_url` | `file_name` |

Esses três são consistentes entre si. A única saída que difere é a resposta de `tarefa.listar_para_aprovacao`, que usa `url` + `title`.

Nada foi alterado — apenas diagnóstico.

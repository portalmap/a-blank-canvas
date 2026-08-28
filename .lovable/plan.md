# Diagnóstico — decisão do cliente e envio de aprovação (nada alterado)

## 1. RECEBE `calendario.post.aprovado` / `calendario.post.reprovado` (do Portal MAP)

### Schema Zod

Raiz (`DecisaoSchema`):

```text
aprovador_nome  string (min 1)  OBRIGATÓRIO
tasks           array (min 1)   OBRIGATÓRIO
```

Cada item (`DecisaoItemSchema`):

```text
id          string (uuid)   OBRIGATÓRIO
comentario  string | null   opcional
attachments array           opcional
```

### O que faz com cada campo

- `aprovador_nome`: usado no texto do comentário e na atividade (`Cliente {aprovador_nome} aprovou.` / `devolveu`).
- `tasks.id`: `tasks.id` da tarefa no MAP Flow. Localiza a tarefa; se não achar, retorna erro no resultado do item.
- `tasks.comentario`: texto opcional do cliente. Sempre cria um `task_comments` e um `task_activities` (`activity_type = 'comment.created'`) com a decisão e o nome do aprovador no metadata.
- `tasks.attachments`: para cada anexo, baixa da URL, sobe no bucket `task-attachments` e registra em `task_attachments` + atividade `attachment.added`.

Ações extras:

- Se `reprovado`: incrementa `tasks.cliente_devolucoes_count` em +1.
- Em ambos (`aprovado` e `reprovado`): remove a tag "enviar aprovação" (`78b84f6c-b619-40bd-94f8-c1c2a63842c0`) da tarefa, se existir.
- Idempotência: se o `mensagem_id` já existir em `hub_inbox_processed`, devolve a resposta salva sem reprocessar.

## 2. ENVIA `calendario.aprovacao` (MAP Flow → Portal MAP, ao marcar a tag)

### Envelope completo

```text
{
  destinos: ["portal-map"],
  assunto: "calendario.aprovacao",
  modo: "entrega",
  referencia_origem: string,  // tasks.id
  payload: {
    name: string | null,       // nome do cliente
    tasks: [
      {
        id: string,
        title: string,
        description: string | null,
        social_channel: string | null,
        format: string | null,
        due_date: string | null,
        attachments: [
          {
            file_name: string,
            file_url: string   // URL assinada (45 dias)
          }
        ]
      }
    ]
  }
}
```

### Chaves do payload (sem anexo)

Raiz do `payload`:

```text
name   string | null
 tasks  array (1 item)
```

Cada item de `tasks`:

```text
id              string
title           string
description     string | null
social_channel  string | null
format          string | null
due_date        string | null
attachments     array
```

Nada será alterado — apenas diagnóstico.

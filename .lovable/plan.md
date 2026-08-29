# Diagnóstico — decisões recebidas do Portal (nada alterado)

Tarefa envolvida nas duas mensagens: `67602c0c-9171-47ff-8a33-17183a0899a9`.

## 1. Payload que CHEGOU — `calendario.post.reprovado`

Recebido em **2026-08-29 09:47:36.825 UTC** (`direcao: recebido`, `modo: entrega`).

```json
{
  "aprovador_nome": "Portal MAP",
  "tasks": [
    {
      "id": "67602c0c-9171-47ff-8a33-17183a0899a9",
      "comentario": "não goste, sou chato",
      "attachments": []
    }
  ]
}
```

Sem anexos nessa devolução.

## 2. Payload que CHEGOU — `calendario.post.aprovado`

Recebido em **2026-08-29 09:50:18.916 UTC**.

```json
{
  "aprovador_nome": "Portal MAP",
  "tasks": [
    {
      "id": "67602c0c-9171-47ff-8a33-17183a0899a9",
      "comentario": "AGORA SIM POW",
      "attachments": [
        {
          "file_name": "1787997000661_favicon_strike_jiujitsu.png",
          "file_url": "https://<portal>.supabase.co/storage/v1/object/sign/task-attachments/.../1787997000661_favicon_strike_jiujitsu.png?token=..."
        }
      ]
    }
  ]
}
```

### Chaves confirmadas

```text
raiz:      aprovador_nome, tasks
item:      id, comentario, attachments
anexo:     file_url  (URL do arquivo)
           file_name (nome do arquivo)
```

## 3. Confirmações com timestamp

### Devolução (reprovado)

```text
09:47:38.672  comentário criado (task_comments ddf5bb47...)
              "Cliente Portal MAP devolveu. Comentário: não goste, sou chato"
09:47:38.941  atividade comment.created (decisao: devolvido)
09:47:40.109  atividade tag.removed — "enviar aprovação" removida
              contador cliente_devolucoes_count = 1  (subiu, OK)
```

Nenhum anexo veio, portanto nada a baixar.

### Aprovação

```text
09:50:21.136  comentário criado (task_comments 2abe3373...)
              "Cliente Portal MAP aprovou. Comentário: AGORA SIM POW"
09:50:21.389  atividade comment.created (decisao: aprovado)
09:50:21.905  atividade tag.removed — "enviar aprovação" removida
09:50:23.432  anexo baixado e registrado (task_attachments d833caa7...)
              file_name: 1787997000661_favicon_strike_jiujitsu.png
              storage: b7e892cf.../67602c0c.../1787997022967_...png
              tipo: image/png, 22.385 bytes
09:50:23.697  atividade attachment.added (origem: hub, decisao: aprovado)
```

Contador não foi tocado na aprovação — correto (só sobe no reprovado).

## Resumo

Tudo funcionou nos dois fluxos:

- comentário criado — sim, nos dois;
- contador de devolução — subiu para 1 no reprovado;
- anexo do cliente — baixado do Portal, subido no bucket local `task-attachments` e registrado com atividade visível.

Nada foi alterado — apenas diagnóstico.

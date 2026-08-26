# Plano: remover etiqueta "enviar aprovação" quando o Portal devolver o post

## Objetivo

Quando o Hub entregar `calendario.post.reprovado` (cliente devolveu o post), o MAP Flow remove a etiqueta **"enviar aprovação"** (id `78b84f6c-b619-40bd-94f8-c1c2a63842c0`) da tarefa, além do que já faz hoje (comentário, atividade e contador de devoluções).

Assim a etiqueta sai do ciclo: o usuário ajusta a tarefa e adiciona a etiqueta novamente para reenviar ao Portal — e o disparo de saída (`relay-approval`) volta a funcionar porque a etiqueta foi removida e readicionada.

## Diagnóstico confirmado

- `supabase/functions/hub-inbox/index.ts`, função que trata `calendario.post.aprovado/reprovado` (linhas ~831-989):
  - já cria comentário, atividade e incrementa `cliente_devolucoes_count` no reprovado;
  - **não** remove nenhuma etiqueta — é o que falta.
- A remoção será apenas no **reprovado** (devolução). No aprovado a etiqueta permanece.

## Mudança

### `supabase/functions/hub-inbox/index.ts`

Dentro do loop de tarefas, no bloco `if (!aprovado)` (após incrementar o contador):

1. Deletar de `task_tag_relations` o registro com `task_id = task.id` e `tag_id = 78b84f6c-b619-40bd-94f8-c1c2a63842c0` (delete simples via client admin; se não existir, nada acontece).
2. Falha nessa remoção não invalida o resto do processamento — loga no console e segue (mesmo padrão dos anexos).
3. Incluir no resultado do item: `tag_enviar_aprovacao_removida: true/false` para rastreio na resposta ao Hub.

Nenhuma mudança em:
- frontend (a interface já reflete a remoção via invalidação de queries ao recarregar);
- `calendario.post.aprovado`;
- fluxo de saída (`relay-approval`).

## Validação

1. Marcar a etiqueta "enviar aprovação" numa tarefa de teste.
2. Simular (ou aguardar) um `calendario.post.reprovado` vindo do Hub para essa tarefa.
3. Confirmar: comentário/atividade criados, contador incrementado **e** a etiqueta ausente na tarefa.
4. Readicionar a etiqueta e confirmar que o relay de saída dispara novamente.
5. Deploy da edge function `hub-inbox` após a alteração.

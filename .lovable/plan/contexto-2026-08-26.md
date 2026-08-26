Ajustar a remoção da etiqueta "enviar aprovação" também no fluxo de aprovação.

## Contexto
O MAP Flow recebe do Hub as decisões `calendario.post.aprovado` e `calendario.post.reprovado` na Edge Function `supabase/functions/hub-inbox/index.ts`. Hoje a etiqueta "enviar aprovação" (`task_tags.id = 78b84f6c-b619-40bd-94f8-c1c2a63842c0`) é removida da tarefa somente no caso `reprovado`. O usuário solicitou que a etiqueta seja removida em ambos os casos, pois aprovado também encerra o ciclo de aprovação.

## O que será feito
1. Em `supabase/functions/hub-inbox/index.ts`, dentro da função `handleCalendarioDecisao`, mover o bloco de exclusão da relação em `task_tag_relations` para fora da condição `if (!aprovado)`, passando a executar tanto para aprovado quanto para reprovado.
2. Ajustar a montagem da resposta para incluir o campo `tag_enviar_aprovacao_removida` também quando aprovado.
3. Garantir que a idempotência continue respeitada: a remoção da etiqueta ocorre junto com o comentário/atividade, e uma segunda mensagem com o mesmo `id` retorna a resposta já processada.
4. Realizar o deploy da Edge Function `hub-inbox` para aplicar a mudança no ambiente.

## Escopo fora deste plano
- Nenhuma alteração no schema do banco.
- Nenhuma alteração no envio de aprovação (MAP Flow → Hub) ou no Portal MAP.
- Nenhuma alteração na lógica de comentários, anexos ou contador de devoluções.

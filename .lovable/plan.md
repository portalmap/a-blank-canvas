# Corrigir chat: mensagens só aparecem após recarregar

## Diagnóstico (confirmado)

A lista de mensagens do chat depende 100% do realtime: ao enviar, o código **não** adiciona a mensagem na lista nem revalida a consulta — ele espera o evento `INSERT` do banco chegar por realtime para inserir a mensagem na tela.

Consultei o banco: a publicação de realtime (`supabase_realtime`) está **vazia** — nenhuma tabela publicada. Ou seja, nenhum evento de banco é entregue ao navegador, nem em `chat_messages` nem em outras telas que usam o mesmo mecanismo (notificações, etc.). Por isso só aparece depois de atualizar a página.

## O que será feito

1. **Ligar o realtime no banco** para as tabelas do chat e das demais telas que já escutam eventos: mensagens, reações, fixadas, membros/canais de chat e notificações. Inclui definir `REPLICA IDENTITY FULL` para que updates/deletes cheguem completos.
2. **Não depender só do realtime** (rede instável, aba em segundo plano, permissão): ao enviar, a mensagem passa a aparecer imediatamente na conversa, e a lista é revalidada logo depois. Isso também cobre anexos e respostas em thread.
3. **Evitar duplicidade**: a inserção imediata e o evento de realtime serão reconciliados por ID, então a mensagem nunca aparece duas vezes.
4. **Verificação**: teste real no preview enviando mensagem em um canal e conferindo que aparece sem recarregar, e que continua aparecendo após o refresh.

## Detalhes técnicos

- Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE ...` para `chat_messages`, `chat_message_reactions`, `chat_pinned_messages`, `chat_channels`, `chat_channel_members`, `notifications` (apenas as que existirem e que já tenham listeners), + `ALTER TABLE ... REPLICA IDENTITY FULL`.
- `src/hooks/useChat.ts`: em `useSendMessage`, adicionar `onSuccess` com `setQueryData` (append da mensagem retornada pelo insert, com o perfil do remetente do cache/consulta) e `invalidateQueries(['chat-messages', channelId])`; no handler de realtime `INSERT`, ignorar mensagem cujo `id` já exista na lista.
- Nada de mudança em RLS ou em regras de negócio do chat; o escopo é entrega de eventos + atualização otimista.

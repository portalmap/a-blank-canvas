
# Abrir Chat Diretamente no Canal e Mensagem Referenciada

## Resumo

Quando o usuario clica no link de um comentario atribuido no chat (ex: "#MAP | Monvizo Chat"), o sistema navega para `/chat?channel=xxx` mas nao abre o canal correspondente. O problema e que `Chat.tsx` nao le os parametros da URL. Alem disso, vamos adicionar suporte para rolar ate a mensagem especifica e destaca-la visualmente.

## Alteracoes

### 1. `src/pages/Chat.tsx`

- Importar `useSearchParams` do `react-router-dom`
- Ler os parametros `channel` e `message` da URL
- Quando `channel` estiver presente na URL e os canais estiverem carregados, selecionar automaticamente esse canal
- Passar o `messageId` (se presente) para o `ChatRoom` como prop `highlightMessageId`

### 2. `src/components/home/AssignedCommentsCard.tsx`

- Atualizar a navegacao para incluir o ID da mensagem na URL: `/chat?channel={channelId}&message={messageId}`

### 3. `src/components/chat/ChatRoom.tsx`

- Receber nova prop opcional `highlightMessageId`
- Quando presente, apos as mensagens carregarem, rolar ate o elemento da mensagem referenciada (usando `scrollIntoView`)
- Passar o `highlightMessageId` para `ChatMessageItem`

### 4. `src/components/chat/ChatMessageItem.tsx`

- Receber prop opcional `highlightMessageId`
- Se o ID da mensagem corresponder, aplicar um efeito visual de destaque (fundo amarelo/primary com fade-out animado via CSS)
- Adicionar um `id` ou `data-message-id` no elemento para permitir scroll programatico

## Fluxo esperado

1. Usuario clica no link "#MAP | Monvizo Chat" no card de comentarios atribuidos
2. Navega para `/chat?channel=abc123&message=msg456`
3. `Chat.tsx` le o parametro `channel`, seleciona o canal `abc123`
4. `ChatRoom` carrega as mensagens e rola ate `msg456`
5. A mensagem `msg456` pisca com destaque por ~2 segundos e depois volta ao normal

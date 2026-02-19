
# Corrigir exibicao do nome dos canais de Space no Chat

## Problema

Na sidebar do chat, os canais de Space exibem o nome do **Space** (`channel.spaces?.name`) em vez do nome do **canal** (`channel.name`). Os nomes dos canais no banco de dados ja possuem " Chat" no final (ex: "MAP | Gabbai Chat"), mas a UI mostra apenas o nome do Space (ex: "MAP | Gabbai").

O mesmo problema ocorre no `ChatRoom` (header do chat) em `Chat.tsx`.

## Solucao

Alterar a sidebar e a pagina do chat para sempre usar `channel.name` em vez de `channel.spaces?.name` nos canais de tipo Space.

## Alteracoes

### 1. `src/components/chat/ChatSidebar.tsx`

- **Linha 252**: Trocar `{channel.spaces?.name || channel.name}` por `{channel.name}`
- **Linhas 121-124**: Ajustar a ordenacao para usar `channel.name` em vez de `channel.spaces?.name`

### 2. `src/pages/Chat.tsx`

- **Linhas 39-42**: No `channelName` passado ao `ChatRoom`, trocar a logica que prioriza `spaces?.name` para usar diretamente `selectedChannel.name`

Nenhuma alteracao de banco de dados e necessaria.



# Emojis Maiores no Chat

## Resumo

Detectar quando uma mensagem contém **apenas emojis** (sem texto) e renderizá-la com tamanho maior (~dobro). Mensagens mistas (texto + emoji) mantêm o tamanho normal.

## Alteração

### Editar `src/components/chat/ChatMessageItem.tsx`

1. Criar função `isOnlyEmojis(text)` que verifica se o conteúdo contém apenas emojis (usando regex Unicode)
2. Na renderização do conteúdo (linha 141), aplicar classe `text-2xl` quando a mensagem for só emojis, mantendo `text-sm` para mensagens normais

## Arquivos

- 1 editado: `ChatMessageItem.tsx`


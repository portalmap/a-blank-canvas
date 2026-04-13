

# Correção: Palavras ainda sendo cortadas no chat

## Problema

O `overflow-hidden` no parágrafo está cortando o texto que deveria simplesmente descer para a próxima linha. O `break-words` já garante que palavras inteiras desçam quando não cabem — mas o `overflow-hidden` esconde o conteúdo que transborda, causando o corte visual.

## Correção

### Editar `src/components/chat/ChatMessageItem.tsx` — linha 148

Remover `overflow-hidden` da classe do parágrafo:

- De: `"whitespace-pre-wrap break-words overflow-hidden"`
- Para: `"whitespace-pre-wrap break-words"`

A proteção contra overflow já está nos containers pai (`min-w-0` no ChatRoom e `overflow-hidden` no Chat.tsx), então não precisamos dele no `<p>`.

## Arquivo

- 1 editado: `ChatMessageItem.tsx`




# Correção: Texto do chat não quebra linha — fica em linha reta

## Problema

O texto das mensagens não está quebrando para a próxima linha. Ele continua em linha reta e a parte que não cabe simplesmente some (cortada pelo `overflow-hidden`) ou fica escondida.

## Causa

O `ScrollArea` (Radix) e o container de mensagens (`div.space-y-4`) não possuem restrição de largura. Mesmo com `min-w-0` nos containers acima, o conteúdo dentro do ScrollArea pode se expandir horizontalmente sem limite. O `break-words` só funciona quando o container tem uma largura máxima definida.

## Correção

### 1. `src/components/chat/ChatRoom.tsx` — linha 117

Adicionar `min-w-0` ao ScrollArea para que ele respeite a largura do pai:

- De: `<ScrollArea className="flex-1 p-4">`
- Para: `<ScrollArea className="flex-1 p-4 min-w-0">`

### 2. `src/components/chat/ChatRoom.tsx` — linha 123

Adicionar `overflow-hidden` ao container de mensagens para forçar o texto a quebrar:

- De: `<div className="space-y-4">`
- Para: `<div className="space-y-4 overflow-hidden">`

### 3. `src/components/chat/ChatMessageItem.tsx` — linha 148

Remover `overflow-hidden` do `<p>` (a proteção agora está no container pai):

- De: `"whitespace-pre-wrap break-words overflow-hidden"`
- Para: `"whitespace-pre-wrap break-words"`

## Arquivos

- 2 editados: `ChatRoom.tsx`, `ChatMessageItem.tsx`



# Correção: Texto longo no chat não quebra linha e transborda

## Problema

Mensagens com textos longos (sem espaços naturais, URLs, ou parágrafos muito extensos) não quebram corretamente. O conteúdo transborda horizontalmente, empurrando elementos para fora da área visível — incluindo o botão de envio.

## Causa

Em layouts `flex`, um item não encolhe abaixo do tamanho do seu conteúdo a menos que tenha `min-w-0` ou `overflow-hidden`. Vários containers na cadeia não possuem essa restrição.

## Correção

### Editar `src/components/chat/ChatRoom.tsx`

1. Linha 88 — container raiz do ChatRoom:
   - De: `flex-1 flex h-full`
   - Para: `flex-1 flex h-full min-w-0`

2. Linha 89 — container interno da coluna:
   - De: `flex-1 flex flex-col h-full`
   - Para: `flex-1 flex flex-col h-full min-w-0`

### Editar `src/components/chat/ChatMessageItem.tsx`

3. Linha 148 — parágrafo do texto da mensagem:
   - De: `whitespace-pre-wrap break-words`
   - Para: `whitespace-pre-wrap break-words break-all overflow-hidden`

   O `break-all` garante que textos sem espaços (URLs, strings longas) também quebrem. O `overflow-hidden` é uma proteção extra.

### Editar `src/pages/Chat.tsx`

4. Adicionar `overflow-hidden` no container do ResizablePanel que contém o ChatRoom (linha 42):
   - De: `flex-1 flex flex-col h-full`
   - Para: `flex-1 flex flex-col h-full overflow-hidden`

## Arquivos

- 3 editados: `ChatRoom.tsx`, `ChatMessageItem.tsx`, `Chat.tsx`

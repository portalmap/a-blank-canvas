

# Correção: Botão Send transbordando no chat

## Problema

Os 6 botões de ação + textarea estão na mesma linha (`flex`). Em painéis estreitos ou com ThreadPanel aberto, o botão Send (último da fila) é empurrado para fora da área visível.

## Correção

### Editar `src/components/chat/ChatInput.tsx`

Reorganizar o bloco das linhas 197-267 de uma linha horizontal para duas linhas verticais:

**Linha 1**: Textarea (largura total)
**Linha 2**: Botões de ação à esquerda + botão Send à direita

```tsx
<div className="flex flex-col gap-2">
  <Textarea
    ref={textareaRef}
    value={content}
    onChange={...}
    onKeyDown={handleKeyDown}
    placeholder={`Mensagem em #${channelName}`}
    className="min-h-[44px] max-h-[200px] resize-none w-full"
    style={{ overflowY: 'hidden' }}
  />
  <input ref={fileInputRef} type="file" multiple onChange={handleFilesSelected} className="hidden" />
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-1">
      <EmojiPickerPopover ... />
      <StickerGallery ... />
      <Button variant="ghost" size="icon" ...><Paperclip /></Button>
      <AudioRecorderButton ... />
      <CommentAssigneeSelector ... />
    </div>
    <Button onClick={handleSubmit} size="icon" ...>
      <Send />
    </Button>
  </div>
</div>
```

Remover a dica "Pressione Enter para enviar" (linhas 265-267) para economizar espaço vertical.

## O que NAO muda

- Nenhuma logica de envio, upload, atribuicao ou stickers
- Apenas reorganizacao visual dos elementos existentes

## Arquivo

- 1 editado: `src/components/chat/ChatInput.tsx`


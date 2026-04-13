

# Correção: Botões do chat input invisíveis

## Problema

Os botões de ação (emoji, sticker, anexo, audio, atribuir, enviar) estão no DOM mas invisíveis. O `ResizablePanel` aplica `overflow: hidden` internamente, e o layout horizontal (`flex gap-2`) faz a div dos botões ser empurrada para fora da área visível quando o painel é estreito.

## Correção

Mudar o layout do `ChatInput` para empilhar verticalmente: textarea em cima, botões em uma barra de ferramentas abaixo. Isso elimina a competição por espaço horizontal.

### Editar `src/components/chat/ChatInput.tsx`

Trocar o layout de:
```
[  Textarea  ] [ emoji sticker clip audio assign send ]
```

Para:
```
[  Textarea (full width)                              ]
[ emoji | sticker | clip | audio | assign ]    [ Send ]
```

Estrutura:
```tsx
<div className="flex flex-col gap-2">
  <Textarea className="min-h-[44px] max-h-[200px] resize-none w-full" />
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-1">
      {/* emoji, sticker, clip, audio, assign */}
    </div>
    <Button size="icon">  {/* Send */}
      <Send />
    </Button>
  </div>
</div>
```

Remover a dica "Pressione Enter..." pois já é comportamento padrão e ocupa espaço.

## Arquivo

- 1 editado: `src/components/chat/ChatInput.tsx`


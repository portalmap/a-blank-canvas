

# Correção: Botão de envio sumindo no chat

## Problema

A barra de input do chat tem 6 ícones + textarea. Em painéis estreitos, o botão Send é empurrado para fora da área visível.

## Correção

### Editar `src/components/chat/ChatInput.tsx`

1. **Envolver os botões de ação em um container `flex-shrink-0`** para garantir que nunca encolham
2. **Limitar o textarea com `min-w-0 flex-1`** para que ele ceda espaço aos botões, não o contrário
3. **Agrupar os botões em um wrapper com `flex flex-shrink-0 gap-1`** para que fiquem sempre visíveis como bloco

A estrutura passaria de:
```
<div flex gap-2>
  <Textarea />
  <Emoji /> <Sticker /> <Clip /> <Audio /> <Assign /> <Send />
</div>
```

Para:
```
<div flex gap-2>
  <Textarea className="min-w-0 flex-1" />
  <div className="flex items-end gap-1 flex-shrink-0">
    <Emoji /> <Sticker /> <Clip /> <Audio /> <Assign /> <Send />
  </div>
</div>
```

## Arquivo

- 1 editado: `src/components/chat/ChatInput.tsx`




# Adicionar mais icones ao dialog de criacao de documentos

## Alteracao

### Arquivo: `src/components/documents/DocsHub/CreateDocDialog.tsx`

Expandir o array `EMOJI_OPTIONS` com mais emojis, incluindo os que aparecem na imagem de referencia. A lista atual tem 15 emojis; sera ampliada para incluir variantes como pastas, clips, foguetes, alvos, estrelas, lampadas, entre outros.

Lista atualizada:

```typescript
const EMOJI_OPTIONS = [
  '📄', '📝', '📋', '📌', '📎', '📂', '🗂️', '📑', '📒', '📓',
  '💡', '🎯', '🚀', '⭐', '🔖', '🔗', '🧩', '📊', '📈', '🗒️',
  '✏️', '🖊️', '📚', '🏷️', '💼', '🔍', '💬', '📮', '🧾', '📆',
];
```

Nenhuma outra alteracao necessaria -- o grid de emojis ja usa `flex-wrap` e se adapta automaticamente.


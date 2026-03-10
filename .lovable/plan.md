

# Tornar a sidebar do Chat redimensionável

## O que será feito

Substituir o layout `flex` atual da página Chat por um `ResizablePanelGroup` (mesmo componente já usado em outras partes do app, como a sidebar de documentos), permitindo arrastar a borda entre a sidebar de canais e a área de conversa para ampliar ou reduzir.

## Alteração

**Arquivo: `src/pages/Chat.tsx`**

- Importar `ResizablePanelGroup`, `ResizablePanel` e `ResizableHandle` de `@/components/ui/resizable`
- Envolver `ChatSidebar` em um `ResizablePanel` com `defaultSize={20}`, `minSize={15}`, `maxSize={40}`
- Envolver a área de conversa em outro `ResizablePanel` com `defaultSize={80}`
- Adicionar `ResizableHandle` entre os dois painéis
- Remover o layout flex manual atual

Nenhuma outra alteração necessária — a `ChatSidebar` já ocupa 100% do espaço que lhe é dado.


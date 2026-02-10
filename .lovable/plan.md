
# Sidebar de Documentos Redimensionavel

## Resumo

Substituir a largura fixa do sidebar de documentos por um layout redimensionavel usando o componente `ResizablePanelGroup` (ja instalado via `react-resizable-panels`), permitindo ao usuario arrastar a borda para aumentar ou reduzir a largura horizontalmente.

## Alteracoes

### 1. `src/pages/Documents.tsx`

Envolver o `DocsHubSidebar` e o conteudo principal em um `ResizablePanelGroup` com dois `ResizablePanel` e um `ResizableHandle` entre eles.

- Importar `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` de `@/components/ui/resizable`
- O painel do sidebar tera tamanho padrao de ~20%, minimo de ~10% e maximo de ~40%
- O painel do conteudo principal ocupara o restante
- Quando o sidebar estiver colapsado (`sidebarCollapsed = true`), o painel do sidebar tera tamanho reduzido automaticamente

### 2. `src/components/documents/DocsHub/DocsHubSidebar.tsx`

- Remover a logica interna de largura fixa (`w-14` / `w-64`) do container principal
- O componente passara a ocupar 100% da largura do painel pai (`w-full h-full`)
- Manter o botao de colapsar/expandir e toda a logica de conteudo colapsado

## Resultado esperado

O usuario podera arrastar a borda entre o sidebar e o conteudo principal para ajustar a largura, similar ao sidebar principal do site. O handle de resize sera sutil (linha vertical na borda).

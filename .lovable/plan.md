## Problema

O spacer `<div className="h-24 w-full" />` que adicionei dentro do `BulkActionsBar` está sendo renderizado no fluxo do layout pai (que é flex), quebrando a tela e "encurralando" o conteúdo numa coluna estreita.

## Correção

Remover o spacer in-flow do `BulkActionsBar.tsx`. A barra continua `fixed`, arrastável e com posição persistida — apenas tiramos o `<div>` extra que está atrapalhando o layout.

Arquivo: `src/components/tasks/BulkActionsBar.tsx` — remover as 2 linhas do spacer logo antes do `ConfirmBulkDeleteDialog`.

Resultado: tela volta ao normal. A barra ainda pode ser arrastada pela alça caso cubra a última linha.
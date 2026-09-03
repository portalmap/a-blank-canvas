# Remover "Etiquetas" da barra de ações em massa

Retirar o botão **Etiquetas** da barra que aparece quando várias tarefas estão selecionadas. Os demais botões (Status, Responsáveis, Datas, Mover, Copiar, Arquivar, Excluir) continuam iguais.

## O que muda

- O botão "Etiquetas" deixa de aparecer na barra de seleção múltipla (desktop e mobile).
- Etiquetas continuam funcionando normalmente dentro de cada tarefa individualmente.

## Detalhes técnicos

- `src/components/tasks/BulkActionsBar.tsx`: remover o bloco `<TagsBulkPopover>` (linhas ~266-275), o import do componente e o ícone `Tag` não utilizado.
- `src/components/tasks/bulk-actions/TagsBulkPopover.tsx`: excluir o arquivo (uso exclusivo da barra em massa).
- `src/hooks/useBulkTaskActions.ts`: remover o hook `useBulkAddTags`, que fica sem uso.
- Nenhuma mudança de banco, de RLS ou em outros módulos.

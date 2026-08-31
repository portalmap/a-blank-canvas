# Ocultar spaces arquivados no gerenciamento de permissões

Hoje o modal "Gerenciar Permissões de Spaces" lista todos os spaces do workspace, inclusive os arquivados (a consulta não filtra `archived_at`).

## O que muda

- A lista passa a mostrar apenas spaces ativos; spaces arquivados desaparecem do modal.
- O contador `X/Y spaces` e as ações em massa (selecionar todos / aplicar permissão) passam a considerar só os ativos.
- Permissões já salvas para spaces arquivados continuam no banco — apenas não aparecem na tela. Se o space for restaurado, ele volta a aparecer com a permissão anterior.

## Detalhes técnicos

Alteração restrita a `src/components/settings/UserPermissionsDialog.tsx`: adicionar `.is("archived_at", null)` à consulta de spaces em `loadResources`. Sem mudanças de banco, hooks ou lógica de salvamento.

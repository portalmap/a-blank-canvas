# Ações em massa nas permissões de Spaces

Adicionar uma barra de ações no topo da lista de spaces do modal "Gerenciar Permissões de Spaces".

## O que muda

- **Selecionar todos / Limpar seleção**: uma caixa de seleção geral no cabeçalho do workspace marca ou desmarca todos os spaces daquele workspace de uma vez (estado intermediário quando só alguns estão marcados).
- **Trocar permissão em massa**: um seletor "Aplicar a todos" define Visualizador / Comentarista / Editor para todos os spaces marcados de uma só vez.
- **Contador**: continua mostrando `X/Y spaces`, agora refletindo as ações em massa.
- Ao marcar todos, a permissão padrão continua Visualizador; a troca em massa só afeta os spaces já marcados.
- Nada é gravado até clicar em "Salvar Permissões" (comportamento atual mantido).

## Detalhes técnicos

Alterações restritas a `src/components/settings/UserPermissionsDialog.tsx`:

- Novos handlers `handleToggleAll(workspace, checked)` e `handleBulkRole(workspace, role)` operando sobre o `Map` de permissões em estado.
- Checkbox mestre no `CollapsibleTrigger` (com `onClick` + `stopPropagation` para não colapsar o grupo) usando `checked` / `indeterminate`.
- Select de aplicação em massa exibido dentro do `CollapsibleContent`, acima da lista, desabilitado quando não há space marcado.
- Sem mudanças de banco, hooks ou lógica de salvamento.

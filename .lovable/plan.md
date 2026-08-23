# Remover a bolinha preta dos Spaces

## Objetivo
Eliminar o indicador circular (bolinha preta) que aparece antes do nome de cada Space na sidebar, conforme screenshot anexado.

## Diagnóstico
- Arquivo: `src/components/workspace/SpaceTreeItem.tsx`
- Causa: linhas 143-147 renderizam o componente `<Circle />` do `lucide-react` com `fill={space.color || 'currentColor'}`. Quando o Space não tem cor definida, o preenchimento fica na cor do texto (preto), gerando a bolinha visível na lista.

## Alterações propostas
1. **Remover o ícone `Circle`** do link de navegação do Space em `SpaceTreeItem.tsx`.
2. **Ajustar o espaçamento** (`gap-2` do `NavLink`) para manter o alinhamento visual do texto sem o ícone.
3. **Verificar visualmente** no preview se a bolinha desapareceu e o nome do Space continua alinhado com os demais itens da sidebar.

## Escopo
- Apenas UI/frontend. Nenhuma alteração em banco de dados, SSO, Edge Functions, APIs ou outros fluxos.
- Nenhum impacto na funcionalidade de Spaces (clique, collapse, dropdowns etc.).

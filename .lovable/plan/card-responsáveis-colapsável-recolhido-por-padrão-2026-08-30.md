# Card "Responsáveis" colapsável (recolhido por padrão)

## Objetivo
Tornar o card de responsáveis na tela de detalhes do space recolhido por padrão, exibindo apenas o cabeçalho e um controle para expandir/contrair o conteúdo.

## O que será alterado
- `src/page-views/SpaceDetailView.tsx`

## Mudanças
1. **Componente de colapso**
   - Envolver o card de responsáveis com `<Collapsible defaultOpen={false}>`.
   - Usar o `CardHeader` como gatilho de expansão (`CollapsibleTrigger`).
   - O conteúdo dos seletores ficará dentro de `CollapsibleContent`.

2. **Indicador visual de estado**
   - Adicionar um ícone de seta/chevron no cabeçalho que gira conforme o card está expandido ou recolhido.
   - Manter o cursor pointer e hover sutil no cabeçalho para indicar interatividade.

3. **Preservação de funcionalidade**
   - Manter o layout lado a lado dos três seletores quando expandido.
   - Manter o visual recuado do card.
   - Preservar a lógica de atualização dos responsáveis via `useUpdateSpace`.

## Critérios de aceitação
- O card de responsáveis carrega recolhido por padrão.
- Clicar no cabeçalho expande/contrai o conteúdo.
- O ícone indica claramente o estado aberto/fechado.
- A seleção e atualização dos responsáveis continuam funcionando normalmente.

## Objetivo

Tornar o card "Produtividade" (exibido no topo das views de Lista/Pasta/Space) recolhível, para que ocupe pouco espaço por padrão e possa ser expandido sob demanda quando o usuário quiser analisar os dados.

## Comportamento proposto

**Estado padrão: recolhido (compacto)**
- Mostra apenas uma linha fina com:
  - Ícone de Produtividade + título "Produtividade"
  - Score (ex: `46%`) em destaque colorido
  - Mini resumo inline: `0 antecipadas · 0 no prazo · 1 atrasada · 0 sem prazo`
  - Botão chevron (▾) à direita para expandir
- Sem filtros, sem switch "Transferidas", sem botão "Relatório" visíveis nesse modo.

**Estado expandido**
- Mostra exatamente o conteúdo atual (filtro de período, switch Transferidas, botão Relatório, score grande, 4 cards coloridos de indicadores e contador de tarefas concluídas).
- Botão chevron (▴) para recolher.

**Persistência**
- A preferência (recolhido/expandido) é salva em `localStorage` por escopo (chave tipo `productivity-card-collapsed:{scope}:{listId|folderId|spaceId|workspace}`) para que cada lista/pasta lembre da escolha do usuário.
- Padrão inicial para novos usuários: **recolhido**.

## Arquivos afetados

- `src/components/dashboard/ScopeProductivityCard.tsx` — único arquivo a modificar.
  - Adicionar estado `collapsed` com leitura/gravação em `localStorage`.
  - Renderização condicional: header compacto vs. header + corpo completo atual.
  - Usar `ChevronDown`/`ChevronUp` do `lucide-react` em um `Button` ghost.

## Detalhes técnicos

- Não alterar hooks (`useProductivityStats`, `useProductivityDetailsReport`) — os dados continuam sendo buscados normalmente para que o resumo inline funcione mesmo recolhido.
- O `ProductivityReportDialog` continua disponível pelo botão "Relatório" no modo expandido (sem mudança).
- Sem migração de banco, sem mudança em outras telas/cards do módulo de Dashboards.

## Fora do escopo

- Cards do módulo `/dashboards` (esses já têm dialog próprio de expansão).
- Mudanças visuais nos indicadores quando expandido.
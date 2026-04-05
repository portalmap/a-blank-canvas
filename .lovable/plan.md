
Objetivo: fazer os relatórios/painéis de produtividade funcionarem bem em períodos longos, sem sumir dados, e com opção de analisar todos os usuários ou apenas 1 usuário.

Diagnóstico
- Hoje os hooks `useProductivityStats`, `useProductivityRanking` e `useUserProductivityDetails` trazem muitos registros brutos para o frontend e fazem a conta no navegador.
- O ranking ainda faz junções em memória de forma cara para períodos longos (`tasks`, `task_assignees`, `task_assignee_history`, perfis e membros).
- O detalhamento por usuário filtra parte dos dados no cliente e ainda não está alinhado para períodos grandes.
- O diálogo de detalhes do ranking não recebe o período selecionado do dashboard.
- O botão “Atualizar” do dashboard não força recarga real.
- Para crescimento do workspace, existe risco de bater o limite padrão de linhas por consulta, o que pode causar exatamente o sintoma de “demora” ou “não aparece”.

Plano de implementação

1. Mover o cálculo pesado para o backend
- Criar funções SQL de leitura para:
  - resumo de produtividade
  - ranking de produtividade
  - detalhes de produtividade por usuário
- Essas funções já receberão:
  - `workspace_id`
  - `start_date` / `end_date`
  - `include_transferred`
  - `space_id` opcional
  - `user_ids` opcional
- O cálculo de score 0–200% e a classificação (antecipada / em dia / atrasada) passarão a acontecer no banco, não no navegador.

2. Otimizar para períodos longos
- Fazer o ranking retornar dados já agregados por usuário, em vez de puxar tarefas e históricos completos para montar no cliente.
- Adicionar paginação/limite no detalhamento de tarefas por usuário, para não renderizar listas enormes de uma vez.
- Revisar e adicionar índices nas colunas usadas nesses relatórios, principalmente:
  - `tasks(workspace_id, completed_at, archived_at)`
  - `task_assignees(task_id, user_id)`
  - `task_assignee_history(task_id, user_id, unassigned_at)`

3. Dar suporte a “todos” e também “1 usuário”
- Manter o ranking para todos os usuários em períodos longos, mas com consulta otimizada no backend.
- Adicionar filtro opcional de usuário no card/relatório de ranking, para quando você quiser analisar só uma pessoa.
- No card de produtividade, manter/expandir o escopo por usuário para consultas mais rápidas e focadas.

4. Corrigir inconsistências do frontend
- Atualizar `useProductivityStats`, `useProductivityRanking` e `useUserProductivityDetails` para usar as funções otimizadas.
- Passar o `dateRange` do dashboard também para o diálogo de detalhes do usuário.
- Fazer o botão “Atualizar” invalidar de verdade as queries de produtividade/ranking/detalhes.
- Reduzir dependência de filtros em memória e garantir que o período seja aplicado no backend desde a origem.

5. Ajustes de UX para períodos grandes
- Exibir estado de carregamento melhor para consultas longas.
- Se necessário, mostrar aviso quando o relatório estiver em modo “todos os usuários” com período muito amplo, mas ainda permitir executar.
- No detalhe por usuário, carregar por abas/páginas para evitar travamento visual.

Arquivos/áreas que devem mudar
- Backend/migrations:
  - novas funções SQL de leitura para produtividade
  - índices de performance
- Frontend:
  - `src/hooks/useProductivityStats.ts`
  - `src/hooks/useProductivityRanking.ts`
  - `src/hooks/useUserProductivityDetails.ts`
  - `src/components/dashboards/DashboardEditor.tsx`
  - `src/components/dashboards/cards/ProductivityRankingCard.tsx`
  - `src/components/dashboards/cards/UserProductivityDetailsDialog.tsx`
  - `src/pages/DashboardView.tsx`
  - possivelmente `src/components/dashboards/AddCardModal.tsx` para permitir filtro por usuário no ranking

Resultado esperado
- Períodos longos passam a responder de forma estável.
- O dashboard deixa de sumir com dados por excesso de volume.
- Ranking e detalhes ficam consistentes com o período selecionado.
- Você poderá analisar todos os usuários em períodos longos, e também filtrar 1 usuário quando quiser um relatório mais cirúrgico.

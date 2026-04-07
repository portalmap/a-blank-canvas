

# Botão "Gerar Relatório" no Card de Produtividade

## Resumo

Adicionar um botão no `ProductivityCard` que abre um dialog com a lista detalhada de tarefas (similar ao `UserProductivityDetailsDialog`), mas adaptado para funcionar com qualquer escopo (workspace, space, my_tasks, user com múltiplos IDs).

## Alterações

### 1. Nova RPC SQL: `get_productivity_details_by_scope`

A RPC `get_user_productivity_details` existente só aceita um único `p_user_id`. Precisamos de uma versão que aceite os mesmos parâmetros de escopo que `get_productivity_stats` (`p_scope`, `p_space_id`, `p_user_ids`) e retorne a lista de tarefas com classificação, datas e indicador de transferência.

- Parâmetros: `p_workspace_id`, `p_scope`, `p_space_id`, `p_user_ids`, `p_start_date`, `p_end_date`, `p_include_transferred`, `p_early_threshold`, `p_on_time_threshold`, `p_limit`
- Retorno: JSON com `tasks[]` (id, title, completedAt, dueDate, classification, daysFromDue, isTransferred, userName) e `summary` (early, onTime, late, noDueDate, total, score)
- Reutiliza a mesma lógica de `task_assignee_history` já implementada

### 2. Hook: `useProductivityDetailsReport.ts`

- Novo hook que chama a RPC acima
- Aceita os mesmos parâmetros do `useProductivityStats` (scope, spaceId, userIds, dateRange, includeTransferred)
- Ativado sob demanda (enabled controlado por estado)

### 3. Componente: `ProductivityReportDialog.tsx`

- Dialog expandido (max-w-3xl) com a lista de tarefas agrupadas por classificação (tabs: Adiantadas, No Prazo, Atrasadas, Sem Prazo)
- Cada item mostra: título da tarefa, nome do responsável, data de conclusão/transferência, classificação, badge "Transferida" quando aplicável
- Resumo no topo com os totais por categoria
- Clique na tarefa navega para `/tasks/:id`

### 4. Editar `ProductivityCard.tsx`

- Adicionar botão "Ver Relatório" (ícone `FileText`) no rodapé do card, ao lado do total de tarefas
- Ao clicar, abre o `ProductivityReportDialog`
- Passar scope, spaceId, userIds, dateRange e includeTransferred como props

### 5. Editar `DashboardEditor.tsx` (ProductivityCardWrapper)

- Passar as props de escopo (scope, spaceId, userIds, dateRange) para o `ProductivityCard` para que ele possa repassar ao dialog

## Arquivos

- 1 migration SQL (nova RPC)
- 1 novo hook (`useProductivityDetailsReport.ts`)
- 1 novo componente (`ProductivityReportDialog.tsx`)
- 2 editados (`ProductivityCard.tsx`, `DashboardEditor.tsx`)


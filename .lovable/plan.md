

# Campo "Account" em Spaces + Relatório de Account

## Resumo

Adicionar um campo **Account** nos Spaces que define a pessoa responsável por todas as tarefas do Space. Criar um relatório de produtividade específico para Accounts, que calcula a média de desempenho de **todas** as tarefas do Space (não apenas as atribuídas à pessoa).

## Conceito

- O Account é o "dono" da conta/space — responde pela performance geral
- Diferente do responsável (assignee): o Account não precisa estar atribuído às tarefas
- O relatório mostra a média de produtividade de TODAS as tarefas do space, creditada ao Account

---

## 1. Migration SQL

### Alterar tabela `spaces`
- Novo campo `account_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL` (nullable)

### Nova RPC `get_account_productivity_report`
- Recebe: workspace_id, account_user_id (opcional), start_date, end_date, early/on_time thresholds
- Busca todos os spaces onde o usuário é Account
- Calcula produtividade de TODAS as tarefas concluídas nesses spaces (via `lists.space_id`)
- Agrupa por space e retorna resumo geral + por space
- Retorna: ranking de accounts com score, total de tarefas, classificações (early/on_time/late/no_due_date), e lista detalhada de tarefas por space

## 2. Frontend — Campo Account no Space

### Editar `SpaceDetailView.tsx`
- Adicionar seção "Account" com seletor de membro do workspace
- Salvar `account_user_id` na tabela `spaces`

### Editar `CreateSpaceDialog.tsx`
- Adicionar seletor opcional de Account na criação do space

### Editar `SpaceTreeItem.tsx` (dialog de edição)
- Adicionar campo Account no dialog de edição do space

### Editar `useSpaces.ts`
- Incluir `account_user_id` no `useCreateSpace` e `useUpdateSpace`
- Fazer join com `profiles` no `useSpace` para trazer nome/avatar do account

## 3. Frontend — Relatório Account

### Novo hook: `useAccountProductivity.ts`
- Chama a RPC `get_account_productivity_report`
- Retorna dados agregados por account e por space

### Novo componente: `AccountReportDialog.tsx`
- Dialog similar ao `ProductivityReportDialog`
- Mostra: score geral do account, breakdown por space, lista de tarefas
- Tabs: por classificação (Antecipadas, No Prazo, Atrasadas, Sem Prazo)

### Novo card de dashboard: `AccountProductivityCard.tsx`
- Card para o dashboard que mostra ranking de Accounts
- Botão para abrir o `AccountReportDialog` detalhado

### Editar `AddCardModal.tsx`
- Adicionar opção "Account" na lista de cards disponíveis

### Editar `DashboardEditor.tsx`
- Renderizar o novo `AccountProductivityCard`

## Arquivos

- 1 migration SQL (alter spaces + nova RPC)
- 1 novo hook (`useAccountProductivity.ts`)
- 2 novos componentes (`AccountReportDialog.tsx`, `AccountProductivityCard.tsx`)
- 5 editados (`SpaceDetailView.tsx`, `CreateSpaceDialog.tsx`, `SpaceTreeItem.tsx`, `useSpaces.ts`, `AddCardModal.tsx`, `DashboardEditor.tsx`)

## Resultado

- Cada space pode ter um Account definido
- O Account responde pela produtividade geral de todas as tarefas do space
- Dashboard mostra ranking de Accounts com score médio
- Relatório detalhado lista todas as tarefas por space/classificação




# Card de Produtividade em Space, Pasta e Lista

## Resumo

Adicionar um card de produtividade (score, antecipadas, no prazo, atrasadas, sem prazo) nas páginas de detalhe de **Space**, **Pasta** e **Lista**, usando a mesma lógica de cálculo existente. Requer estender as RPCs do banco para suportar os escopos `folder` e `list`.

## Alterações

### 1. Migration SQL — Estender RPCs

Adicionar parâmetros `p_folder_id` e `p_list_id` às duas funções:
- **`get_productivity_stats`**: adicionar filtros `AND (p_scope != 'folder' OR l.folder_id = p_folder_id)` e `AND (p_scope != 'list' OR t.list_id = p_list_id)` em ambas CTEs (completed_tasks e transferred_tasks)
- **`get_productivity_details_by_scope`**: mesma lógica de filtro para folder e list

Os escopos aceitos passam a ser: `workspace`, `space`, `folder`, `list`, `my_tasks`, `user`.

### 2. Editar `src/hooks/useProductivityStats.ts`

- Adicionar `folder` e `list` ao tipo `ProductivityScope`
- Adicionar `folderId` e `listId` às opções do hook
- Passar `p_folder_id` e `p_list_id` na chamada RPC

### 3. Editar `src/hooks/useProductivityDetailsReport.ts`

- Adicionar `folderId` e `listId` às opções
- Passar os novos parâmetros na chamada RPC

### 4. Novo componente: `src/components/dashboard/ScopeProductivityCard.tsx`

Card compacto e autônomo que:
- Recebe `scope`, `spaceId`, `folderId` ou `listId`
- Usa `useProductivityStats` internamente
- Exibe: score principal + 4 mini-indicadores (antecipadas, no prazo, atrasadas, sem prazo)
- Botão "Relatório" que abre o `ProductivityReportDialog` com os dados detalhados
- Toggle para incluir tarefas transferidas
- Visual similar ao ProductivityCard do dashboard, mas sem menu de delete/resize

### 5. Editar `src/pages/SpaceDetailView.tsx`

- Importar `ScopeProductivityCard`
- Adicionar abaixo do `TaskStatsDashboard` existente:
  ```
  <ScopeProductivityCard scope="space" spaceId={spaceId} />
  ```

### 6. Editar `src/pages/FolderDetailView.tsx`

- Importar `ScopeProductivityCard`
- Adicionar abaixo do `TaskStatsDashboard`:
  ```
  <ScopeProductivityCard scope="folder" folderId={folderId} />
  ```

### 7. Editar `src/pages/ListDetailView.tsx`

- Importar `ScopeProductivityCard`
- Adicionar na área do cabeçalho (antes da listagem de tarefas):
  ```
  <ScopeProductivityCard scope="list" listId={listId} />
  ```

## Arquivos

- 1 migration SQL (atualizar 2 RPCs)
- 2 hooks editados (`useProductivityStats.ts`, `useProductivityDetailsReport.ts`)
- 1 novo componente (`ScopeProductivityCard.tsx`)
- 3 páginas editadas (`SpaceDetailView.tsx`, `FolderDetailView.tsx`, `ListDetailView.tsx`)


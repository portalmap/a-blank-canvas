

# Adicionar filtro de Seguidor no módulo Tudo

## Resumo

Adicionar um botão "Seguidor" ao lado do botão "Responsável" existente, com um painel lateral idêntico que lista os seguidores das tarefas e permite filtrar por eles.

## Alterações

### 1. `src/hooks/useFilteredAllTasks.ts`
- Após buscar os assignees, buscar também os **followers** de cada tarefa (mesma lógica de batching)
- Consultar `task_followers` com `task_id` + join com `profiles`
- Adicionar campo `followers` ao tipo `TaskWithAssignees` (renomear conceptualmente)

### 2. `src/pages/EverythingView.tsx`
- Adicionar estado `selectedFollowers` e `includeNoFollowers` e `showFollowerPanel`
- Calcular `followerStats` (igual a `assigneeStats` mas usando `task.followers`)
- Adicionar filtro de followers no `filteredTasks` (mesma lógica do assignee filter)
- Adicionar botão "Seguidor" com ícone `Eye` ao lado do botão "Responsável"
- Renderizar `FollowerFilterPanel` quando aberto

### 3. Criar `src/components/everything/FollowerFilterPanel.tsx`
- Cópia do `AssigneeFilterPanel` adaptada:
  - Título: "Seguidores"
  - Opção "Sem seguidor" em vez de "Não atribuído"
  - Mesma estrutura visual (avatar, nome, contagem, checkbox)

## Resultado
- Botão "Seguidor" aparece ao lado de "Responsável" na toolbar
- Ao clicar, abre painel lateral listando todos os seguidores com contagem de tarefas
- Filtrar por seguidor mostra apenas tarefas onde aquele usuário é seguidor


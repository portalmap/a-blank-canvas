

# Ativar sistema de Seguidores nas Tarefas

## Problema
A tabela `task_followers` existe e as automações já adicionam seguidores, mas não há interface para visualizar, adicionar ou remover seguidores manualmente em uma tarefa.

## Alterações

### 1. Criar hook `src/hooks/useTaskFollowers.ts`
Seguir o mesmo padrão de `useTaskAssignees.ts`:
- `useTaskFollowers(taskId)` — lista seguidores com perfis
- `useAddTaskFollower()` — adiciona seguidor (upsert com `onConflict: 'task_id,user_id'`)
- `useRemoveTaskFollower()` — remove seguidor

### 2. Criar componente `src/components/tasks/TaskFollowersManager.tsx`
Componente visual idêntico ao `TaskAssigneesManager`, mas para seguidores:
- Ícone `Eye` em vez de `User`
- Label "Seguidores" em vez de "Responsáveis"
- Lista os seguidores atuais com avatar e botão de remoção
- Popover para adicionar novos seguidores (busca entre membros do workspace)
- Registra atividades `follower.added` e `follower.removed`

### 3. Integrar nas views de tarefa
- **`TaskMainContent.tsx`** (linha 372): Adicionar `<TaskFollowersManager>` logo abaixo de `<TaskAssigneesManager>`
- **`TaskDetailDrawer.tsx`** (linha 262): Adicionar `<TaskFollowersManager>` logo abaixo de `<TaskAssigneesManager>`

Nenhuma alteração de banco de dados necessária — a tabela e as constraints já existem.


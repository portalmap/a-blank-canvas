

# Seguidores Hierárquicos: Space → Pasta → Lista → Tarefa

## Resumo

Implementar um sistema de seguidores em cascata hierárquica. Quando um seguidor é adicionado em um nível (Space, Pasta, Lista), ele automaticamente se torna seguidor de todos os itens nos níveis abaixo. Para isso, precisamos de novas tabelas de seguidores para Space, Pasta e Lista, além de triggers no banco que propaguem seguidores automaticamente quando novas tarefas/listas/pastas forem criadas.

## Alterações no Banco de Dados (Migração SQL)

### 1. Criar 3 novas tabelas de seguidores

```sql
-- space_followers
CREATE TABLE public.space_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(space_id, user_id)
);

-- folder_followers
CREATE TABLE public.folder_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(folder_id, user_id)
);

-- list_followers
CREATE TABLE public.list_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(list_id, user_id)
);
```

### 2. RLS policies para cada tabela
- SELECT: membros do workspace podem ver
- INSERT: membros do workspace podem inserir (para permitir adicionar outros como seguidores)
- DELETE: membros do workspace podem remover

### 3. Atualizar RLS de task_followers
- A policy INSERT atual requer `user_id = auth.uid()` — precisa ser alterada para permitir que membros do workspace adicionem outros usuários como seguidores (sem essa correção, adicionar seguidores para outros falha silenciosamente).

### 4. Triggers de propagação automática

Criar triggers que propagam seguidores para baixo quando:

- **Seguidor adicionado em Space** → insere em `task_followers` para TODAS as tarefas do space (via lists), com `source_type = 'space_follower'` e `source_id = space_id`
- **Seguidor adicionado em Pasta** → insere em `task_followers` para todas as tarefas das listas da pasta, com `source_type = 'folder_follower'`
- **Seguidor adicionado em Lista** → insere em `task_followers` para todas as tarefas da lista, com `source_type = 'list_follower'`
- **Nova tarefa criada** → verifica se há seguidores no space/pasta/lista da tarefa e os adiciona automaticamente como `task_followers`
- **Seguidor removido de Space/Pasta/Lista** → remove os `task_followers` correspondentes que foram criados por propagação (baseado em `source_type` e `source_id`)

## Alterações no Frontend

### 5. Novos hooks

- `src/hooks/useSpaceFollowers.ts` — CRUD de seguidores de space
- `src/hooks/useFolderFollowers.ts` — CRUD de seguidores de pasta
- `src/hooks/useListFollowers.ts` — CRUD de seguidores de lista

Cada um segue o mesmo padrão do `useTaskFollowers.ts`.

### 6. Componente reutilizável `EntityFollowersManager`

Criar `src/components/followers/EntityFollowersManager.tsx` — componente genérico que recebe:
- `entityType`: `'space' | 'folder' | 'list' | 'task'`
- `entityId`: string
- `workspaceId`: string

Reutiliza a mesma UI do `TaskFollowersManager` atual mas suporta todas as entidades. O `TaskFollowersManager` existente será refatorado para usar este componente internamente.

### 7. Integrar nas páginas

- **`SpaceDetailView.tsx`**: Adicionar `EntityFollowersManager` ao lado do título do Space
- **`FolderDetailView.tsx`**: Adicionar `EntityFollowersManager` ao lado do título da Pasta
- **`ListDetailView.tsx`**: Adicionar `EntityFollowersManager` no header da Lista

### 8. Atualizar `useTaskFollowers` para mostrar origem

Na listagem de seguidores da tarefa, mostrar de onde o seguidor veio (herdado do Space, Pasta, Lista, ou manual) com um badge indicativo. Seguidores herdados não podem ser removidos diretamente na tarefa — precisam ser removidos na entidade de origem.

## Detalhes Técnicos

- As tabelas `task_followers` já possuem `source_type` e `source_id`, que serão usados para rastrear a origem da propagação
- Triggers SQL com `SECURITY DEFINER` para contornar RLS durante a propagação
- `ON CONFLICT DO NOTHING` em todas as propagações para evitar duplicatas
- A remoção de seguidores herdados cascateia automaticamente via trigger de DELETE nas tabelas pai


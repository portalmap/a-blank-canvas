-- FASE 1: Ajustar hierarquia de dados para modelo ClickUp
-- Workspace → Space → Folder → List → Task

-- 1.1: Adicionar foreign keys explícitas em spaces
ALTER TABLE public.spaces
  DROP CONSTRAINT IF EXISTS spaces_workspace_id_fkey,
  ADD CONSTRAINT spaces_workspace_id_fkey 
    FOREIGN KEY (workspace_id) 
    REFERENCES public.workspaces(id) 
    ON DELETE CASCADE;

-- 1.2: Adicionar foreign keys explícitas em folders
ALTER TABLE public.folders
  DROP CONSTRAINT IF EXISTS folders_space_id_fkey,
  ADD CONSTRAINT folders_space_id_fkey 
    FOREIGN KEY (space_id) 
    REFERENCES public.spaces(id) 
    ON DELETE CASCADE;

-- 1.3: Ajustar tabela lists
-- Adicionar workspace_id se não existir
ALTER TABLE public.lists
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- Atualizar workspace_id nas listas existentes baseado no space_id
UPDATE public.lists l
SET workspace_id = s.workspace_id
FROM public.spaces s
WHERE l.space_id = s.id AND l.workspace_id IS NULL;

-- Tornar space_id NOT NULL (toda lista deve pertencer a um space)
ALTER TABLE public.lists
  ALTER COLUMN space_id SET NOT NULL;

-- Adicionar foreign keys em lists
ALTER TABLE public.lists
  DROP CONSTRAINT IF EXISTS lists_workspace_id_fkey,
  ADD CONSTRAINT lists_workspace_id_fkey 
    FOREIGN KEY (workspace_id) 
    REFERENCES public.workspaces(id) 
    ON DELETE CASCADE;

ALTER TABLE public.lists
  DROP CONSTRAINT IF EXISTS lists_space_id_fkey,
  ADD CONSTRAINT lists_space_id_fkey 
    FOREIGN KEY (space_id) 
    REFERENCES public.spaces(id) 
    ON DELETE CASCADE;

ALTER TABLE public.lists
  DROP CONSTRAINT IF EXISTS lists_folder_id_fkey,
  ADD CONSTRAINT lists_folder_id_fkey 
    FOREIGN KEY (folder_id) 
    REFERENCES public.folders(id) 
    ON DELETE SET NULL;

-- 1.4: Ajustar tabela tasks
-- IMPORTANTE: Remover space_id e folder_id (são derivados da lista)
-- Primeiro, garantir que todas as tasks têm list_id
-- Como não há dados, podemos tornar NOT NULL diretamente

-- Remover colunas redundantes
ALTER TABLE public.tasks
  DROP COLUMN IF EXISTS space_id,
  DROP COLUMN IF EXISTS folder_id;

-- Tornar list_id NOT NULL
ALTER TABLE public.tasks
  ALTER COLUMN list_id SET NOT NULL;

-- Adicionar foreign keys em tasks
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_workspace_id_fkey,
  ADD CONSTRAINT tasks_workspace_id_fkey 
    FOREIGN KEY (workspace_id) 
    REFERENCES public.workspaces(id) 
    ON DELETE CASCADE;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_list_id_fkey,
  ADD CONSTRAINT tasks_list_id_fkey 
    FOREIGN KEY (list_id) 
    REFERENCES public.lists(id) 
    ON DELETE RESTRICT;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_status_id_fkey,
  ADD CONSTRAINT tasks_status_id_fkey 
    FOREIGN KEY (status_id) 
    REFERENCES public.statuses(id) 
    ON DELETE RESTRICT;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey,
  ADD CONSTRAINT tasks_assignee_id_fkey 
    FOREIGN KEY (assignee_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- 1.5: Criar trigger para criar statuses padrão ao criar workspace
CREATE OR REPLACE FUNCTION public.create_default_statuses_for_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar 3 statuses padrão: To Do, In Progress, Done
  INSERT INTO public.statuses (workspace_id, name, color, is_default, order_index, scope_type)
  VALUES 
    (NEW.id, 'To Do', '#94a3b8', true, 0, 'workspace'),
    (NEW.id, 'In Progress', '#3b82f6', false, 1, 'workspace'),
    (NEW.id, 'Done', '#22c55e', false, 2, 'workspace');
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS create_workspace_default_statuses ON public.workspaces;
CREATE TRIGGER create_workspace_default_statuses
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_statuses_for_workspace();

-- 1.6: Recriar função user_can_access_task para usar apenas list_id
CREATE OR REPLACE FUNCTION public.user_can_access_task(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM tasks t
        JOIN lists l ON l.id = t.list_id
        JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
        WHERE t.id = _task_id
          AND wm.user_id = _user_id
          AND (
              wm.role IN ('admin', 'member', 'limited_member')
              OR
              (wm.role = 'guest' AND (
                  EXISTS (
                      SELECT 1
                      FROM task_permissions tp
                      WHERE tp.task_id = _task_id
                        AND tp.user_id = _user_id
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM list_permissions lp
                      WHERE lp.list_id = t.list_id
                        AND lp.user_id = _user_id
                  )
                  OR (l.folder_id IS NOT NULL AND EXISTS (
                      SELECT 1
                      FROM folder_permissions fp
                      WHERE fp.folder_id = l.folder_id
                        AND fp.user_id = _user_id
                  ))
                  OR EXISTS (
                      SELECT 1
                      FROM space_permissions sp
                      WHERE sp.space_id = l.space_id
                        AND sp.user_id = _user_id
                  )
              ))
          )
    );
$$;

-- 1.7: Atualizar política de INSERT em tasks para remover referências a space_id/folder_id
DROP POLICY IF EXISTS "Authorized members can create tasks" ON public.tasks;
CREATE POLICY "Authorized members can create tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid() 
  AND EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = tasks.workspace_id
      AND wm.user_id = auth.uid()
      AND (
        wm.role IN ('admin', 'member', 'limited_member')
        OR (
          wm.role = 'guest' 
          AND tasks.list_id IS NOT NULL 
          AND user_can_access_list(auth.uid(), tasks.list_id)
        )
      )
  )
);
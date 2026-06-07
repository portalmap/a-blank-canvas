-- Corrigir recursão infinita removendo referências circulares entre tasks e task_permissions

-- 1. Remover política SELECT problemática de tasks
DROP POLICY IF EXISTS "Users can view accessible tasks" ON tasks;

-- 2. Criar política SELECT simplificada (sem referência a task_permissions)
CREATE POLICY "Users can view accessible tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = tasks.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- 3. Remover política ALL problemática de task_permissions
DROP POLICY IF EXISTS "Admins can manage task permissions" ON task_permissions;

-- 4. Criar política ALL simplificada (sem referência a tasks)
CREATE POLICY "Admins can manage task permissions"
ON task_permissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.role = 'admin'
  )
);
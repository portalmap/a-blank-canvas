-- Remover política SELECT atual que causa recursão
DROP POLICY IF EXISTS "Users can view accessible tasks" ON tasks;

-- Criar nova política SELECT com lógica inline (sem chamar função que consulta tasks)
CREATE POLICY "Users can view accessible tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = tasks.workspace_id
      AND wm.user_id = auth.uid()
      AND (
        wm.role IN ('admin', 'member', 'limited_member')
        OR (
          wm.role = 'guest' 
          AND (
            -- Tem permissão direta na tarefa
            EXISTS (SELECT 1 FROM task_permissions tp WHERE tp.task_id = tasks.id AND tp.user_id = auth.uid())
            -- OU tem permissão na lista
            OR EXISTS (SELECT 1 FROM list_permissions lp WHERE lp.list_id = tasks.list_id AND lp.user_id = auth.uid())
            -- OU tem permissão na pasta (via lista)
            OR EXISTS (
              SELECT 1 
              FROM lists l 
              JOIN folder_permissions fp ON fp.folder_id = l.folder_id
              WHERE l.id = tasks.list_id AND fp.user_id = auth.uid()
            )
            -- OU tem permissão no space (via lista)
            OR EXISTS (
              SELECT 1 
              FROM lists l 
              JOIN space_permissions sp ON sp.space_id = l.space_id
              WHERE l.id = tasks.list_id AND sp.user_id = auth.uid()
            )
          )
        )
      )
  )
);
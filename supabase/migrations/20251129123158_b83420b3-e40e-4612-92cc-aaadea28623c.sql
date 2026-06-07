-- Remove políticas duplicadas/conflitantes na tabela folders
DROP POLICY IF EXISTS "Only privileged members can create folders" ON folders;
DROP POLICY IF EXISTS "Users can view accessible folders" ON folders;
DROP POLICY IF EXISTS "Only privileged members can update folders" ON folders;
DROP POLICY IF EXISTS "Only privileged members can delete folders" ON folders;

-- Política de SELECT: usuários podem ver folders em workspaces dos quais são membros
CREATE POLICY "Users can view folders in their workspaces"
ON folders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM spaces s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = folders.space_id
    AND wm.user_id = auth.uid()
  )
);

-- Política de INSERT: membros admin, member e limited_member podem criar folders
CREATE POLICY "Members can create folders"
ON folders FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM spaces s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = folders.space_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'member', 'limited_member')
  )
);

-- Política de UPDATE: membros admin, member e limited_member podem atualizar folders
CREATE POLICY "Members can update folders"
ON folders FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM spaces s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = folders.space_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'member', 'limited_member')
  )
);

-- Política de DELETE: apenas admins e members podem deletar folders
CREATE POLICY "Admins and members can delete folders"
ON folders FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM spaces s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = folders.space_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'member')
  )
);
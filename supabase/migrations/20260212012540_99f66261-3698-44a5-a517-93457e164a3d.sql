
-- Preencher workspace_id nas pastas existentes
UPDATE document_folders df
SET workspace_id = wm.workspace_id
FROM workspace_members wm
WHERE wm.user_id = df.user_id
  AND df.workspace_id IS NULL;

-- Remover politicas antigas
DROP POLICY IF EXISTS "Users can view their own folders" ON document_folders;
DROP POLICY IF EXISTS "Users can create their own folders" ON document_folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON document_folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON document_folders;

-- Novas politicas baseadas em workspace
CREATE POLICY "Workspace members can view folders"
ON document_folders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = document_folders.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role != 'guest'
  )
);

CREATE POLICY "Workspace members can create folders"
ON document_folders FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = document_folders.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role != 'guest'
  )
);

CREATE POLICY "Workspace members can update folders"
ON document_folders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = document_folders.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role != 'guest'
  )
);

CREATE POLICY "Admins and members can delete folders"
ON document_folders FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = document_folders.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'member')
  )
);

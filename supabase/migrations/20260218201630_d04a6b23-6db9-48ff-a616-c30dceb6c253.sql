
DROP POLICY IF EXISTS "Members can create channels" ON chat_channels;
DROP POLICY IF EXISTS "Workspace members can create custom channels" ON chat_channels;

CREATE POLICY "Members can create channels"
ON chat_channels FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = chat_channels.workspace_id
    AND wm.user_id = auth.uid()
  )
);

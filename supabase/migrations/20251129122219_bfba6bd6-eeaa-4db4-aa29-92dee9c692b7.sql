-- Enable RLS on spaces table
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- Allow workspace members to view spaces
CREATE POLICY "Users can view spaces in their workspaces"
ON spaces FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = spaces.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);

-- Allow workspace members to create spaces
CREATE POLICY "Users can create spaces in their workspaces"
ON spaces FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = spaces.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);

-- Allow workspace members to update spaces
CREATE POLICY "Users can update spaces in their workspaces"
ON spaces FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = spaces.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);

-- Allow workspace members to delete spaces
CREATE POLICY "Users can delete spaces in their workspaces"
ON spaces FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = spaces.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);
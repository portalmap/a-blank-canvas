-- Add policy to allow global owners to remove members from any workspace
CREATE POLICY "Global owners can remove members from any workspace"
ON workspace_members FOR DELETE
TO authenticated
USING (is_global_owner(auth.uid()));
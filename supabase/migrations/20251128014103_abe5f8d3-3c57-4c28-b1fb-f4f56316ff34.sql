-- Permitir que global_owners possam adicionar membros a qualquer workspace
CREATE POLICY "Global owners can add members to any workspace"
ON workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  is_global_owner(auth.uid())
);

-- Permitir que global_owners possam atualizar qualquer workspace
CREATE POLICY "Global owners can update any workspace"
ON workspaces
FOR UPDATE
TO authenticated
USING (is_global_owner(auth.uid()));
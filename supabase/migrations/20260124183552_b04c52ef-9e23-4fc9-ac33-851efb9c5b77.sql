-- Remover política atual
DROP POLICY IF EXISTS "Only privileged members can create spaces" ON public.spaces;

-- Criar nova política simplificada que não depende de has_role()
CREATE POLICY "Only privileged members can create spaces" ON public.spaces
FOR INSERT
TO authenticated
WITH CHECK (
  -- Verificar workspace_members diretamente (admin ou member)
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = spaces.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = ANY (ARRAY['admin'::workspace_role, 'member'::workspace_role])
  )
  OR
  -- OU verificar user_roles diretamente (sem usar has_role)
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('global_owner', 'owner', 'admin')
  )
);
-- Remover política antiga de INSERT
DROP POLICY IF EXISTS "Only privileged members can create spaces" ON public.spaces;

-- Criar nova política usando a função has_role() que é SECURITY DEFINER
CREATE POLICY "Only privileged members can create spaces" ON public.spaces
FOR INSERT
TO authenticated
WITH CHECK (
  -- Verificar workspace_members (admin ou member)
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = spaces.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = ANY (ARRAY['admin'::workspace_role, 'member'::workspace_role])
  )
  OR
  -- OU verificar roles globais usando a função has_role()
  has_role(auth.uid(), 'global_owner')
  OR has_role(auth.uid(), 'owner')
  OR has_role(auth.uid(), 'admin')
);
-- Atualizar política de SELECT para permitir que owners vejam seus workspaces
-- mesmo antes de serem adicionados como membros pelo trigger
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;

CREATE POLICY "Users can view workspaces they are members of" 
ON public.workspaces 
FOR SELECT 
USING (
  -- Permite se for o owner do workspace
  (auth.uid() = owner_user_id)
  OR
  -- OU se for membro do workspace
  (EXISTS ( 
    SELECT 1
    FROM workspace_members
    WHERE workspace_members.workspace_id = workspaces.id 
      AND workspace_members.user_id = auth.uid()
  ))
);
-- 1. Criar função para verificar se usuário pode criar workspace
CREATE OR REPLACE FUNCTION public.can_create_workspace(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('global_owner', 'owner', 'admin')
  )
$$;

-- 2. Tornar owner_user_id opcional na tabela workspaces
ALTER TABLE public.workspaces 
ALTER COLUMN owner_user_id DROP NOT NULL;

-- 3. Remover triggers que adicionam membros automaticamente
DROP TRIGGER IF EXISTS auto_add_owner_to_workspace ON public.workspaces;
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;

-- 4. Remover função que não será mais usada
DROP FUNCTION IF EXISTS public.auto_add_workspace_owner();

-- 5. Atualizar política de INSERT - apenas usuários com roles específicos
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;

CREATE POLICY "Authorized users can create workspaces" 
ON public.workspaces 
FOR INSERT 
WITH CHECK (can_create_workspace(auth.uid()));

-- 6. Atualizar política de SELECT - administradores veem tudo, outros apenas seus workspaces
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;

CREATE POLICY "Users can view workspaces they are members of" 
ON public.workspaces 
FOR SELECT 
USING (
  -- Administradores do sistema podem ver todos
  is_system_admin(auth.uid())
  OR
  -- OU se for membro do workspace
  user_is_workspace_member(auth.uid(), id)
);
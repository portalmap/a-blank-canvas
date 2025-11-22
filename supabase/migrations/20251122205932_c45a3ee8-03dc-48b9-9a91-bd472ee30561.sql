-- ============================================
-- FASE 1: SEGURANÇA E VALIDAÇÕES
-- ============================================

-- Tabela de convites de usuários
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role workspace_role NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  CONSTRAINT unique_pending_invitation UNIQUE (workspace_id, email, status)
);

-- Índices para performance
CREATE INDEX idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX idx_user_invitations_workspace ON public.user_invitations(workspace_id);
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);

-- Habilitar RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para convites
CREATE POLICY "Admins can view invitations"
ON public.user_invitations FOR SELECT
USING (
  user_is_workspace_admin(auth.uid(), workspace_id)
);

CREATE POLICY "Admins can create invitations"
ON public.user_invitations FOR INSERT
WITH CHECK (
  user_is_workspace_admin(auth.uid(), workspace_id)
  AND invited_by_user_id = auth.uid()
);

CREATE POLICY "Admins can update invitations"
ON public.user_invitations FOR UPDATE
USING (
  user_is_workspace_admin(auth.uid(), workspace_id)
);

CREATE POLICY "Admins can delete invitations"
ON public.user_invitations FOR DELETE
USING (
  user_is_workspace_admin(auth.uid(), workspace_id)
);

-- Função para validar mudanças de role
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Impedir alteração ou remoção de owner por não-owners
  IF OLD.role = 'owner' THEN
    IF NOT user_has_workspace_role(auth.uid(), NEW.workspace_id, 'owner') THEN
      RAISE EXCEPTION 'Apenas proprietários podem modificar ou remover o role de proprietário';
    END IF;
  END IF;
  
  -- Impedir que admins se promovam a owner
  IF NEW.role = 'owner' AND OLD.role != 'owner' THEN
    IF NOT user_has_workspace_role(auth.uid(), NEW.workspace_id, 'owner') THEN
      RAISE EXCEPTION 'Apenas proprietários podem promover alguém a proprietário';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para validar mudanças de role
DROP TRIGGER IF EXISTS validate_role_change_trigger ON public.workspace_members;
CREATE TRIGGER validate_role_change_trigger
BEFORE UPDATE ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.validate_role_change();

-- Atualizar política de DELETE para proteger owner
DROP POLICY IF EXISTS "Admins can remove workspace members" ON public.workspace_members;
CREATE POLICY "Admins can remove workspace members"
ON public.workspace_members FOR DELETE
USING (
  user_is_workspace_admin(auth.uid(), workspace_id)
  AND role != 'owner'
);

-- Garantir que limited_member não pode excluir tasks
DROP POLICY IF EXISTS "Only privileged members can delete tasks" ON public.tasks;
CREATE POLICY "Only privileged members can delete tasks"
ON public.tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_members.workspace_id = tasks.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'member')
  )
);

-- Garantir que limited_member não pode excluir lists
DROP POLICY IF EXISTS "Only privileged members can delete lists" ON public.lists;
CREATE POLICY "Only privileged members can delete lists"
ON public.lists FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_members.workspace_id = lists.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'member')
  )
);

-- Garantir que limited_member não pode excluir folders
DROP POLICY IF EXISTS "Only privileged members can delete folders" ON public.folders;
CREATE POLICY "Only privileged members can delete folders"
ON public.folders FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM spaces s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = folders.space_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'member')
  )
);

-- Garantir que limited_member não pode excluir spaces
DROP POLICY IF EXISTS "Only privileged members can delete spaces" ON public.spaces;
CREATE POLICY "Only privileged members can delete spaces"
ON public.spaces FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_members.workspace_id = spaces.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'member')
  )
);

-- Função para expirar convites automaticamente
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;

-- Trigger para atualizar updated_at em user_invitations
CREATE TRIGGER update_user_invitations_updated_at
BEFORE UPDATE ON public.user_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
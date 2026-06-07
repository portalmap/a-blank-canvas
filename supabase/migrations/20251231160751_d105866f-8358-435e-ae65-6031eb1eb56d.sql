
-- Atualizar função user_can_access_space para nova lógica
-- Admins do workspace têm acesso a tudo, outros precisam de space_permissions
CREATE OR REPLACE FUNCTION public.user_can_access_space(_user_id uuid, _space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM spaces s
        JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
        WHERE s.id = _space_id
          AND wm.user_id = _user_id
          AND (
              -- Admins do workspace têm acesso a tudo
              wm.role = 'admin'
              OR
              -- Outros precisam de permissão específica no space
              EXISTS (
                  SELECT 1
                  FROM space_permissions sp
                  WHERE sp.space_id = _space_id
                    AND sp.user_id = _user_id
              )
          )
    );
$$;

-- ============================================
-- SPACES - Atualizar políticas
-- ============================================

-- Dropar políticas que dão acesso automático por workspace
DROP POLICY IF EXISTS "Users can view spaces in their workspaces" ON spaces;
DROP POLICY IF EXISTS "Users can create spaces in their workspaces" ON spaces;
DROP POLICY IF EXISTS "Users can update spaces in their workspaces" ON spaces;
DROP POLICY IF EXISTS "Users can delete spaces in their workspaces" ON spaces;

-- A política "Users can view accessible spaces" já existe e usa user_can_access_space

-- ============================================
-- FOLDERS - Atualizar políticas
-- ============================================

-- Dropar política atual de SELECT
DROP POLICY IF EXISTS "Users can view folders in their workspaces" ON folders;

-- Nova política: folders acessíveis se usuário tem acesso ao space pai
CREATE POLICY "Users can view folders in accessible spaces"
ON folders FOR SELECT
USING (
    user_can_access_space(auth.uid(), space_id)
);

-- Atualizar políticas de INSERT para folders
DROP POLICY IF EXISTS "Members can create folders" ON folders;
CREATE POLICY "Members can create folders in accessible spaces"
ON folders FOR INSERT
WITH CHECK (
    user_can_access_space(auth.uid(), space_id)
    AND EXISTS (
        SELECT 1 FROM spaces s
        JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
        WHERE s.id = folders.space_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'member', 'limited_member')
    )
);

-- Atualizar políticas de UPDATE para folders
DROP POLICY IF EXISTS "Members can update folders" ON folders;
CREATE POLICY "Members can update folders in accessible spaces"
ON folders FOR UPDATE
USING (
    user_can_access_space(auth.uid(), space_id)
    AND EXISTS (
        SELECT 1 FROM spaces s
        JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
        WHERE s.id = folders.space_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'member', 'limited_member')
    )
);

-- Atualizar políticas de DELETE para folders
DROP POLICY IF EXISTS "Admins and members can delete folders" ON folders;
CREATE POLICY "Members can delete folders in accessible spaces"
ON folders FOR DELETE
USING (
    user_can_access_space(auth.uid(), space_id)
    AND EXISTS (
        SELECT 1 FROM spaces s
        JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
        WHERE s.id = folders.space_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'member')
    )
);

-- ============================================
-- LISTS - Criar função auxiliar e atualizar políticas
-- ============================================

-- Função para verificar acesso à list via space
CREATE OR REPLACE FUNCTION public.user_can_access_list_via_space(_user_id uuid, _list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM lists l
        WHERE l.id = _list_id
          AND (
              -- Acesso direto via space_id da list
              (l.space_id IS NOT NULL AND user_can_access_space(_user_id, l.space_id))
              OR
              -- Acesso via folder -> space
              (l.folder_id IS NOT NULL AND EXISTS (
                  SELECT 1 FROM folders f
                  WHERE f.id = l.folder_id
                  AND user_can_access_space(_user_id, f.space_id)
              ))
          )
    );
$$;

-- Atualizar função user_can_access_list para usar nova lógica
CREATE OR REPLACE FUNCTION public.user_can_access_list(_user_id uuid, _list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT user_can_access_list_via_space(_user_id, _list_id);
$$;

-- ============================================
-- TASKS - Atualizar função e políticas
-- ============================================

-- Atualizar função user_can_access_task para usar nova lógica
CREATE OR REPLACE FUNCTION public.user_can_access_task(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM tasks t
        WHERE t.id = _task_id
          AND user_can_access_list_via_space(_user_id, t.list_id)
    );
$$;

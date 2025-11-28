-- Migração para remover role 'owner' do workspace_role
-- Passo 1: Atualizar todos os membros 'owner' para 'admin'
UPDATE public.workspace_members SET role = 'admin' WHERE role = 'owner';

-- Passo 2: DROP todas as policies que dependem da coluna role
DROP POLICY IF EXISTS "Admins can add workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can remove workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can update workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Global owners can add members to any workspace" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;

DROP POLICY IF EXISTS "Owners can delete workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Admins can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Authorized users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Global owners can update any workspace" ON public.workspaces;

DROP POLICY IF EXISTS "Only privileged members can create spaces" ON public.spaces;
DROP POLICY IF EXISTS "Only privileged members can update spaces" ON public.spaces;
DROP POLICY IF EXISTS "Only privileged members can delete spaces" ON public.spaces;
DROP POLICY IF EXISTS "Users can view accessible spaces" ON public.spaces;

DROP POLICY IF EXISTS "Only privileged members can create folders" ON public.folders;
DROP POLICY IF EXISTS "Only privileged members can update folders" ON public.folders;
DROP POLICY IF EXISTS "Only privileged members can delete folders" ON public.folders;
DROP POLICY IF EXISTS "Users can view accessible folders" ON public.folders;

DROP POLICY IF EXISTS "Only privileged members can create lists" ON public.lists;
DROP POLICY IF EXISTS "Only privileged members can update lists" ON public.lists;
DROP POLICY IF EXISTS "Only privileged members can delete lists" ON public.lists;
DROP POLICY IF EXISTS "Users can view accessible lists" ON public.lists;

DROP POLICY IF EXISTS "Authorized members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authorized members can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Only privileged members can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view accessible tasks" ON public.tasks;

DROP POLICY IF EXISTS "Admins can create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can view invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.user_invitations;

-- Passo 3: Remover DEFAULT da coluna role
ALTER TABLE public.workspace_members ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.user_invitations ALTER COLUMN role DROP DEFAULT;

-- Passo 4: Renomear o enum existente
ALTER TYPE workspace_role RENAME TO workspace_role_old;

-- Passo 5: Criar novo enum sem 'owner'
CREATE TYPE workspace_role AS ENUM ('admin', 'member', 'limited_member', 'guest');

-- Passo 6: DROP as funções que dependem do enum
DROP FUNCTION IF EXISTS public.user_has_workspace_role(uuid, uuid, workspace_role_old);
DROP FUNCTION IF EXISTS public.get_user_workspace_role(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_workspace_members_with_emails(uuid);

-- Passo 7: Atualizar as colunas para usar o novo enum
ALTER TABLE public.workspace_members 
  ALTER COLUMN role TYPE workspace_role 
  USING role::text::workspace_role;

ALTER TABLE public.user_invitations 
  ALTER COLUMN role TYPE workspace_role 
  USING role::text::workspace_role;

-- Passo 8: Remover o enum antigo
DROP TYPE workspace_role_old;

-- Passo 9: Recriar as funções com o novo enum
CREATE FUNCTION public.user_has_workspace_role(_user_id uuid, _workspace_id uuid, _role workspace_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_members
        WHERE user_id = _user_id
          AND workspace_id = _workspace_id
          AND role = _role
    );
$$;

CREATE FUNCTION public.get_user_workspace_role(_user_id uuid, _workspace_id uuid)
RETURNS workspace_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
    LIMIT 1;
$$;

CREATE FUNCTION get_workspace_members_with_emails(workspace_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  workspace_id UUID,
  role workspace_role,
  created_at TIMESTAMPTZ,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wm.id,
    wm.user_id,
    wm.workspace_id,
    wm.role,
    wm.created_at,
    au.email
  FROM workspace_members wm
  LEFT JOIN auth.users au ON au.id = wm.user_id
  WHERE wm.workspace_id = workspace_uuid
  ORDER BY wm.created_at DESC;
END;
$$;

-- Passo 10: Restaurar DEFAULT
ALTER TABLE public.workspace_members ALTER COLUMN role SET DEFAULT 'member'::workspace_role;

-- Passo 11: Remover coluna owner_user_id da tabela workspaces
ALTER TABLE public.workspaces DROP COLUMN IF EXISTS owner_user_id;

-- Passo 12: Recriar as RLS policies atualizadas

-- workspace_members policies
CREATE POLICY "Admins can add workspace members"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can remove workspace members"
ON public.workspace_members
FOR DELETE
TO authenticated
USING (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update workspace members"
ON public.workspace_members
FOR UPDATE
TO authenticated
USING (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Global owners can add members to any workspace"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (is_global_owner(auth.uid()));

CREATE POLICY "Users can view workspace members"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_is_workspace_member(auth.uid(), workspace_id));

-- workspaces policies
CREATE POLICY "Admins can delete workspaces"
ON public.workspaces
FOR DELETE
TO authenticated
USING (user_has_workspace_role(auth.uid(), id, 'admin'));

CREATE POLICY "Users can view workspaces they are members of"
ON public.workspaces
FOR SELECT
TO authenticated
USING (is_system_admin(auth.uid()) OR user_is_workspace_member(auth.uid(), id));

CREATE POLICY "Admins can update workspaces"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (user_is_workspace_admin(auth.uid(), id));

CREATE POLICY "Authorized users can create workspaces"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (can_create_workspace(auth.uid()));

CREATE POLICY "Global owners can update any workspace"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (is_global_owner(auth.uid()));

-- spaces policies
CREATE POLICY "Only privileged members can create spaces"
ON public.spaces
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = spaces.workspace_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'member')
  )
);

CREATE POLICY "Only privileged members can update spaces"
ON public.spaces
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = spaces.workspace_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'member')
  )
);

CREATE POLICY "Only privileged members can delete spaces"
ON public.spaces
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = spaces.workspace_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'member')
  )
);

CREATE POLICY "Users can view accessible spaces"
ON public.spaces
FOR SELECT
TO authenticated
USING (user_can_access_space(auth.uid(), id));

-- folders policies
CREATE POLICY "Only privileged members can create folders"
ON public.folders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM spaces s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = folders.space_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'member')
  )
);

CREATE POLICY "Only privileged members can update folders"
ON public.folders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM spaces s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = folders.space_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'member')
  )
);

CREATE POLICY "Only privileged members can delete folders"
ON public.folders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM spaces s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = folders.space_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'member')
  )
);

CREATE POLICY "Users can view accessible folders"
ON public.folders
FOR SELECT
TO authenticated
USING (user_can_access_folder(auth.uid(), id));

-- lists policies
CREATE POLICY "Only privileged members can create lists"
ON public.lists
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = lists.workspace_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'member')
  )
);

CREATE POLICY "Only privileged members can update lists"
ON public.lists
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = lists.workspace_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'member')
  )
);

CREATE POLICY "Only privileged members can delete lists"
ON public.lists
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = lists.workspace_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'member')
  )
);

CREATE POLICY "Users can view accessible lists"
ON public.lists
FOR SELECT
TO authenticated
USING (user_can_access_list(auth.uid(), id));

-- tasks policies
CREATE POLICY "Authorized members can create tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = tasks.workspace_id
      AND wm.user_id = auth.uid()
      AND (
        wm.role IN ('admin', 'member', 'limited_member')
        OR (wm.role = 'guest' AND tasks.list_id IS NOT NULL AND user_can_access_list(auth.uid(), tasks.list_id))
      )
  )
);

CREATE POLICY "Authorized members can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = tasks.workspace_id
      AND user_id = auth.uid()
      AND (
        role IN ('admin', 'member', 'limited_member')
        OR (role = 'guest' AND user_can_access_task(auth.uid(), tasks.id))
      )
  )
);

CREATE POLICY "Only privileged members can delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = tasks.workspace_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'member')
  )
);

CREATE POLICY "Users can view accessible tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (user_can_access_task(auth.uid(), id));

-- user_invitations policies
CREATE POLICY "Admins can create invitations"
ON public.user_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  user_is_workspace_admin(auth.uid(), workspace_id)
  AND invited_by_user_id = auth.uid()
);

CREATE POLICY "Admins can view invitations"
ON public.user_invitations
FOR SELECT
TO authenticated
USING (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update invitations"
ON public.user_invitations
FOR UPDATE
TO authenticated
USING (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete invitations"
ON public.user_invitations
FOR DELETE
TO authenticated
USING (user_is_workspace_admin(auth.uid(), workspace_id));

-- Passo 13: Atualizar funções SQL que referenciam 'owner'

-- Atualizar user_is_workspace_admin para usar 'admin'
CREATE OR REPLACE FUNCTION public.user_is_workspace_admin(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_members
        WHERE user_id = _user_id
          AND workspace_id = _workspace_id
          AND role = 'admin'
    );
$$;

-- Atualizar add_workspace_creator_as_member para usar 'admin'
CREATE OR REPLACE FUNCTION public.add_workspace_creator_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'admin')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  
  NEW.created_by_user_id := auth.uid();
  
  RETURN NEW;
END;
$$;

-- Atualizar user_can_access_space
CREATE OR REPLACE FUNCTION public.user_can_access_space(_user_id uuid, _space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM spaces s
        JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
        WHERE s.id = _space_id
          AND wm.user_id = _user_id
          AND (
              wm.role IN ('admin', 'member', 'limited_member')
              OR
              (wm.role = 'guest' AND EXISTS (
                  SELECT 1
                  FROM space_permissions sp
                  WHERE sp.space_id = _space_id
                    AND sp.user_id = _user_id
              ))
          )
    );
$$;

-- Atualizar user_can_access_folder
CREATE OR REPLACE FUNCTION public.user_can_access_folder(_user_id uuid, _folder_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM folders f
        JOIN spaces s ON s.id = f.space_id
        JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
        WHERE f.id = _folder_id
          AND wm.user_id = _user_id
          AND (
              wm.role IN ('admin', 'member', 'limited_member')
              OR
              (wm.role = 'guest' AND (
                  EXISTS (
                      SELECT 1
                      FROM folder_permissions fp
                      WHERE fp.folder_id = _folder_id
                        AND fp.user_id = _user_id
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM space_permissions sp
                      WHERE sp.space_id = f.space_id
                        AND sp.user_id = _user_id
                  )
              ))
          )
    );
$$;

-- Atualizar user_can_access_list
CREATE OR REPLACE FUNCTION public.user_can_access_list(_user_id uuid, _list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM lists l
        JOIN workspace_members wm ON wm.workspace_id = l.workspace_id
        WHERE l.id = _list_id
          AND wm.user_id = _user_id
          AND (
              wm.role IN ('admin', 'member', 'limited_member')
              OR
              (wm.role = 'guest' AND (
                  EXISTS (
                      SELECT 1
                      FROM list_permissions lp
                      WHERE lp.list_id = _list_id
                        AND lp.user_id = _user_id
                  )
                  OR (l.folder_id IS NOT NULL AND EXISTS (
                      SELECT 1
                      FROM folder_permissions fp
                      WHERE fp.folder_id = l.folder_id
                        AND fp.user_id = _user_id
                  ))
                  OR (l.space_id IS NOT NULL AND EXISTS (
                      SELECT 1
                      FROM space_permissions sp
                      WHERE sp.space_id = l.space_id
                        AND sp.user_id = _user_id
                  ))
              ))
          )
    );
$$;

-- Atualizar user_can_access_task
CREATE OR REPLACE FUNCTION public.user_can_access_task(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM tasks t
        JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
        WHERE t.id = _task_id
          AND wm.user_id = _user_id
          AND (
              wm.role IN ('admin', 'member', 'limited_member')
              OR
              (wm.role = 'guest' AND (
                  EXISTS (
                      SELECT 1
                      FROM task_permissions tp
                      WHERE tp.task_id = _task_id
                        AND tp.user_id = _user_id
                  )
                  OR (t.list_id IS NOT NULL AND EXISTS (
                      SELECT 1
                      FROM list_permissions lp
                      WHERE lp.list_id = t.list_id
                        AND lp.user_id = _user_id
                  ))
                  OR (t.folder_id IS NOT NULL AND EXISTS (
                      SELECT 1
                      FROM folder_permissions fp
                      WHERE fp.folder_id = t.folder_id
                        AND fp.user_id = _user_id
                  ))
                  OR (t.space_id IS NOT NULL AND EXISTS (
                      SELECT 1
                      FROM space_permissions sp
                      WHERE sp.space_id = t.space_id
                        AND sp.user_id = _user_id
                  ))
              ))
          )
    );
$$;
-- Complete Permission System Overhaul
-- Implements role-based access control with granular permissions for guests

-- ============================================================================
-- HELPER FUNCTIONS FOR PERMISSION CHECKS
-- ============================================================================

-- Check if user can access a space (considering role and explicit permissions)
CREATE OR REPLACE FUNCTION public.user_can_access_space(
    _user_id UUID,
    _space_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
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
              -- Owners, admins, members, and limited_members can see all spaces
              wm.role IN ('owner', 'admin', 'member', 'limited_member')
              OR
              -- Guests need explicit permission
              (wm.role = 'guest' AND EXISTS (
                  SELECT 1
                  FROM space_permissions sp
                  WHERE sp.space_id = _space_id
                    AND sp.user_id = _user_id
              ))
          )
    );
$$;

-- Check if user can access a folder (considering role and explicit/inherited permissions)
CREATE OR REPLACE FUNCTION public.user_can_access_folder(
    _user_id UUID,
    _folder_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
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
              -- Owners, admins, members, and limited_members can see all folders
              wm.role IN ('owner', 'admin', 'member', 'limited_member')
              OR
              -- Guests need explicit permission on folder OR on parent space
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

-- Check if user can access a list (considering role and explicit/inherited permissions)
CREATE OR REPLACE FUNCTION public.user_can_access_list(
    _user_id UUID,
    _list_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
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
              -- Owners, admins, members, and limited_members can see all lists
              wm.role IN ('owner', 'admin', 'member', 'limited_member')
              OR
              -- Guests need explicit permission on list OR on parent folder/space
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

-- Check if user can access a task (considering role and explicit/inherited permissions)
CREATE OR REPLACE FUNCTION public.user_can_access_task(
    _user_id UUID,
    _task_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
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
              -- Owners, admins, members, and limited_members can see all tasks
              wm.role IN ('owner', 'admin', 'member', 'limited_member')
              OR
              -- Guests need explicit permission on task OR on parent list/folder/space
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

-- ============================================================================
-- UPDATE SPACES POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Members can create spaces" ON public.spaces;
DROP POLICY IF EXISTS "Users can view spaces in their workspaces" ON public.spaces;
DROP POLICY IF EXISTS "Members can update spaces" ON public.spaces;
DROP POLICY IF EXISTS "Members can delete spaces" ON public.spaces;

-- Only owner, admin, and member can create spaces
CREATE POLICY "Only privileged members can create spaces"
    ON public.spaces FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM workspace_members
            WHERE workspace_id = spaces.workspace_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin', 'member')
        )
    );

-- View spaces based on role and permissions
CREATE POLICY "Users can view accessible spaces"
    ON public.spaces FOR SELECT
    USING (public.user_can_access_space(auth.uid(), id));

-- Only owner, admin, and member can update spaces
CREATE POLICY "Only privileged members can update spaces"
    ON public.spaces FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM workspace_members
            WHERE workspace_id = spaces.workspace_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin', 'member')
        )
    );

-- Only owner, admin, and member can delete spaces
CREATE POLICY "Only privileged members can delete spaces"
    ON public.spaces FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM workspace_members
            WHERE workspace_id = spaces.workspace_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin', 'member')
        )
    );

-- ============================================================================
-- UPDATE FOLDERS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Members can create folders" ON public.folders;
DROP POLICY IF EXISTS "Users can view folders" ON public.folders;
DROP POLICY IF EXISTS "Members can update folders" ON public.folders;
DROP POLICY IF EXISTS "Members can delete folders" ON public.folders;

-- Only owner, admin, and member can create folders
CREATE POLICY "Only privileged members can create folders"
    ON public.folders FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM spaces s
            JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
            WHERE s.id = folders.space_id
              AND wm.user_id = auth.uid()
              AND wm.role IN ('owner', 'admin', 'member')
        )
    );

-- View folders based on role and permissions
CREATE POLICY "Users can view accessible folders"
    ON public.folders FOR SELECT
    USING (public.user_can_access_folder(auth.uid(), id));

-- Only owner, admin, and member can update folders
CREATE POLICY "Only privileged members can update folders"
    ON public.folders FOR UPDATE
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

-- Only owner, admin, and member can delete folders
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

-- ============================================================================
-- UPDATE LISTS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Members can create lists" ON public.lists;
DROP POLICY IF EXISTS "Users can view lists" ON public.lists;
DROP POLICY IF EXISTS "Members can update lists" ON public.lists;
DROP POLICY IF EXISTS "Members can delete lists" ON public.lists;

-- Only owner, admin, and member can create lists
CREATE POLICY "Only privileged members can create lists"
    ON public.lists FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM workspace_members
            WHERE workspace_id = lists.workspace_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin', 'member')
        )
    );

-- View lists based on role and permissions
CREATE POLICY "Users can view accessible lists"
    ON public.lists FOR SELECT
    USING (public.user_can_access_list(auth.uid(), id));

-- Only owner, admin, and member can update lists
CREATE POLICY "Only privileged members can update lists"
    ON public.lists FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM workspace_members
            WHERE workspace_id = lists.workspace_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin', 'member')
        )
    );

-- Only owner, admin, and member can delete lists
CREATE POLICY "Only privileged members can delete lists"
    ON public.lists FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM workspace_members
            WHERE workspace_id = lists.workspace_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin', 'member')
        )
    );

-- ============================================================================
-- UPDATE TASKS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can delete tasks" ON public.tasks;

-- Owner, admin, member, and limited_member can create tasks
-- Guests can only create tasks in lists they have access to
CREATE POLICY "Authorized members can create tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (
        created_by_user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM workspace_members wm
            WHERE wm.workspace_id = tasks.workspace_id
              AND wm.user_id = auth.uid()
              AND (
                  -- Privileged users and limited_member can create tasks anywhere
                  wm.role IN ('owner', 'admin', 'member', 'limited_member')
                  OR
                  -- Guests can only create tasks in accessible lists
                  (wm.role = 'guest' AND tasks.list_id IS NOT NULL AND public.user_can_access_list(auth.uid(), tasks.list_id))
              )
        )
    );

-- View tasks based on role and permissions
CREATE POLICY "Users can view accessible tasks"
    ON public.tasks FOR SELECT
    USING (public.user_can_access_task(auth.uid(), id));

-- Owner, admin, member, and limited_member can update tasks
-- Guests can only update tasks they have access to
CREATE POLICY "Authorized members can update tasks"
    ON public.tasks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM workspace_members
            WHERE workspace_id = tasks.workspace_id
              AND user_id = auth.uid()
              AND (
                  role IN ('owner', 'admin', 'member', 'limited_member')
                  OR
                  (role = 'guest' AND public.user_can_access_task(auth.uid(), tasks.id))
              )
        )
    );

-- Only owner, admin, and member can delete tasks
CREATE POLICY "Only privileged members can delete tasks"
    ON public.tasks FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM workspace_members
            WHERE workspace_id = tasks.workspace_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin', 'member')
        )
    );
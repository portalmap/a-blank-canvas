-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for workspace member roles
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member', 'limited_member', 'guest');

-- Create enum for permission roles
CREATE TYPE public.permission_role AS ENUM ('viewer', 'commenter', 'editor');

-- Create enum for task priority
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create enum for status scope
CREATE TYPE public.status_scope AS ENUM ('workspace', 'space', 'folder', 'list');

-- Create enum for list default view
CREATE TYPE public.list_view AS ENUM ('list', 'kanban', 'sprint');

-- =============================================
-- WORKSPACES TABLE
-- =============================================
CREATE TABLE public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- WORKSPACE MEMBERS TABLE
-- =============================================
CREATE TABLE public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.workspace_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- =============================================
-- SPACES TABLE
-- =============================================
CREATE TABLE public.spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- FOLDERS TABLE
-- =============================================
CREATE TABLE public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- LISTS TABLE
-- =============================================
CREATE TABLE public.lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    default_view public.list_view NOT NULL DEFAULT 'list',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- STATUSES TABLE
-- =============================================
CREATE TABLE public.statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    scope_type public.status_scope NOT NULL DEFAULT 'workspace',
    scope_id UUID,
    name TEXT NOT NULL,
    color TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- TASKS TABLE
-- =============================================
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    list_id UUID REFERENCES public.lists(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status_id UUID NOT NULL REFERENCES public.statuses(id) ON DELETE RESTRICT,
    priority public.task_priority NOT NULL DEFAULT 'medium',
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- TASK ASSIGNEES TABLE (multiple assignees)
-- =============================================
CREATE TABLE public.task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

-- =============================================
-- PERMISSION TABLES
-- =============================================
CREATE TABLE public.space_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID,
    role public.permission_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL))
);

CREATE TABLE public.folder_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID,
    role public.permission_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL))
);

CREATE TABLE public.list_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID,
    role public.permission_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL))
);

CREATE TABLE public.task_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.permission_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_spaces_workspace ON public.spaces(workspace_id);
CREATE INDEX idx_folders_space ON public.folders(space_id);
CREATE INDEX idx_lists_workspace ON public.lists(workspace_id);
CREATE INDEX idx_lists_space ON public.lists(space_id);
CREATE INDEX idx_lists_folder ON public.lists(folder_id);
CREATE INDEX idx_tasks_workspace ON public.tasks(workspace_id);
CREATE INDEX idx_tasks_space ON public.tasks(space_id);
CREATE INDEX idx_tasks_folder ON public.tasks(folder_id);
CREATE INDEX idx_tasks_list ON public.tasks(list_id);
CREATE INDEX idx_tasks_status ON public.tasks(status_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by_user_id);
CREATE INDEX idx_statuses_workspace ON public.statuses(workspace_id);

-- =============================================
-- SECURITY DEFINER FUNCTIONS (prevent RLS recursion)
-- =============================================

-- Function to check if user has a specific workspace role
CREATE OR REPLACE FUNCTION public.user_has_workspace_role(
    _user_id UUID,
    _workspace_id UUID,
    _role public.workspace_role
)
RETURNS BOOLEAN
LANGUAGE SQL
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

-- Function to check if user is owner or admin
CREATE OR REPLACE FUNCTION public.user_is_workspace_admin(
    _user_id UUID,
    _workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_members
        WHERE user_id = _user_id
          AND workspace_id = _workspace_id
          AND role IN ('owner', 'admin')
    );
$$;

-- Function to get user's workspace role
CREATE OR REPLACE FUNCTION public.get_user_workspace_role(
    _user_id UUID,
    _workspace_id UUID
)
RETURNS public.workspace_role
LANGUAGE SQL
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

-- Function to check if user has permission on a space
CREATE OR REPLACE FUNCTION public.user_has_space_permission(
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
        FROM public.space_permissions
        WHERE space_id = _space_id
          AND user_id = _user_id
    );
$$;

-- =============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply update triggers
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON public.spaces
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON public.lists
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to automatically add owner as workspace member
CREATE OR REPLACE FUNCTION public.auto_add_workspace_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.owner_user_id, 'owner');
    RETURN NEW;
END;
$$;

CREATE TRIGGER auto_add_owner_to_workspace
    AFTER INSERT ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_add_workspace_owner();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_permissions ENABLE ROW LEVEL SECURITY;

-- WORKSPACES POLICIES
CREATE POLICY "Users can view workspaces they are members of"
    ON public.workspaces FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = workspaces.id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create workspaces"
    ON public.workspaces FOR INSERT
    WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Admins can update workspaces"
    ON public.workspaces FOR UPDATE
    USING (public.user_is_workspace_admin(auth.uid(), id));

CREATE POLICY "Owners can delete workspaces"
    ON public.workspaces FOR DELETE
    USING (public.user_has_workspace_role(auth.uid(), id, 'owner'));

-- WORKSPACE MEMBERS POLICIES
CREATE POLICY "Users can view workspace members"
    ON public.workspace_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
              AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can add workspace members"
    ON public.workspace_members FOR INSERT
    WITH CHECK (public.user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update workspace members"
    ON public.workspace_members FOR UPDATE
    USING (
        public.user_is_workspace_admin(auth.uid(), workspace_id)
        AND role != 'owner'
    );

CREATE POLICY "Admins can remove workspace members"
    ON public.workspace_members FOR DELETE
    USING (
        public.user_is_workspace_admin(auth.uid(), workspace_id)
        AND role != 'owner'
    );

-- SPACES POLICIES
CREATE POLICY "Users can view spaces in their workspaces"
    ON public.spaces FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = spaces.workspace_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create spaces"
    ON public.spaces FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = spaces.workspace_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can update spaces"
    ON public.spaces FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = spaces.workspace_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "Members can delete spaces"
    ON public.spaces FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = spaces.workspace_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin', 'member')
        )
    );

-- FOLDERS POLICIES
CREATE POLICY "Users can view folders"
    ON public.folders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.spaces s
            JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
            WHERE s.id = folders.space_id
              AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create folders"
    ON public.folders FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM public.spaces s
            JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
            WHERE s.id = folders.space_id
              AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can update folders"
    ON public.folders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM public.spaces s
            JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
            WHERE s.id = folders.space_id
              AND wm.user_id = auth.uid()
              AND wm.role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "Members can delete folders"
    ON public.folders FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM public.spaces s
            JOIN public.workspace_members wm ON wm.workspace_id = s.workspace_id
            WHERE s.id = folders.space_id
              AND wm.user_id = auth.uid()
              AND wm.role IN ('owner', 'admin', 'member')
        )
    );

-- LISTS POLICIES
CREATE POLICY "Users can view lists"
    ON public.lists FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = lists.workspace_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create lists"
    ON public.lists FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = lists.workspace_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can update lists"
    ON public.lists FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = lists.workspace_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "Members can delete lists"
    ON public.lists FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = lists.workspace_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin', 'member')
        )
    );

-- STATUSES POLICIES
CREATE POLICY "Users can view statuses"
    ON public.statuses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = statuses.workspace_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage statuses"
    ON public.statuses FOR ALL
    USING (public.user_is_workspace_admin(auth.uid(), workspace_id));

-- TASKS POLICIES
CREATE POLICY "Users can view tasks"
    ON public.tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = tasks.workspace_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = tasks.workspace_id
              AND user_id = auth.uid()
        )
        AND created_by_user_id = auth.uid()
    );

CREATE POLICY "Members can update tasks"
    ON public.tasks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = tasks.workspace_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can delete tasks"
    ON public.tasks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = tasks.workspace_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin', 'member')
        )
    );

-- TASK ASSIGNEES POLICIES
CREATE POLICY "Users can view task assignees"
    ON public.task_assignees FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.tasks t
            JOIN public.workspace_members wm ON wm.workspace_id = t.workspace_id
            WHERE t.id = task_assignees.task_id
              AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can manage task assignees"
    ON public.task_assignees FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM public.tasks t
            JOIN public.workspace_members wm ON wm.workspace_id = t.workspace_id
            WHERE t.id = task_assignees.task_id
              AND wm.user_id = auth.uid()
        )
    );

-- PERMISSION TABLES POLICIES (basic - can be expanded)
CREATE POLICY "Users can view permissions"
    ON public.space_permissions FOR SELECT
    USING (user_id = auth.uid() OR public.user_has_space_permission(auth.uid(), space_id));

CREATE POLICY "Admins can manage permissions"
    ON public.space_permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM public.spaces s
            WHERE s.id = space_permissions.space_id
              AND public.user_is_workspace_admin(auth.uid(), s.workspace_id)
        )
    );

CREATE POLICY "Users can view folder permissions"
    ON public.folder_permissions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage folder permissions"
    ON public.folder_permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM public.folders f
            JOIN public.spaces s ON s.id = f.space_id
            WHERE f.id = folder_permissions.folder_id
              AND public.user_is_workspace_admin(auth.uid(), s.workspace_id)
        )
    );

CREATE POLICY "Users can view list permissions"
    ON public.list_permissions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage list permissions"
    ON public.list_permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM public.lists l
            WHERE l.id = list_permissions.list_id
              AND public.user_is_workspace_admin(auth.uid(), l.workspace_id)
        )
    );

CREATE POLICY "Users can view task permissions"
    ON public.task_permissions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage task permissions"
    ON public.task_permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM public.tasks t
            WHERE t.id = task_permissions.task_id
              AND public.user_is_workspace_admin(auth.uid(), t.workspace_id)
        )
    );
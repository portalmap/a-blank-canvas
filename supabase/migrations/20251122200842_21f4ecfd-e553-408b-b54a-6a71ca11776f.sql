-- Fix infinite recursion in workspace_members policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can add workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can update workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can remove workspace members" ON public.workspace_members;

-- Create helper function to check if user is member of workspace
CREATE OR REPLACE FUNCTION public.user_is_workspace_member(
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
    );
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view workspace members"
    ON public.workspace_members FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.user_is_workspace_member(auth.uid(), workspace_id)
    );

CREATE POLICY "Admins can add workspace members"
    ON public.workspace_members FOR INSERT
    WITH CHECK (
        public.user_is_workspace_admin(auth.uid(), workspace_id)
    );

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
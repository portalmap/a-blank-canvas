-- Create security definer function to check if user can create lists in a space
CREATE OR REPLACE FUNCTION public.user_can_create_in_space(_user_id uuid, _space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM spaces s
        JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
        WHERE s.id = _space_id
          AND wm.user_id = _user_id
          AND wm.role IN ('admin', 'member', 'limited_member')
    );
$$;

-- Drop existing INSERT policy on lists
DROP POLICY IF EXISTS "Members can create lists" ON public.lists;

-- Create new INSERT policy using the security definer function
CREATE POLICY "Members can create lists" 
ON public.lists 
FOR INSERT 
TO authenticated
WITH CHECK (user_can_create_in_space(auth.uid(), space_id));
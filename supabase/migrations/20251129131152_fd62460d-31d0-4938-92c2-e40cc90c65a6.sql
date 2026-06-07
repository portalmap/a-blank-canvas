-- Remove existing policies
DROP POLICY IF EXISTS "Only privileged members can create lists" ON public.lists;
DROP POLICY IF EXISTS "Members can create lists" ON public.lists;

-- Create new simplified policy using existing function
CREATE POLICY "Members can create lists"
ON public.lists
FOR INSERT
TO authenticated
WITH CHECK (
  user_is_workspace_member(auth.uid(), workspace_id)
  AND EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = lists.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'member', 'limited_member')
  )
);

-- Force schema reload
NOTIFY pgrst, 'reload schema';
-- Allow limited_member to create lists (same as folders)
DROP POLICY IF EXISTS "Only privileged members can create lists" ON public.lists;

CREATE POLICY "Only privileged members can create lists"
ON public.lists
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_members.workspace_id = lists.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('admin', 'member', 'limited_member')
  )
);

-- Also update the update and delete policies to be consistent
DROP POLICY IF EXISTS "Only privileged members can update lists" ON public.lists;

CREATE POLICY "Only privileged members can update lists"
ON public.lists
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_members.workspace_id = lists.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('admin', 'member', 'limited_member')
  )
);

DROP POLICY IF EXISTS "Only privileged members can delete lists" ON public.lists;

CREATE POLICY "Only privileged members can delete lists"
ON public.lists
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_members.workspace_id = lists.workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('admin', 'member')
  )
);
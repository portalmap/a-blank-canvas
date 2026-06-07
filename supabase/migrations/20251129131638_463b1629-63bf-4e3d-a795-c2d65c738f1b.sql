-- Fix list INSERT policy to match folders pattern
DROP POLICY IF EXISTS "Members can create lists" ON public.lists;

CREATE POLICY "Members can create lists"
ON public.lists
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM spaces s
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE s.id = lists.space_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'member', 'limited_member')
  )
);

-- Force schema reload
NOTIFY pgrst, 'reload schema';
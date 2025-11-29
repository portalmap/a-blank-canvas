-- Drop the problematic SELECT policy that uses user_can_access_list (causes self-reference)
DROP POLICY IF EXISTS "Users can view accessible lists" ON public.lists;

-- Create new simplified SELECT policy (matching the working pattern from folders table)
CREATE POLICY "Users can view accessible lists" 
ON public.lists 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = lists.workspace_id
      AND wm.user_id = auth.uid()
  )
);
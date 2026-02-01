-- 1. Alterar constraint de tasks.list_id para CASCADE
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_list_id_fkey;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_list_id_fkey 
    FOREIGN KEY (list_id) 
    REFERENCES public.lists(id) 
    ON DELETE CASCADE;

-- 2. Restringir exclusão de space para apenas admin
DROP POLICY IF EXISTS "Only privileged members can delete spaces" ON public.spaces;

CREATE POLICY "Only admins can delete spaces"
ON public.spaces
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = spaces.workspace_id
      AND user_id = auth.uid()
      AND role = 'admin'
  )
  OR is_system_admin(auth.uid())
);
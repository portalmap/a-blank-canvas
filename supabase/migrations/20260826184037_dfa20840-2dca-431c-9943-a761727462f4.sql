DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.task_attachments;

CREATE POLICY "Owners and admins can delete attachments"
ON public.task_attachments
FOR DELETE
USING (
  uploaded_by = auth.uid()
  OR public.is_global_owner(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_attachments.task_id
      AND public.is_workspace_admin(auth.uid(), t.workspace_id)
  )
);
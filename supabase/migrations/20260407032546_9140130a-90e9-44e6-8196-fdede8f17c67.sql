
-- Drop the existing INSERT policy that only allows self-notifications
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;

-- Create new policy: workspace members can create notifications for other members
CREATE POLICY "Workspace members can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_members.workspace_id = notifications.workspace_id
      AND workspace_members.user_id = auth.uid()
  )
);

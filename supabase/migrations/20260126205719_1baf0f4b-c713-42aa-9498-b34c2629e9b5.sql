-- Add RLS policy to allow assignees to resolve messages assigned to them
CREATE POLICY "Assignees can resolve messages assigned to them"
ON chat_messages
FOR UPDATE
USING (assignee_id = auth.uid())
WITH CHECK (assignee_id = auth.uid());
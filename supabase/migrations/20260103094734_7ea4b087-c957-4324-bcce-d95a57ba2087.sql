-- Drop the old policy that allows all workspace members to view space channels
DROP POLICY IF EXISTS "Workspace members can view space channels" ON chat_channels;

-- Create new policy that links chat channel visibility to space permissions
-- This ensures users can only see space channels if they have access to the linked space
CREATE POLICY "Users can view space channels they have access to"
ON chat_channels
FOR SELECT
USING (
  (type = 'space'::chat_channel_type) 
  AND (linked_space_id IS NOT NULL)
  AND user_can_access_space(auth.uid(), linked_space_id)
);
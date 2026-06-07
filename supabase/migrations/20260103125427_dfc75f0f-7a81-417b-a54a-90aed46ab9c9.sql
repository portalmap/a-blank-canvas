-- Remove the generic policy that allows ALL workspace members to view ALL channels
-- This was overriding the specific policies for space and custom channels
DROP POLICY IF EXISTS "Users can view channels in their workspaces" ON chat_channels;

-- Create policy for global_owner to maintain full access to all channels
CREATE POLICY "Global owners can view all channels"
ON chat_channels
FOR SELECT
USING (is_global_owner(auth.uid()));
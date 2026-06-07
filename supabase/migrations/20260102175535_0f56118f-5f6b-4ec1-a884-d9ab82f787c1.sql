-- Drop existing policies for chat_channels
DROP POLICY IF EXISTS "Users can view space channels" ON chat_channels;
DROP POLICY IF EXISTS "Users can view custom channels they are members of" ON chat_channels;
DROP POLICY IF EXISTS "Users can create custom channels" ON chat_channels;

-- Create simpler, more permissive policies for chat_channels
-- 1. Workspace members can view all space channels in their workspace
CREATE POLICY "Workspace members can view space channels"
ON chat_channels FOR SELECT
USING (
  type = 'space' AND 
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = chat_channels.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- 2. Users can view custom channels they are members of
CREATE POLICY "Users can view custom channels as members"
ON chat_channels FOR SELECT
USING (
  type = 'custom' AND
  EXISTS (
    SELECT 1 FROM chat_channel_members ccm
    WHERE ccm.channel_id = chat_channels.id
    AND ccm.user_id = auth.uid()
  )
);

-- 3. Workspace members can create custom channels
CREATE POLICY "Workspace members can create custom channels"
ON chat_channels FOR INSERT
WITH CHECK (
  type = 'custom' AND
  created_by_user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = chat_channels.workspace_id
    AND wm.user_id = auth.uid()
  )
);
-- Drop all existing policies on chat_channel_members to avoid conflicts
DROP POLICY IF EXISTS "Channel owners can add members" ON chat_channel_members;
DROP POLICY IF EXISTS "Channel owners can remove members" ON chat_channel_members;

-- Recreate INSERT policy for channel owners
CREATE POLICY "Channel owners can add members"
ON chat_channel_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = channel_id
    AND c.created_by_user_id = auth.uid()
  )
);

-- Recreate DELETE policy for channel owners
CREATE POLICY "Channel owners can remove members"
ON chat_channel_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = chat_channel_members.channel_id
    AND c.created_by_user_id = auth.uid()
  )
);
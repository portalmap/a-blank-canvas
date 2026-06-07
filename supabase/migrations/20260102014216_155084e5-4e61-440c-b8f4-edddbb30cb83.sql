-- Create function to automatically create a chat channel when a space is created
CREATE OR REPLACE FUNCTION public.create_space_chat_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  creating_user_id uuid;
BEGIN
  -- Get the user who is creating the space (from auth context or workspace admin)
  creating_user_id := COALESCE(
    auth.uid(),
    (SELECT user_id FROM workspace_members WHERE workspace_id = NEW.workspace_id AND role = 'admin' LIMIT 1)
  );
  
  -- Create the chat channel linked to the space
  INSERT INTO chat_channels (workspace_id, name, type, linked_space_id, created_by_user_id)
  VALUES (NEW.workspace_id, NEW.name || ' Chat', 'space'::chat_channel_type, NEW.id, creating_user_id);
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create chat for new spaces
DROP TRIGGER IF EXISTS on_space_created_create_chat ON spaces;
CREATE TRIGGER on_space_created_create_chat
  AFTER INSERT ON spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.create_space_chat_channel();

-- Update RLS policy for chat_channels to include space-based access
DROP POLICY IF EXISTS "Users can view space channels" ON chat_channels;
CREATE POLICY "Users can view space channels" ON chat_channels
  FOR SELECT
  USING (
    type = 'space'::chat_channel_type 
    AND linked_space_id IS NOT NULL 
    AND user_can_access_space(auth.uid(), linked_space_id)
  );

-- Policy for updating space channels (admins/members of the space)
DROP POLICY IF EXISTS "Space members can update space channels" ON chat_channels;
CREATE POLICY "Space members can update space channels" ON chat_channels
  FOR UPDATE
  USING (
    type = 'space'::chat_channel_type 
    AND linked_space_id IS NOT NULL 
    AND user_can_access_space(auth.uid(), linked_space_id)
  );

-- Update RLS policies for chat_messages to allow space channel access
DROP POLICY IF EXISTS "Users can view space channel messages" ON chat_messages;
CREATE POLICY "Users can view space channel messages" ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_channels c
      WHERE c.id = chat_messages.channel_id
      AND c.type = 'space'::chat_channel_type
      AND c.linked_space_id IS NOT NULL
      AND user_can_access_space(auth.uid(), c.linked_space_id)
    )
  );

DROP POLICY IF EXISTS "Users can send messages in space channels" ON chat_messages;
CREATE POLICY "Users can send messages in space channels" ON chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_channels c
      WHERE c.id = chat_messages.channel_id
      AND c.type = 'space'::chat_channel_type
      AND c.linked_space_id IS NOT NULL
      AND user_can_access_space(auth.uid(), c.linked_space_id)
    )
  );

-- RLS policies for custom channels (using chat_channel_members)
DROP POLICY IF EXISTS "Users can view custom channels they are members of" ON chat_channels;
CREATE POLICY "Users can view custom channels they are members of" ON chat_channels
  FOR SELECT
  USING (
    type = 'custom'::chat_channel_type AND
    EXISTS (
      SELECT 1 FROM chat_channel_members ccm
      WHERE ccm.channel_id = chat_channels.id
      AND ccm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view custom channel messages" ON chat_messages;
CREATE POLICY "Users can view custom channel messages" ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_channels c
      JOIN chat_channel_members ccm ON ccm.channel_id = c.id
      WHERE c.id = chat_messages.channel_id
      AND c.type = 'custom'::chat_channel_type
      AND ccm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages in custom channels" ON chat_messages;
CREATE POLICY "Users can send messages in custom channels" ON chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_channels c
      JOIN chat_channel_members ccm ON ccm.channel_id = c.id
      WHERE c.id = chat_messages.channel_id
      AND c.type = 'custom'::chat_channel_type
      AND ccm.user_id = auth.uid()
    )
  );

-- Policy for channel members management (using 'owner' role instead of 'admin')
DROP POLICY IF EXISTS "Channel owners can manage members" ON chat_channel_members;
CREATE POLICY "Channel owners can manage members" ON chat_channel_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chat_channel_members ccm
      WHERE ccm.channel_id = chat_channel_members.channel_id
      AND ccm.user_id = auth.uid()
      AND ccm.role = 'owner'::chat_channel_role
    )
  );

DROP POLICY IF EXISTS "Users can view channel members" ON chat_channel_members;
CREATE POLICY "Users can view channel members" ON chat_channel_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_channel_members ccm
      WHERE ccm.channel_id = chat_channel_members.channel_id
      AND ccm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM chat_channels c
      WHERE c.id = chat_channel_members.channel_id
      AND c.type = 'space'::chat_channel_type
      AND c.linked_space_id IS NOT NULL
      AND user_can_access_space(auth.uid(), c.linked_space_id)
    )
  );

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
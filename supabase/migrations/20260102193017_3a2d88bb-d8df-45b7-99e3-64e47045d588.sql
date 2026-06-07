-- 1. Remover TODAS as políticas existentes de chat_channel_members
DROP POLICY IF EXISTS "Channel owners can manage members" ON chat_channel_members;
DROP POLICY IF EXISTS "Users can view channel members" ON chat_channel_members;
DROP POLICY IF EXISTS "Channel owners can add members" ON chat_channel_members;
DROP POLICY IF EXISTS "Channel owners can remove members" ON chat_channel_members;
DROP POLICY IF EXISTS "Channel owners can update members" ON chat_channel_members;

-- 2. Política SELECT: Membros podem ver membros do mesmo canal
CREATE POLICY "Users can view channel members"
ON chat_channel_members FOR SELECT
USING (
  is_global_owner(auth.uid())
  OR
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = chat_channel_members.channel_id
    AND c.created_by_user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM chat_channels c
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id = chat_channel_members.channel_id
    AND c.type = 'space'
    AND wm.user_id = auth.uid()
  )
);

-- 3. Política INSERT: Criador do canal ou global_owner pode adicionar
CREATE POLICY "Channel owners can add members"
ON chat_channel_members FOR INSERT
WITH CHECK (
  is_global_owner(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = channel_id
    AND c.created_by_user_id = auth.uid()
  )
);

-- 4. Política UPDATE: Criador do canal ou global_owner pode atualizar
CREATE POLICY "Channel owners can update members"
ON chat_channel_members FOR UPDATE
USING (
  is_global_owner(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = chat_channel_members.channel_id
    AND c.created_by_user_id = auth.uid()
  )
);

-- 5. Política DELETE: Criador do canal ou global_owner pode remover
CREATE POLICY "Channel owners can remove members"
ON chat_channel_members FOR DELETE
USING (
  is_global_owner(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = chat_channel_members.channel_id
    AND c.created_by_user_id = auth.uid()
  )
);

-- 6. Atualizar políticas de chat_channels para incluir global_owner
DROP POLICY IF EXISTS "Users can view channels in their workspaces" ON chat_channels;

CREATE POLICY "Users can view channels in their workspaces"
ON chat_channels FOR SELECT
USING (
  is_global_owner(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = chat_channels.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);
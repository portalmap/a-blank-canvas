
-- =============================================
-- 1. CHAT_CHANNELS - Reestruturar todas as políticas
-- =============================================

-- DROP todas as políticas existentes
DROP POLICY IF EXISTS "Members can create channels" ON chat_channels;
DROP POLICY IF EXISTS "Global owners can view all channels" ON chat_channels;
DROP POLICY IF EXISTS "Users can view space channels they have access to" ON chat_channels;
DROP POLICY IF EXISTS "Users can view custom channels as members" ON chat_channels;
DROP POLICY IF EXISTS "Channel owners can update channels" ON chat_channels;
DROP POLICY IF EXISTS "Space members can update space channels" ON chat_channels;
DROP POLICY IF EXISTS "Channel owners can delete channels" ON chat_channels;

-- INSERT: apenas admin e member podem criar
CREATE POLICY "Members can create channels"
ON chat_channels FOR INSERT
WITH CHECK (
  created_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = chat_channels.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'member')
  )
);

-- SELECT: Admins/owners veem todos
CREATE POLICY "Admins can view all workspace channels"
ON chat_channels FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = chat_channels.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'admin'
  )
  OR is_global_owner(auth.uid())
);

-- SELECT: Space channels - quem tem acesso ao space
CREATE POLICY "Users can view space channels they have access to"
ON chat_channels FOR SELECT
USING (
  type = 'space' AND linked_space_id IS NOT NULL
  AND user_can_access_space(auth.uid(), linked_space_id)
);

-- SELECT: Custom channels - membros do canal ou criador
CREATE POLICY "Users can view custom channels as members"
ON chat_channels FOR SELECT
USING (
  type = 'custom'
  AND (
    user_is_channel_member(auth.uid(), id)
    OR created_by_user_id = auth.uid()
  )
);

-- UPDATE: admins e criadores
CREATE POLICY "Admins and creators can update channels"
ON chat_channels FOR UPDATE
USING (
  created_by_user_id = auth.uid()
  OR user_is_workspace_admin(auth.uid(), workspace_id)
);

-- DELETE: admins e criadores
CREATE POLICY "Admins and creators can delete channels"
ON chat_channels FOR DELETE
USING (
  created_by_user_id = auth.uid()
  OR user_is_workspace_admin(auth.uid(), workspace_id)
);

-- =============================================
-- 2. CHAT_MESSAGES - Adicionar políticas para admins
-- =============================================

-- Admins podem ver todas as mensagens do workspace
CREATE POLICY "Admins can view all messages"
ON chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_channels c
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id = chat_messages.channel_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'admin'
  )
  OR is_global_owner(auth.uid())
);

-- Admins podem enviar mensagens em qualquer canal
CREATE POLICY "Admins can send messages anywhere"
ON chat_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM chat_channels c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = chat_messages.channel_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'admin'
    )
    OR is_global_owner(auth.uid())
  )
);

-- =============================================
-- 3. CHAT_CHANNEL_MEMBERS - Admins podem gerenciar
-- =============================================

DROP POLICY IF EXISTS "Channel owners can add members" ON chat_channel_members;
DROP POLICY IF EXISTS "Channel owners can remove members" ON chat_channel_members;
DROP POLICY IF EXISTS "Channel owners can update members" ON chat_channel_members;
DROP POLICY IF EXISTS "Users can view channel members" ON chat_channel_members;

-- Admins e criadores podem gerenciar membros (INSERT, UPDATE, DELETE)
CREATE POLICY "Channel owners and admins can manage members"
ON chat_channel_members FOR ALL
USING (
  is_global_owner(auth.uid())
  OR EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = chat_channel_members.channel_id
    AND (
      c.created_by_user_id = auth.uid()
      OR user_is_workspace_admin(auth.uid(), c.workspace_id)
    )
  )
);

-- SELECT: visibilidade de membros
CREATE POLICY "Users can view channel members"
ON chat_channel_members FOR SELECT
USING (
  is_global_owner(auth.uid())
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = chat_channel_members.channel_id
    AND (
      c.created_by_user_id = auth.uid()
      OR user_is_workspace_admin(auth.uid(), c.workspace_id)
    )
  )
  OR EXISTS (
    SELECT 1 FROM chat_channels c
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id = chat_channel_members.channel_id
    AND c.type = 'space'
    AND wm.user_id = auth.uid()
  )
);


-- =============================================
-- ITEM 2: Remover políticas permissivas
-- =============================================

-- notifications: dropar INSERT permissivo e recriar restrito
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- webhook_deliveries: dropar INSERT e UPDATE permissivos (service_role bypassa RLS)
DROP POLICY IF EXISTS "System can insert deliveries" ON webhook_deliveries;
DROP POLICY IF EXISTS "System can update deliveries" ON webhook_deliveries;

-- webhook_inbox: dropar INSERT e UPDATE permissivos (service_role bypassa RLS)
DROP POLICY IF EXISTS "System can insert inbox" ON webhook_inbox;
DROP POLICY IF EXISTS "System can update inbox" ON webhook_inbox;

-- =============================================
-- ITEM 3: Restringir space_templates
-- =============================================

-- Dropar política SELECT pública
DROP POLICY IF EXISTS "Public read access" ON space_templates;

-- Recriar SELECT apenas para authenticated + membro do workspace
CREATE POLICY "Authenticated read access"
  ON space_templates FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL
    OR user_is_workspace_member(auth.uid(), workspace_id)
  );

-- Atualizar demais políticas para TO authenticated
DROP POLICY IF EXISTS "Workspace members can create templates" ON space_templates;
CREATE POLICY "Workspace members can create templates"
  ON space_templates FOR INSERT TO authenticated
  WITH CHECK (user_is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Template creators can update" ON space_templates;
CREATE POLICY "Template creators can update"
  ON space_templates FOR UPDATE TO authenticated
  USING (created_by_user_id = auth.uid() OR is_workspace_admin(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Template creators can delete" ON space_templates;
CREATE POLICY "Template creators can delete"
  ON space_templates FOR DELETE TO authenticated
  USING (created_by_user_id = auth.uid() OR is_workspace_admin(auth.uid(), workspace_id));

-- Tornar workspace_id opcional (NULL = template global)
ALTER TABLE space_templates 
ALTER COLUMN workspace_id DROP NOT NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can create space templates" ON space_templates;
DROP POLICY IF EXISTS "Admins can delete space templates" ON space_templates;
DROP POLICY IF EXISTS "Admins can update space templates" ON space_templates;
DROP POLICY IF EXISTS "Users can view space templates in their workspaces" ON space_templates;

-- Novas policies para templates globais
-- Qualquer usuário autenticado pode criar templates globais
CREATE POLICY "Authenticated users can create global templates"
ON space_templates FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND created_by_user_id = auth.uid()
  AND (workspace_id IS NULL OR user_is_workspace_admin(auth.uid(), workspace_id))
);

-- Criadores podem atualizar seus templates
CREATE POLICY "Creators can update their templates"
ON space_templates FOR UPDATE
USING (created_by_user_id = auth.uid());

-- Criadores podem deletar seus templates
CREATE POLICY "Creators can delete their templates"
ON space_templates FOR DELETE
USING (created_by_user_id = auth.uid());

-- Todos usuários autenticados podem ver templates globais
-- Ou templates do workspace onde são membros
CREATE POLICY "Users can view global and workspace templates"
ON space_templates FOR SELECT
USING (
  workspace_id IS NULL 
  OR EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = space_templates.workspace_id 
    AND workspace_members.user_id = auth.uid()
  )
);

-- Atualizar policies das tabelas filhas para permitir templates globais
DROP POLICY IF EXISTS "Admins can manage template folders" ON space_template_folders;
DROP POLICY IF EXISTS "Users can view template folders" ON space_template_folders;

CREATE POLICY "Creators can manage template folders"
ON space_template_folders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM space_templates st
    WHERE st.id = space_template_folders.template_id 
    AND st.created_by_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view template folders"
ON space_template_folders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM space_templates st
    WHERE st.id = space_template_folders.template_id 
    AND (st.workspace_id IS NULL OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = st.workspace_id AND wm.user_id = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "Admins can manage template lists" ON space_template_lists;
DROP POLICY IF EXISTS "Users can view template lists" ON space_template_lists;

CREATE POLICY "Creators can manage template lists"
ON space_template_lists FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM space_templates st
    WHERE st.id = space_template_lists.template_id 
    AND st.created_by_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view template lists"
ON space_template_lists FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM space_templates st
    WHERE st.id = space_template_lists.template_id 
    AND (st.workspace_id IS NULL OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = st.workspace_id AND wm.user_id = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "Admins can manage template tasks" ON space_template_tasks;
DROP POLICY IF EXISTS "Users can view template tasks" ON space_template_tasks;

CREATE POLICY "Creators can manage template tasks"
ON space_template_tasks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM space_templates st
    WHERE st.id = space_template_tasks.template_id 
    AND st.created_by_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view template tasks"
ON space_template_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM space_templates st
    WHERE st.id = space_template_tasks.template_id 
    AND (st.workspace_id IS NULL OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = st.workspace_id AND wm.user_id = auth.uid()
    ))
  )
);
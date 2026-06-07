-- Create table for space template automations
CREATE TABLE public.space_template_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES space_templates(id) ON DELETE CASCADE,
  description TEXT,
  trigger automation_trigger NOT NULL DEFAULT 'on_task_created',
  action_type automation_action NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}',
  -- Scope within template (space, folder, list)
  scope_type TEXT NOT NULL CHECK (scope_type IN ('space', 'folder', 'list')),
  -- Reference to folder or list of the template (if applicable)
  folder_ref_id UUID REFERENCES space_template_folders(id) ON DELETE CASCADE,
  list_ref_id UUID REFERENCES space_template_lists(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE space_template_automations ENABLE ROW LEVEL SECURITY;

-- Policy: Template creators can manage their automations
CREATE POLICY "Creators can manage template automations"
  ON space_template_automations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM space_templates st 
    WHERE st.id = template_id 
    AND st.created_by_user_id = auth.uid()
  ));

-- Policy: Users can view template automations from templates they can access
CREATE POLICY "Users can view template automations"
  ON space_template_automations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM space_templates st 
    WHERE st.id = template_id 
    AND (
      st.workspace_id IS NULL 
      OR EXISTS (
        SELECT 1 FROM workspace_members wm 
        WHERE wm.workspace_id = st.workspace_id 
        AND wm.user_id = auth.uid()
      )
    )
  ));

-- Add trigger for updated_at
CREATE TRIGGER update_space_template_automations_updated_at
  BEFORE UPDATE ON space_template_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Create status_templates table
CREATE TABLE public.status_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create status_template_items table
CREATE TABLE public.status_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES status_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  category TEXT DEFAULT 'active'
);

-- Add columns to statuses table
ALTER TABLE public.statuses 
ADD COLUMN template_id UUID REFERENCES status_templates(id),
ADD COLUMN inherit_from_parent BOOLEAN DEFAULT true;

-- Add status configuration to spaces
ALTER TABLE public.spaces 
ADD COLUMN status_source TEXT DEFAULT 'workspace',
ADD COLUMN status_template_id UUID REFERENCES status_templates(id);

-- Add status configuration to folders
ALTER TABLE public.folders 
ADD COLUMN status_source TEXT DEFAULT 'inherit',
ADD COLUMN status_template_id UUID REFERENCES status_templates(id);

-- Add status configuration to lists
ALTER TABLE public.lists 
ADD COLUMN status_source TEXT DEFAULT 'inherit',
ADD COLUMN status_template_id UUID REFERENCES status_templates(id);

-- Enable RLS on new tables
ALTER TABLE public.status_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_template_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for status_templates
CREATE POLICY "Users can view status templates in their workspaces"
ON public.status_templates FOR SELECT
USING (EXISTS (
  SELECT 1 FROM workspace_members
  WHERE workspace_members.workspace_id = status_templates.workspace_id
  AND workspace_members.user_id = auth.uid()
));

CREATE POLICY "Admins can create status templates"
ON public.status_templates FOR INSERT
WITH CHECK (user_is_workspace_admin(auth.uid(), workspace_id) AND created_by_user_id = auth.uid());

CREATE POLICY "Admins can update status templates"
ON public.status_templates FOR UPDATE
USING (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete status templates"
ON public.status_templates FOR DELETE
USING (user_is_workspace_admin(auth.uid(), workspace_id));

-- RLS policies for status_template_items
CREATE POLICY "Users can view template items"
ON public.status_template_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM status_templates st
  JOIN workspace_members wm ON wm.workspace_id = st.workspace_id
  WHERE st.id = status_template_items.template_id
  AND wm.user_id = auth.uid()
));

CREATE POLICY "Admins can manage template items"
ON public.status_template_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM status_templates st
  WHERE st.id = status_template_items.template_id
  AND user_is_workspace_admin(auth.uid(), st.workspace_id)
));

-- Create trigger for updated_at on status_templates
CREATE TRIGGER update_status_templates_updated_at
BEFORE UPDATE ON public.status_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
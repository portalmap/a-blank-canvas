-- Create space_templates table
CREATE TABLE public.space_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create space_template_folders table
CREATE TABLE public.space_template_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.space_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0
);

-- Create space_template_lists table
CREATE TABLE public.space_template_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.space_templates(id) ON DELETE CASCADE,
  folder_ref_id UUID REFERENCES public.space_template_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_view TEXT DEFAULT 'list',
  order_index INTEGER DEFAULT 0
);

-- Create space_template_tasks table
CREATE TABLE public.space_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.space_templates(id) ON DELETE CASCADE,
  list_ref_id UUID NOT NULL REFERENCES public.space_template_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  order_index INTEGER DEFAULT 0
);

-- Enable RLS on all tables
ALTER TABLE public.space_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_template_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_template_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_template_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for space_templates
CREATE POLICY "Admins can create space templates"
ON public.space_templates
FOR INSERT
WITH CHECK (user_is_workspace_admin(auth.uid(), workspace_id) AND created_by_user_id = auth.uid());

CREATE POLICY "Admins can update space templates"
ON public.space_templates
FOR UPDATE
USING (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete space templates"
ON public.space_templates
FOR DELETE
USING (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Users can view space templates in their workspaces"
ON public.space_templates
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM workspace_members
  WHERE workspace_members.workspace_id = space_templates.workspace_id
  AND workspace_members.user_id = auth.uid()
));

-- RLS policies for space_template_folders
CREATE POLICY "Admins can manage template folders"
ON public.space_template_folders
FOR ALL
USING (EXISTS (
  SELECT 1 FROM space_templates st
  WHERE st.id = space_template_folders.template_id
  AND user_is_workspace_admin(auth.uid(), st.workspace_id)
));

CREATE POLICY "Users can view template folders"
ON public.space_template_folders
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM space_templates st
  JOIN workspace_members wm ON wm.workspace_id = st.workspace_id
  WHERE st.id = space_template_folders.template_id
  AND wm.user_id = auth.uid()
));

-- RLS policies for space_template_lists
CREATE POLICY "Admins can manage template lists"
ON public.space_template_lists
FOR ALL
USING (EXISTS (
  SELECT 1 FROM space_templates st
  WHERE st.id = space_template_lists.template_id
  AND user_is_workspace_admin(auth.uid(), st.workspace_id)
));

CREATE POLICY "Users can view template lists"
ON public.space_template_lists
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM space_templates st
  JOIN workspace_members wm ON wm.workspace_id = st.workspace_id
  WHERE st.id = space_template_lists.template_id
  AND wm.user_id = auth.uid()
));

-- RLS policies for space_template_tasks
CREATE POLICY "Admins can manage template tasks"
ON public.space_template_tasks
FOR ALL
USING (EXISTS (
  SELECT 1 FROM space_templates st
  WHERE st.id = space_template_tasks.template_id
  AND user_is_workspace_admin(auth.uid(), st.workspace_id)
));

CREATE POLICY "Users can view template tasks"
ON public.space_template_tasks
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM space_templates st
  JOIN workspace_members wm ON wm.workspace_id = st.workspace_id
  WHERE st.id = space_template_tasks.template_id
  AND wm.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_space_templates_updated_at
BEFORE UPDATE ON public.space_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
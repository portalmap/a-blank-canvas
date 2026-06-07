-- Tabela de tags de tarefas
CREATE TABLE public.task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Tabela de relação tarefa-tag
CREATE TABLE public.task_tag_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.task_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, tag_id)
);

-- Tabela para salvar preferências de colunas por usuário
CREATE TABLE public.user_column_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  list_id UUID REFERENCES public.lists(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'list',
  visible_columns TEXT[] DEFAULT ARRAY['title', 'status', 'assignee', 'due_date', 'priority'],
  column_order TEXT[] DEFAULT ARRAY['checkbox', 'title', 'status', 'assignee', 'due_date', 'priority', 'actions'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, list_id, scope)
);

-- RLS policies para task_tags
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags in their workspaces"
ON public.task_tags FOR SELECT
USING (EXISTS (
  SELECT 1 FROM workspace_members
  WHERE workspace_members.workspace_id = task_tags.workspace_id
  AND workspace_members.user_id = auth.uid()
));

CREATE POLICY "Members can create tags"
ON public.task_tags FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM workspace_members
  WHERE workspace_members.workspace_id = task_tags.workspace_id
  AND workspace_members.user_id = auth.uid()
  AND workspace_members.role IN ('admin', 'member', 'limited_member')
));

CREATE POLICY "Admins can update tags"
ON public.task_tags FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM workspace_members
  WHERE workspace_members.workspace_id = task_tags.workspace_id
  AND workspace_members.user_id = auth.uid()
  AND workspace_members.role IN ('admin', 'member')
));

CREATE POLICY "Admins can delete tags"
ON public.task_tags FOR DELETE
USING (EXISTS (
  SELECT 1 FROM workspace_members
  WHERE workspace_members.workspace_id = task_tags.workspace_id
  AND workspace_members.user_id = auth.uid()
  AND workspace_members.role IN ('admin', 'member')
));

-- RLS policies para task_tag_relations
ALTER TABLE public.task_tag_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tag relations on accessible tasks"
ON public.task_tag_relations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tasks t
  JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
  WHERE t.id = task_tag_relations.task_id
  AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can add tags to tasks"
ON public.task_tag_relations FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM tasks t
  JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
  WHERE t.id = task_tag_relations.task_id
  AND wm.user_id = auth.uid()
  AND wm.role IN ('admin', 'member', 'limited_member')
));

CREATE POLICY "Members can remove tags from tasks"
ON public.task_tag_relations FOR DELETE
USING (EXISTS (
  SELECT 1 FROM tasks t
  JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
  WHERE t.id = task_tag_relations.task_id
  AND wm.user_id = auth.uid()
  AND wm.role IN ('admin', 'member', 'limited_member')
));

-- RLS policies para user_column_preferences
ALTER TABLE public.user_column_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own column preferences"
ON public.user_column_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own column preferences"
ON public.user_column_preferences FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own column preferences"
ON public.user_column_preferences FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own column preferences"
ON public.user_column_preferences FOR DELETE
USING (user_id = auth.uid());
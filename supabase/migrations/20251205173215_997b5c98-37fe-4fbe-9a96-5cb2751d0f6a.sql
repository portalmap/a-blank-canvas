-- Adicionar campos na tabela tasks para subtarefas e funcionalidades extras
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_milestone boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_time integer;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time_spent integer DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON public.tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_list_parent ON public.tasks(list_id, parent_id);

-- Tabela de comentários das tarefas
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de checklists
CREATE TABLE IF NOT EXISTS public.task_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabela de itens de checklist
CREATE TABLE IF NOT EXISTS public.task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.task_checklists(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_completed boolean DEFAULT false,
  order_index integer DEFAULT 0,
  assignee_id uuid,
  due_date date,
  created_at timestamptz DEFAULT now()
);

-- Tabela de seguidores
CREATE TABLE IF NOT EXISTS public.task_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Tabela de anexos
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  file_type text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas para task_comments
CREATE POLICY "Users can view comments on accessible tasks" ON public.task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = task_comments.task_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on accessible tasks" ON public.task_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = task_comments.task_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments" ON public.task_comments
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON public.task_comments
  FOR DELETE USING (author_id = auth.uid());

-- Políticas para task_checklists
CREATE POLICY "Users can view checklists on accessible tasks" ON public.task_checklists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = task_checklists.task_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage checklists on accessible tasks" ON public.task_checklists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = task_checklists.task_id AND wm.user_id = auth.uid()
    )
  );

-- Políticas para task_checklist_items
CREATE POLICY "Users can view checklist items" ON public.task_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM task_checklists tc
      JOIN tasks t ON t.id = tc.task_id
      JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE tc.id = task_checklist_items.checklist_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage checklist items" ON public.task_checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM task_checklists tc
      JOIN tasks t ON t.id = tc.task_id
      JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE tc.id = task_checklist_items.checklist_id AND wm.user_id = auth.uid()
    )
  );

-- Políticas para task_followers
CREATE POLICY "Users can view followers on accessible tasks" ON public.task_followers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = task_followers.task_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can follow accessible tasks" ON public.task_followers
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = task_followers.task_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can unfollow tasks" ON public.task_followers
  FOR DELETE USING (user_id = auth.uid());

-- Políticas para task_attachments
CREATE POLICY "Users can view attachments on accessible tasks" ON public.task_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = task_attachments.task_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add attachments to accessible tasks" ON public.task_attachments
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = task_attachments.task_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own attachments" ON public.task_attachments
  FOR DELETE USING (uploaded_by = auth.uid());
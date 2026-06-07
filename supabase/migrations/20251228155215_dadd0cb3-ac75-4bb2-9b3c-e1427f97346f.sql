-- Tabela para registrar todas as atividades/ações em tarefas
CREATE TABLE public.task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_task_activities_task_id ON public.task_activities(task_id);
CREATE INDEX idx_task_activities_created_at ON public.task_activities(created_at DESC);
CREATE INDEX idx_task_activities_user_id ON public.task_activities(user_id);

-- Habilitar RLS
ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view activities of accessible tasks"
ON public.task_activities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = task_activities.task_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create activities on accessible tasks"
ON public.task_activities
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
    WHERE t.id = task_activities.task_id
    AND wm.user_id = auth.uid()
  )
);
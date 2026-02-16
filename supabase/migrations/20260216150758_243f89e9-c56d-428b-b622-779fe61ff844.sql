
CREATE TABLE public.automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  status_id UUID,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(automation_id, task_id, status_id)
);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view automation executions"
ON public.automation_executions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM workspace_members wm
  JOIN automations a ON a.workspace_id = wm.workspace_id
  WHERE a.id = automation_executions.automation_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can insert automation executions"
ON public.automation_executions
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM workspace_members wm
  JOIN automations a ON a.workspace_id = wm.workspace_id
  WHERE a.id = automation_executions.automation_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can delete automation executions"
ON public.automation_executions
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM workspace_members wm
  JOIN automations a ON a.workspace_id = wm.workspace_id
  WHERE a.id = automation_executions.automation_id AND wm.user_id = auth.uid()
));

CREATE INDEX idx_automation_executions_task ON public.automation_executions(task_id);
CREATE INDEX idx_automation_executions_automation ON public.automation_executions(automation_id);

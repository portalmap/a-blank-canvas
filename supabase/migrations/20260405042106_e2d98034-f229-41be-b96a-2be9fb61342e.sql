
-- 1. Criar tabela task_assignee_history
CREATE TABLE public.task_assignee_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz,
  start_date date,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_assignee_history_task ON public.task_assignee_history(task_id);
CREATE INDEX idx_task_assignee_history_user ON public.task_assignee_history(user_id);
CREATE INDEX idx_task_assignee_history_task_user ON public.task_assignee_history(task_id, user_id);

-- 2. Enable RLS
ALTER TABLE public.task_assignee_history ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "Members can view task assignee history"
ON public.task_assignee_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN lists l ON l.id = t.list_id
    JOIN spaces s ON s.id = l.space_id
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE t.id = task_assignee_history.task_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert task assignee history"
ON public.task_assignee_history
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN lists l ON l.id = t.list_id
    JOIN spaces s ON s.id = l.space_id
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE t.id = task_assignee_history.task_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "System can update task assignee history"
ON public.task_assignee_history
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN lists l ON l.id = t.list_id
    JOIN spaces s ON s.id = l.space_id
    JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
    WHERE t.id = task_assignee_history.task_id AND wm.user_id = auth.uid()
  )
);

-- 4. Trigger function: on INSERT into task_assignees
CREATE OR REPLACE FUNCTION public.on_task_assignee_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.task_assignee_history (task_id, user_id, assigned_at, start_date, due_date)
  SELECT NEW.task_id, NEW.user_id, now(), t.start_date, t.due_date
  FROM public.tasks t
  WHERE t.id = NEW.task_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_task_assignee_added
AFTER INSERT ON public.task_assignees
FOR EACH ROW
EXECUTE FUNCTION public.on_task_assignee_added();

-- 5. Trigger function: on DELETE from task_assignees
CREATE OR REPLACE FUNCTION public.on_task_assignee_removed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.task_assignee_history
  SET unassigned_at = now(),
      start_date = COALESCE((SELECT t.start_date FROM public.tasks t WHERE t.id = OLD.task_id), start_date),
      due_date = COALESCE((SELECT t.due_date FROM public.tasks t WHERE t.id = OLD.task_id), due_date)
  WHERE task_id = OLD.task_id
    AND user_id = OLD.user_id
    AND unassigned_at IS NULL;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_task_assignee_removed
AFTER DELETE ON public.task_assignees
FOR EACH ROW
EXECUTE FUNCTION public.on_task_assignee_removed();

-- 6. Backfill: create open records for all current assignees
INSERT INTO public.task_assignee_history (task_id, user_id, assigned_at, start_date, due_date)
SELECT ta.task_id, ta.user_id, COALESCE(ta.created_at, t.created_at), t.start_date, t.due_date
FROM public.task_assignees ta
JOIN public.tasks t ON t.id = ta.task_id;

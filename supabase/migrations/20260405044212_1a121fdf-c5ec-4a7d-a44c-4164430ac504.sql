
-- Productivity settings per workspace
CREATE TABLE public.productivity_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  early_threshold_percent numeric NOT NULL DEFAULT 50,
  on_time_threshold_percent numeric NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.productivity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view productivity settings"
  ON public.productivity_settings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = productivity_settings.workspace_id
    AND wm.user_id = auth.uid()
  ));

CREATE POLICY "Admins can insert productivity settings"
  ON public.productivity_settings FOR INSERT TO authenticated
  WITH CHECK (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update productivity settings"
  ON public.productivity_settings FOR UPDATE TO authenticated
  USING (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete productivity settings"
  ON public.productivity_settings FOR DELETE TO authenticated
  USING (user_is_workspace_admin(auth.uid(), workspace_id));

-- Productivity validators per space
CREATE TABLE public.productivity_validators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  space_id uuid REFERENCES public.spaces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, space_id)
);

ALTER TABLE public.productivity_validators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view validators"
  ON public.productivity_validators FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = productivity_validators.workspace_id
    AND wm.user_id = auth.uid()
  ));

CREATE POLICY "Admins can insert validators"
  ON public.productivity_validators FOR INSERT TO authenticated
  WITH CHECK (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update validators"
  ON public.productivity_validators FOR UPDATE TO authenticated
  USING (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete validators"
  ON public.productivity_validators FOR DELETE TO authenticated
  USING (user_is_workspace_admin(auth.uid(), workspace_id));

-- Task productivity validations
CREATE TABLE public.task_productivity_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  validated_by uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('transfer', 'completion')),
  original_classification text NOT NULL CHECK (original_classification IN ('early', 'on_time', 'late')),
  validated_classification text NOT NULL CHECK (validated_classification IN ('early', 'on_time', 'late')),
  notes text,
  validated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_productivity_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view validations"
  ON public.task_productivity_validations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t
    JOIN lists l ON l.id = t.list_id
    JOIN workspace_members wm ON wm.workspace_id = l.workspace_id
    WHERE t.id = task_productivity_validations.task_id
    AND wm.user_id = auth.uid()
  ));

CREATE POLICY "Validators can insert validations"
  ON public.task_productivity_validations FOR INSERT TO authenticated
  WITH CHECK (validated_by = auth.uid() AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN lists l ON l.id = t.list_id
    JOIN productivity_validators pv ON pv.workspace_id = l.workspace_id
    WHERE t.id = task_productivity_validations.task_id
    AND pv.user_id = auth.uid()
    AND (pv.space_id IS NULL OR pv.space_id = l.space_id)
  ));

CREATE POLICY "Validators can update validations"
  ON public.task_productivity_validations FOR UPDATE TO authenticated
  USING (validated_by = auth.uid());

-- Add column to task_assignee_history for due_date snapshot
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'task_assignee_history' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE public.task_assignee_history ADD COLUMN start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'task_assignee_history' AND column_name = 'classification'
  ) THEN
    ALTER TABLE public.task_assignee_history ADD COLUMN classification text;
  END IF;
END $$;

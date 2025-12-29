-- Add new action type to enum
ALTER TYPE automation_action ADD VALUE IF NOT EXISTS 'auto_add_follower';

-- Add source tracking columns to task_assignees (need to create this table first if not exists)
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_type TEXT DEFAULT 'manual',
  source_id UUID,
  UNIQUE(task_id, user_id)
);

-- Enable RLS on task_assignees
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_assignees
CREATE POLICY "Users can view assignees on accessible tasks"
ON public.task_assignees FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tasks t
  JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
  WHERE t.id = task_assignees.task_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Users can add assignees to accessible tasks"
ON public.task_assignees FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM tasks t
  JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
  WHERE t.id = task_assignees.task_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Users can remove assignees from accessible tasks"
ON public.task_assignees FOR DELETE
USING (EXISTS (
  SELECT 1 FROM tasks t
  JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
  WHERE t.id = task_assignees.task_id AND wm.user_id = auth.uid()
));

-- Add source columns to task_followers if not exists
ALTER TABLE public.task_followers 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_id UUID;

-- Update automations table to support more trigger types
ALTER TABLE public.automations 
ADD COLUMN IF NOT EXISTS description TEXT;
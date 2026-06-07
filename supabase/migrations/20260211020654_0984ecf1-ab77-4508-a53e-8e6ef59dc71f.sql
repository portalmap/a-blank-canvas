
-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_assigned boolean NOT NULL DEFAULT true,
  comment_assigned boolean NOT NULL DEFAULT true,
  task_due_tomorrow boolean NOT NULL DEFAULT true,
  task_overdue boolean NOT NULL DEFAULT true,
  feed_new_post boolean NOT NULL DEFAULT true,
  space_permission_change boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage notification settings
CREATE POLICY "Admins can manage notification settings"
  ON public.notification_settings
  FOR ALL
  USING (user_is_workspace_admin(auth.uid(), workspace_id));

-- Workspace members can read notification settings
CREATE POLICY "Members can view notification settings"
  ON public.notification_settings
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = notification_settings.workspace_id
      AND wm.user_id = auth.uid()
  ));

-- Enable realtime on needed tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.space_permissions;

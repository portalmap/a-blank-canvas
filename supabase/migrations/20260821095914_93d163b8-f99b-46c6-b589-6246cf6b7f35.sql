ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS external_post_ref text,
  ADD COLUMN IF NOT EXISTS format text,
  ADD COLUMN IF NOT EXISTS social_channel text;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_workspace_external_post_ref_uidx
  ON public.tasks (workspace_id, external_post_ref)
  WHERE external_post_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_external_post_ref_idx
  ON public.tasks (external_post_ref)
  WHERE external_post_ref IS NOT NULL;
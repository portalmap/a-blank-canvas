CREATE OR REPLACE FUNCTION public.log_task_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.task_activities (task_id, user_id, activity_type, metadata)
  VALUES (
    NEW.id,
    NEW.created_by_user_id,
    'task.created',
    jsonb_strip_nulls(jsonb_build_object(
      'created_by', CASE WHEN NEW.external_post_ref IS NOT NULL THEN 'integration' ELSE 'user' END,
      'created_at_date', NEW.created_at,
      'origem', CASE WHEN NEW.external_post_ref IS NOT NULL THEN 'hub' ELSE NULL END,
      'external_post_ref', NEW.external_post_ref,
      'is_subtask', CASE WHEN NEW.parent_id IS NOT NULL THEN true ELSE NULL END
    ))
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_log_created ON public.tasks;
CREATE TRIGGER trg_tasks_log_created
AFTER INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.log_task_created();

INSERT INTO public.task_activities (task_id, user_id, activity_type, metadata, created_at)
SELECT t.id,
       t.created_by_user_id,
       'task.created',
       jsonb_strip_nulls(jsonb_build_object(
         'created_by', CASE WHEN t.external_post_ref IS NOT NULL THEN 'integration' ELSE 'user' END,
         'created_at_date', t.created_at,
         'origem', CASE WHEN t.external_post_ref IS NOT NULL THEN 'hub' ELSE NULL END,
         'external_post_ref', t.external_post_ref,
         'is_subtask', CASE WHEN t.parent_id IS NOT NULL THEN true ELSE NULL END,
         'backfill', true
       )),
       t.created_at
FROM public.tasks t
WHERE t.created_by_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.task_activities a
    WHERE a.task_id = t.id AND a.activity_type = 'task.created'
  );
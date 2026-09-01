REVOKE EXECUTE ON FUNCTION public.resync_template_statuses(uuid, jsonb, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.count_tasks_for_template_items(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resync_template_statuses(uuid, jsonb, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_tasks_for_template_items(uuid[]) TO authenticated;
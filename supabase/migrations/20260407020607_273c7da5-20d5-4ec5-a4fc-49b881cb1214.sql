
CREATE OR REPLACE FUNCTION public.get_productivity_details_by_scope(
  p_workspace_id UUID,
  p_scope TEXT DEFAULT 'workspace',
  p_space_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_user_ids UUID[] DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_include_transferred BOOLEAN DEFAULT false,
  p_early_threshold NUMERIC DEFAULT 50,
  p_on_time_threshold NUMERIC DEFAULT 100,
  p_limit INT DEFAULT 500
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  WITH completed_tasks AS (
    SELECT
      t.id as task_id,
      t.title as task_title,
      t.completed_at as event_date,
      t.due_date,
      t.start_date,
      calc_delivery_pct(t.start_date, t.due_date, t.completed_at) as delivery_pct,
      false as is_transferred,
      (SELECT p.full_name FROM profiles p
       JOIN task_assignees ta2 ON ta2.user_id = p.id
       WHERE ta2.task_id = t.id LIMIT 1) as user_name
    FROM tasks t
    LEFT JOIN lists l ON l.id = t.list_id
    WHERE t.workspace_id = p_workspace_id
      AND t.completed_at IS NOT NULL
      AND t.archived_at IS NULL
      AND (p_start_date IS NULL OR t.completed_at >= p_start_date)
      AND (p_end_date IS NULL OR t.completed_at <= p_end_date)
      AND (p_scope != 'space' OR l.space_id = p_space_id)
      AND (p_scope NOT IN ('my_tasks', 'user') OR EXISTS (
        SELECT 1 FROM task_assignees ta
        WHERE ta.task_id = t.id
        AND (
          (p_scope = 'my_tasks' AND ta.user_id = p_user_id)
          OR (p_scope = 'user' AND ta.user_id = ANY(COALESCE(p_user_ids, ARRAY[p_user_id])))
        )
      ))
  ),
  transferred_tasks AS (
    SELECT
      t.id as task_id,
      t.title as task_title,
      tah.unassigned_at as event_date,
      tah.due_date,
      COALESCE(tah.start_date, tah.assigned_at::date) as start_date,
      calc_delivery_pct(
        COALESCE(tah.start_date, tah.assigned_at::date),
        tah.due_date,
        tah.unassigned_at
      ) as delivery_pct,
      true as is_transferred,
      (SELECT p.full_name FROM profiles p WHERE p.id = tah.user_id) as user_name
    FROM task_assignee_history tah
    JOIN tasks t ON t.id = tah.task_id
    LEFT JOIN lists l ON l.id = t.list_id
    WHERE t.workspace_id = p_workspace_id
      AND tah.unassigned_at IS NOT NULL
      AND p_include_transferred = true
      AND t.archived_at IS NULL
      AND (p_start_date IS NULL OR tah.unassigned_at >= p_start_date)
      AND (p_end_date IS NULL OR tah.unassigned_at <= p_end_date)
      AND (p_scope != 'space' OR l.space_id = p_space_id)
      AND (p_scope NOT IN ('my_tasks', 'user') OR (
        (p_scope = 'my_tasks' AND tah.user_id = p_user_id)
        OR (p_scope = 'user' AND tah.user_id = ANY(COALESCE(p_user_ids, ARRAY[p_user_id])))
      ))
  ),
  all_records AS (
    SELECT * FROM completed_tasks
    UNION ALL
    SELECT * FROM transferred_tasks
  ),
  classified AS (
    SELECT
      task_id,
      task_title,
      event_date,
      due_date,
      is_transferred,
      user_name,
      delivery_pct,
      CASE
        WHEN delivery_pct IS NULL THEN 'no_due_date'
        WHEN delivery_pct <= p_early_threshold THEN 'early'
        WHEN delivery_pct <= p_on_time_threshold THEN 'on_time'
        ELSE 'late'
      END as classification,
      CASE
        WHEN due_date IS NOT NULL AND event_date IS NOT NULL
        THEN EXTRACT(DAY FROM (event_date - (due_date + interval '1 day')))::int
        ELSE NULL
      END as days_from_due
    FROM all_records
  ),
  summary AS (
    SELECT
      COUNT(*) FILTER (WHERE classification = 'early') as early,
      COUNT(*) FILTER (WHERE classification = 'on_time') as on_time,
      COUNT(*) FILTER (WHERE classification = 'late') as late,
      COUNT(*) FILTER (WHERE classification = 'no_due_date') as no_due_date,
      COUNT(*) as total
    FROM classified
  )
  SELECT json_build_object(
    'tasks', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', c.task_id,
          'title', c.task_title,
          'eventDate', c.event_date,
          'dueDate', c.due_date,
          'classification', c.classification,
          'daysFromDue', c.days_from_due,
          'isTransferred', c.is_transferred,
          'userName', c.user_name,
          'deliveryPct', c.delivery_pct
        ) ORDER BY c.event_date DESC
      )
      FROM (SELECT * FROM classified LIMIT p_limit) c
    ), '[]'::json),
    'summary', (
      SELECT json_build_object(
        'early', s.early,
        'onTime', s.on_time,
        'late', s.late,
        'noDueDate', s.no_due_date,
        'total', s.total
      ) FROM summary s
    )
  ) INTO result;

  RETURN result;
END;
$$;

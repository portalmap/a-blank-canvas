
CREATE OR REPLACE FUNCTION public.get_productivity_stats(
  p_workspace_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_scope text DEFAULT 'workspace',
  p_space_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_user_ids uuid[] DEFAULT NULL,
  p_early_threshold numeric DEFAULT 50,
  p_on_time_threshold numeric DEFAULT 100,
  p_include_transferred boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  WITH completed_tasks AS (
    SELECT 
      calc_delivery_pct(t.start_date, t.due_date, t.completed_at) as delivery_pct,
      calc_productivity_score(calc_delivery_pct(t.start_date, t.due_date, t.completed_at)) as score
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
      calc_delivery_pct(
        COALESCE(tah.snapshot_start_date, t.start_date),
        COALESCE(tah.snapshot_due_date, t.due_date),
        tah.unassigned_at
      ) as delivery_pct,
      calc_productivity_score(
        calc_delivery_pct(
          COALESCE(tah.snapshot_start_date, t.start_date),
          COALESCE(tah.snapshot_due_date, t.due_date),
          tah.unassigned_at
        )
      ) as score
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
    SELECT delivery_pct, score FROM completed_tasks
    UNION ALL
    SELECT delivery_pct, score FROM transferred_tasks
  ),
  classified AS (
    SELECT
      CASE
        WHEN delivery_pct IS NULL THEN 'no_due_date'
        WHEN delivery_pct <= p_early_threshold THEN 'early'
        WHEN delivery_pct <= p_on_time_threshold THEN 'on_time'
        ELSE 'late'
      END as classification,
      score
    FROM all_records
  ),
  agg AS (
    SELECT
      COUNT(*) FILTER (WHERE classification = 'early') as early,
      COUNT(*) FILTER (WHERE classification = 'on_time') as on_time,
      COUNT(*) FILTER (WHERE classification = 'late') as late,
      COUNT(*) FILTER (WHERE classification = 'no_due_date') as no_due_date,
      COUNT(*) as total,
      COALESCE(AVG(score), 100) as avg_score
    FROM classified
  )
  SELECT json_build_object(
    'early', early,
    'onTime', on_time,
    'late', late,
    'noDueDate', no_due_date,
    'totalCompleted', total,
    'earlyRate', CASE WHEN total > 0 THEN ROUND(early::numeric / total * 100) ELSE 0 END,
    'onTimeRate', CASE WHEN total > 0 THEN ROUND((on_time + no_due_date)::numeric / total * 100) ELSE 0 END,
    'lateRate', CASE WHEN total > 0 THEN ROUND(late::numeric / total * 100) ELSE 0 END,
    'productivityScore', ROUND(avg_score)
  ) INTO result
  FROM agg;

  RETURN result;
END;
$$;

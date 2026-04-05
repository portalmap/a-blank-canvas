
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_completed ON public.tasks (workspace_id, completed_at) WHERE completed_at IS NOT NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_user ON public.task_assignees (task_id, user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignee_history_user ON public.task_assignee_history (user_id, unassigned_at) WHERE unassigned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_assignee_history_task ON public.task_assignee_history (task_id, user_id);

-- Helper: calculate delivery percentage
CREATE OR REPLACE FUNCTION public.calc_delivery_pct(
  p_start_date date,
  p_due_date date,
  p_reference timestamptz
) RETURNS double precision
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE 
    WHEN p_start_date IS NULL OR p_due_date IS NULL THEN NULL
    WHEN (p_due_date::timestamptz + interval '23 hours 59 minutes 59 seconds') <= p_start_date::timestamptz THEN 200.0
    ELSE LEAST(200.0, GREATEST(0.0,
      EXTRACT(EPOCH FROM (p_reference - p_start_date::timestamptz)) /
      EXTRACT(EPOCH FROM ((p_due_date::timestamptz + interval '23 hours 59 minutes 59 seconds') - p_start_date::timestamptz)) * 100.0
    ))
  END;
$$;

-- Helper: score from delivery pct
CREATE OR REPLACE FUNCTION public.calc_productivity_score(p_delivery_pct double precision)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_delivery_pct IS NULL THEN 100
    ELSE GREATEST(0, LEAST(200, (200 - p_delivery_pct)::integer))
  END;
$$;

-- 1. get_productivity_stats
CREATE OR REPLACE FUNCTION public.get_productivity_stats(
  p_workspace_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_scope text DEFAULT 'workspace',
  p_space_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_user_ids uuid[] DEFAULT NULL,
  p_early_threshold numeric DEFAULT 50,
  p_on_time_threshold numeric DEFAULT 100
)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  WITH filtered_tasks AS (
    SELECT t.id, t.start_date, t.due_date, t.completed_at
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
  scored AS (
    SELECT
      calc_delivery_pct(ft.start_date, ft.due_date, ft.completed_at) as delivery_pct,
      calc_productivity_score(calc_delivery_pct(ft.start_date, ft.due_date, ft.completed_at)) as score
    FROM filtered_tasks ft
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
    FROM scored
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

-- 2. get_productivity_ranking
CREATE OR REPLACE FUNCTION public.get_productivity_ranking(
  p_workspace_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_include_transferred boolean DEFAULT false,
  p_early_threshold numeric DEFAULT 50,
  p_on_time_threshold numeric DEFAULT 100
)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  WITH members AS (
    SELECT wm.user_id, COALESCE(p.full_name, 'Usuário sem nome') as user_name, p.avatar_url
    FROM workspace_members wm
    LEFT JOIN profiles p ON p.id = wm.user_id
    WHERE wm.workspace_id = p_workspace_id
  ),
  completed_tasks AS (
    SELECT t.id, t.start_date, t.due_date, t.completed_at, ta.user_id
    FROM tasks t
    JOIN task_assignees ta ON ta.task_id = t.id
    JOIN members m ON m.user_id = ta.user_id
    WHERE t.workspace_id = p_workspace_id
      AND t.completed_at IS NOT NULL
      AND t.archived_at IS NULL
      AND (p_start_date IS NULL OR t.completed_at >= p_start_date)
      AND (p_end_date IS NULL OR t.completed_at <= p_end_date)
  ),
  task_scores AS (
    SELECT
      ct.user_id,
      calc_delivery_pct(ct.start_date, ct.due_date, ct.completed_at) as delivery_pct,
      calc_productivity_score(calc_delivery_pct(ct.start_date, ct.due_date, ct.completed_at)) as score
    FROM completed_tasks ct
  ),
  task_classified AS (
    SELECT
      user_id,
      CASE
        WHEN delivery_pct IS NULL THEN 'no_due_date'
        WHEN delivery_pct <= p_early_threshold THEN 'early'
        WHEN delivery_pct <= p_on_time_threshold THEN 'on_time'
        ELSE 'late'
      END as classification,
      score
    FROM task_scores
  ),
  transferred AS (
    SELECT
      tah.user_id,
      calc_delivery_pct(
        COALESCE(tah.start_date, tah.assigned_at::date),
        tah.due_date,
        tah.unassigned_at
      ) as delivery_pct,
      calc_productivity_score(calc_delivery_pct(
        COALESCE(tah.start_date, tah.assigned_at::date),
        tah.due_date,
        tah.unassigned_at
      )) as score
    FROM task_assignee_history tah
    JOIN members m ON m.user_id = tah.user_id
    WHERE p_include_transferred = true
      AND tah.unassigned_at IS NOT NULL
      AND (p_start_date IS NULL OR tah.unassigned_at >= p_start_date)
      AND (p_end_date IS NULL OR tah.unassigned_at <= p_end_date)
  ),
  transferred_classified AS (
    SELECT
      user_id,
      CASE
        WHEN delivery_pct IS NULL THEN 'no_due_date'
        WHEN delivery_pct <= p_early_threshold THEN 'early'
        WHEN delivery_pct <= p_on_time_threshold THEN 'on_time'
        ELSE 'late'
      END as classification,
      score
    FROM transferred
  ),
  user_stats AS (
    SELECT
      m.user_id,
      m.user_name,
      m.avatar_url,
      COALESCE(tc.early, 0) as early,
      COALESCE(tc.on_time, 0) as on_time,
      COALESCE(tc.late, 0) as late,
      COALESCE(tc.no_due_date, 0) as no_due_date,
      COALESCE(tr.t_early, 0) as transferred_early,
      COALESCE(tr.t_on_time, 0) as transferred_on_time,
      COALESCE(tr.t_late, 0) as transferred_late,
      COALESCE(all_scores.avg_score, 0) as productivity_score,
      COALESCE(all_scores.total_count, 0) as total_completed
    FROM members m
    LEFT JOIN (
      SELECT user_id,
        COUNT(*) FILTER (WHERE classification = 'early') as early,
        COUNT(*) FILTER (WHERE classification = 'on_time') as on_time,
        COUNT(*) FILTER (WHERE classification = 'late') as late,
        COUNT(*) FILTER (WHERE classification = 'no_due_date') as no_due_date
      FROM task_classified GROUP BY user_id
    ) tc ON tc.user_id = m.user_id
    LEFT JOIN (
      SELECT user_id,
        COUNT(*) FILTER (WHERE classification = 'early') as t_early,
        COUNT(*) FILTER (WHERE classification = 'on_time') as t_on_time,
        COUNT(*) FILTER (WHERE classification = 'late') as t_late
      FROM transferred_classified GROUP BY user_id
    ) tr ON tr.user_id = m.user_id
    LEFT JOIN (
      SELECT user_id, ROUND(AVG(score)) as avg_score, COUNT(*) as total_count
      FROM (
        SELECT user_id, score FROM task_classified
        UNION ALL
        SELECT user_id, score FROM transferred_classified
      ) combined
      GROUP BY user_id
    ) all_scores ON all_scores.user_id = m.user_id
  ),
  final_ranking AS (
    SELECT *,
      transferred_early + transferred_on_time + transferred_late as transferred_total
    FROM user_stats
    ORDER BY productivity_score DESC, total_completed DESC
  ),
  team_agg AS (
    SELECT
      CASE WHEN COUNT(*) > 0 THEN ROUND(AVG(productivity_score)) ELSE 0 END as team_average,
      SUM(total_completed) as total_tasks
    FROM final_ranking
  )
  SELECT json_build_object(
    'ranking', (SELECT json_agg(json_build_object(
      'userId', fr.user_id,
      'userName', fr.user_name,
      'avatarUrl', fr.avatar_url,
      'early', fr.early,
      'onTime', fr.on_time,
      'late', fr.late,
      'noDueDate', fr.no_due_date,
      'totalCompleted', fr.total_completed,
      'productivityScore', fr.productivity_score,
      'transferredEarly', fr.transferred_early,
      'transferredOnTime', fr.transferred_on_time,
      'transferredLate', fr.transferred_late,
      'transferredTotal', fr.transferred_total
    )) FROM final_ranking fr),
    'teamAverage', ta.team_average,
    'totalTasks', ta.total_tasks
  ) INTO result
  FROM team_agg ta;

  RETURN result;
END;
$$;

-- 3. get_user_productivity_details
CREATE OR REPLACE FUNCTION public.get_user_productivity_details(
  p_workspace_id uuid,
  p_user_id uuid,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_include_transferred boolean DEFAULT false,
  p_early_threshold numeric DEFAULT 50,
  p_on_time_threshold numeric DEFAULT 100,
  p_limit integer DEFAULT 200
)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  WITH current_tasks AS (
    SELECT
      t.id,
      t.title,
      t.completed_at::text as completed_at,
      t.due_date::text as due_date,
      t.start_date::text as start_date,
      calc_delivery_pct(t.start_date, t.due_date, t.completed_at) as delivery_pct,
      calc_productivity_score(calc_delivery_pct(t.start_date, t.due_date, t.completed_at)) as score,
      false as is_transferred
    FROM tasks t
    JOIN task_assignees ta ON ta.task_id = t.id AND ta.user_id = p_user_id
    WHERE t.workspace_id = p_workspace_id
      AND t.completed_at IS NOT NULL
      AND t.archived_at IS NULL
      AND (p_start_date IS NULL OR t.completed_at >= p_start_date)
      AND (p_end_date IS NULL OR t.completed_at <= p_end_date)
    ORDER BY t.completed_at DESC
    LIMIT p_limit
  ),
  transferred_tasks AS (
    SELECT
      t.id,
      COALESCE(t.title, 'Tarefa removida') as title,
      tah.unassigned_at::text as completed_at,
      tah.due_date::text as due_date,
      COALESCE(tah.start_date, tah.assigned_at::date)::text as start_date,
      calc_delivery_pct(
        COALESCE(tah.start_date, tah.assigned_at::date),
        tah.due_date,
        tah.unassigned_at
      ) as delivery_pct,
      calc_productivity_score(calc_delivery_pct(
        COALESCE(tah.start_date, tah.assigned_at::date),
        tah.due_date,
        tah.unassigned_at
      )) as score,
      true as is_transferred
    FROM task_assignee_history tah
    LEFT JOIN tasks t ON t.id = tah.task_id
    WHERE tah.user_id = p_user_id
      AND tah.unassigned_at IS NOT NULL
      AND p_include_transferred = true
      AND (p_start_date IS NULL OR tah.unassigned_at >= p_start_date)
      AND (p_end_date IS NULL OR tah.unassigned_at <= p_end_date)
      AND NOT EXISTS (
        SELECT 1 FROM task_assignees ta2
        WHERE ta2.task_id = tah.task_id AND ta2.user_id = p_user_id
      )
    ORDER BY tah.unassigned_at DESC
    LIMIT p_limit
  ),
  all_tasks AS (
    SELECT * FROM current_tasks
    UNION ALL
    SELECT * FROM transferred_tasks
  ),
  classified AS (
    SELECT *,
      CASE
        WHEN delivery_pct IS NULL THEN 'no_due_date'
        WHEN delivery_pct <= p_early_threshold THEN 'early'
        WHEN delivery_pct <= p_on_time_threshold THEN 'on_time'
        ELSE 'late'
      END as classification,
      CASE
        WHEN delivery_pct IS NULL THEN NULL
        WHEN delivery_pct <= 100 THEN ROUND((100 - delivery_pct) / 100.0 * EXTRACT(EPOCH FROM (
          (due_date::date::timestamptz + interval '23 hours 59 minutes 59 seconds') - start_date::date::timestamptz
        )) / 86400.0)
        ELSE ROUND((delivery_pct - 100) / 100.0 * EXTRACT(EPOCH FROM (
          (due_date::date::timestamptz + interval '23 hours 59 minutes 59 seconds') - start_date::date::timestamptz
        )) / 86400.0)
      END as days_from_due
    FROM all_tasks
  ),
  summary AS (
    SELECT
      COUNT(*) FILTER (WHERE classification = 'early') as early,
      COUNT(*) FILTER (WHERE classification = 'on_time') as on_time,
      COUNT(*) FILTER (WHERE classification = 'late') as late,
      COUNT(*) FILTER (WHERE classification = 'no_due_date') as no_due_date,
      COUNT(*) as total,
      COALESCE(ROUND(AVG(score)), 0) as avg_score
    FROM classified
  )
  SELECT json_build_object(
    'tasks', (SELECT COALESCE(json_agg(json_build_object(
      'id', c.id,
      'title', c.title,
      'completedAt', c.completed_at,
      'dueDate', c.due_date,
      'classification', c.classification,
      'daysFromDue', c.days_from_due,
      'isTransferred', c.is_transferred,
      'productivityScore', c.score
    ) ORDER BY c.completed_at DESC), '[]'::json) FROM classified c),
    'summary', json_build_object(
      'early', s.early,
      'onTime', s.on_time,
      'late', s.late,
      'noDueDate', s.no_due_date,
      'total', s.total,
      'score', s.avg_score
    )
  ) INTO result
  FROM summary s;

  RETURN result;
END;
$$;

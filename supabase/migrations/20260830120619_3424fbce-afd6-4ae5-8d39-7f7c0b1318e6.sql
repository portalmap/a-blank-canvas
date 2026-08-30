CREATE OR REPLACE FUNCTION public.get_productivity_details_by_scope(
  p_workspace_id uuid,
  p_scope text DEFAULT 'workspace'::text,
  p_space_id uuid DEFAULT NULL::uuid,
  p_user_id uuid DEFAULT NULL::uuid,
  p_user_ids uuid[] DEFAULT NULL::uuid[],
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_include_transferred boolean DEFAULT false,
  p_early_threshold numeric DEFAULT 50,
  p_on_time_threshold numeric DEFAULT 100,
  p_limit integer DEFAULT 500,
  p_folder_id uuid DEFAULT NULL::uuid,
  p_list_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      AND (p_scope != 'folder' OR l.folder_id = p_folder_id)
      AND (p_scope != 'list' OR t.list_id = p_list_id)
      AND (p_scope NOT IN ('my_tasks', 'user') OR EXISTS (
        SELECT 1 FROM task_assignees ta
        WHERE ta.task_id = t.id
        AND (
          (p_scope = 'my_tasks' AND ta.user_id = p_user_id)
          OR (p_scope = 'user' AND ta.user_id = ANY(COALESCE(p_user_ids, ARRAY[p_user_id])))
        )
      ))
  ),
  latest_transfers AS (
    SELECT DISTINCT ON (tah.task_id, tah.user_id)
      tah.task_id,
      tah.user_id,
      tah.unassigned_at,
      tah.assigned_at,
      tah.start_date,
      tah.due_date
    FROM task_assignee_history tah
    WHERE tah.unassigned_at IS NOT NULL
    ORDER BY tah.task_id, tah.user_id, tah.unassigned_at DESC
  ),
  transferred_tasks AS (
    SELECT
      t.id as task_id,
      t.title as task_title,
      lt.unassigned_at as event_date,
      lt.due_date,
      COALESCE(lt.start_date, lt.assigned_at::date) as start_date,
      calc_delivery_pct(
        COALESCE(lt.start_date, lt.assigned_at::date),
        lt.due_date,
        lt.unassigned_at
      ) as delivery_pct,
      true as is_transferred,
      (SELECT p.full_name FROM profiles p WHERE p.id = lt.user_id) as user_name
    FROM latest_transfers lt
    JOIN tasks t ON t.id = lt.task_id
    LEFT JOIN lists l ON l.id = t.list_id
    WHERE t.workspace_id = p_workspace_id
      AND p_include_transferred = true
      AND t.archived_at IS NULL
      AND (p_start_date IS NULL OR lt.unassigned_at >= p_start_date)
      AND (p_end_date IS NULL OR lt.unassigned_at <= p_end_date)
      AND (p_scope != 'space' OR l.space_id = p_space_id)
      AND (p_scope != 'folder' OR l.folder_id = p_folder_id)
      AND (p_scope != 'list' OR t.list_id = p_list_id)
      AND (p_scope NOT IN ('my_tasks', 'user') OR (
        (p_scope = 'my_tasks' AND lt.user_id = p_user_id)
        OR (p_scope = 'user' AND lt.user_id = ANY(COALESCE(p_user_ids, ARRAY[p_user_id])))
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
      FROM classified c
      LIMIT p_limit
    ), '[]'::json),
    'summary', json_build_object(
      'early', s.early,
      'onTime', s.on_time,
      'late', s.late,
      'noDueDate', s.no_due_date,
      'total', s.total
    )
  ) INTO result
  FROM summary s;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_productivity_ranking(
  p_workspace_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_include_transferred boolean DEFAULT false,
  p_early_threshold numeric DEFAULT 50,
  p_on_time_threshold numeric DEFAULT 100
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  latest_transfers AS (
    SELECT DISTINCT ON (tah.task_id, tah.user_id)
      tah.task_id,
      tah.user_id,
      tah.unassigned_at,
      tah.assigned_at,
      tah.start_date,
      tah.due_date
    FROM task_assignee_history tah
    WHERE tah.unassigned_at IS NOT NULL
    ORDER BY tah.task_id, tah.user_id, tah.unassigned_at DESC
  ),
  transferred AS (
    SELECT
      lt.user_id,
      calc_delivery_pct(
        COALESCE(lt.start_date, lt.assigned_at::date),
        lt.due_date,
        lt.unassigned_at
      ) as delivery_pct,
      calc_productivity_score(calc_delivery_pct(
        COALESCE(lt.start_date, lt.assigned_at::date),
        lt.due_date,
        lt.unassigned_at
      )) as score
    FROM latest_transfers lt
    JOIN members m ON m.user_id = lt.user_id
    WHERE p_include_transferred = true
      AND (p_start_date IS NULL OR lt.unassigned_at >= p_start_date)
      AND (p_end_date IS NULL OR lt.unassigned_at <= p_end_date)
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
$function$;

CREATE OR REPLACE FUNCTION public.get_productivity_stats(
  p_workspace_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_scope text DEFAULT 'workspace'::text,
  p_space_id uuid DEFAULT NULL::uuid,
  p_user_id uuid DEFAULT NULL::uuid,
  p_user_ids uuid[] DEFAULT NULL::uuid[],
  p_early_threshold numeric DEFAULT 50,
  p_on_time_threshold numeric DEFAULT 100,
  p_include_transferred boolean DEFAULT false,
  p_folder_id uuid DEFAULT NULL::uuid,
  p_list_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      AND (p_scope != 'folder' OR l.folder_id = p_folder_id)
      AND (p_scope != 'list' OR t.list_id = p_list_id)
      AND (p_scope NOT IN ('my_tasks', 'user') OR EXISTS (
        SELECT 1 FROM task_assignees ta
        WHERE ta.task_id = t.id
        AND (
          (p_scope = 'my_tasks' AND ta.user_id = p_user_id)
          OR (p_scope = 'user' AND ta.user_id = ANY(COALESCE(p_user_ids, ARRAY[p_user_id])))
        )
      ))
  ),
  latest_transfers AS (
    SELECT DISTINCT ON (tah.task_id, tah.user_id)
      tah.task_id,
      tah.user_id,
      tah.unassigned_at,
      tah.assigned_at,
      tah.start_date,
      tah.due_date
    FROM task_assignee_history tah
    WHERE tah.unassigned_at IS NOT NULL
    ORDER BY tah.task_id, tah.user_id, tah.unassigned_at DESC
  ),
  transferred_tasks AS (
    SELECT
      calc_delivery_pct(
        COALESCE(lt.start_date, lt.assigned_at::date),
        lt.due_date,
        lt.unassigned_at
      ) as delivery_pct,
      calc_productivity_score(
        calc_delivery_pct(
          COALESCE(lt.start_date, lt.assigned_at::date),
          lt.due_date,
          lt.unassigned_at
        )
      ) as score
    FROM latest_transfers lt
    JOIN tasks t ON t.id = lt.task_id
    LEFT JOIN lists l ON l.id = t.list_id
    WHERE t.workspace_id = p_workspace_id
      AND p_include_transferred = true
      AND t.archived_at IS NULL
      AND (p_start_date IS NULL OR lt.unassigned_at >= p_start_date)
      AND (p_end_date IS NULL OR lt.unassigned_at <= p_end_date)
      AND (p_scope != 'space' OR l.space_id = p_space_id)
      AND (p_scope != 'folder' OR l.folder_id = p_folder_id)
      AND (p_scope != 'list' OR t.list_id = p_list_id)
      AND (p_scope NOT IN ('my_tasks', 'user') OR (
        (p_scope = 'my_tasks' AND lt.user_id = p_user_id)
        OR (p_scope = 'user' AND lt.user_id = ANY(COALESCE(p_user_ids, ARRAY[p_user_id])))
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
$function$;

CREATE OR REPLACE FUNCTION public.get_user_productivity_details(
  p_workspace_id uuid,
  p_user_id uuid,
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_include_transferred boolean DEFAULT false,
  p_early_threshold numeric DEFAULT 50,
  p_on_time_threshold numeric DEFAULT 100,
  p_limit integer DEFAULT 200
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  latest_transfers AS (
    SELECT DISTINCT ON (tah.task_id, tah.user_id)
      tah.task_id,
      tah.user_id,
      tah.unassigned_at,
      tah.assigned_at,
      tah.start_date,
      tah.due_date
    FROM task_assignee_history tah
    WHERE tah.unassigned_at IS NOT NULL
      AND tah.user_id = p_user_id
    ORDER BY tah.task_id, tah.user_id, tah.unassigned_at DESC
  ),
  transferred_tasks AS (
    SELECT
      t.id,
      COALESCE(t.title, 'Tarefa removida') as title,
      lt.unassigned_at::text as completed_at,
      lt.due_date::text as due_date,
      COALESCE(lt.start_date, lt.assigned_at::date)::text as start_date,
      calc_delivery_pct(
        COALESCE(lt.start_date, lt.assigned_at::date),
        lt.due_date,
        lt.unassigned_at
      ) as delivery_pct,
      calc_productivity_score(calc_delivery_pct(
        COALESCE(lt.start_date, lt.assigned_at::date),
        lt.due_date,
        lt.unassigned_at
      )) as score,
      true as is_transferred
    FROM latest_transfers lt
    LEFT JOIN tasks t ON t.id = lt.task_id
    WHERE p_include_transferred = true
      AND (p_start_date IS NULL OR lt.unassigned_at >= p_start_date)
      AND (p_end_date IS NULL OR lt.unassigned_at <= p_end_date)
      AND NOT EXISTS (
        SELECT 1 FROM task_assignees ta2
        WHERE ta2.task_id = lt.task_id AND ta2.user_id = p_user_id
      )
    ORDER BY lt.unassigned_at DESC
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
        ELSE ROUND((100 - delivery_pct) / 100.0 * EXTRACT(EPOCH FROM (
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
      COALESCE(ROUND(AVG(score)), 100) as score
    FROM classified
  )
  SELECT json_build_object(
    'tasks', COALESCE((
      SELECT json_agg(json_build_object(
        'id', c.id,
        'title', c.title,
        'completedAt', c.completed_at,
        'dueDate', c.due_date,
        'classification', c.classification,
        'daysFromDue', c.days_from_due,
        'isTransferred', c.is_transferred,
        'productivityScore', c.score
      ) ORDER BY c.completed_at DESC)
      FROM classified c
      LIMIT p_limit
    ), '[]'::json),
    'summary', json_build_object(
      'early', s.early,
      'onTime', s.on_time,
      'late', s.late,
      'noDueDate', s.no_due_date,
      'total', s.total,
      'score', s.score
    )
  ) INTO result
  FROM summary s;

  RETURN result;
END;
$function$;
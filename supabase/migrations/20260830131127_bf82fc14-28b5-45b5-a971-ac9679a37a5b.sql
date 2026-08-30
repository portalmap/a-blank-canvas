ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS head_projetos_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS head_account_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_spaces_head_projetos ON public.spaces(head_projetos_user_id);
CREATE INDEX IF NOT EXISTS idx_spaces_head_account ON public.spaces(head_account_user_id);

-- Head de Projetos: média da produtividade individual da equipe dos spaces sob sua responsabilidade
CREATE OR REPLACE FUNCTION public.get_head_projetos_productivity_report(
  p_workspace_id uuid,
  p_head_user_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
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
  WITH head_spaces AS (
    SELECT s.id AS space_id, s.name AS space_name, s.color AS space_color, s.head_projetos_user_id
    FROM spaces s
    WHERE s.workspace_id = p_workspace_id
      AND s.archived_at IS NULL
      AND s.head_projetos_user_id IS NOT NULL
      AND (p_head_user_id IS NULL OR s.head_projetos_user_id = p_head_user_id)
  ),
  scope_tasks AS (
    SELECT hs.space_id, hs.space_name, hs.space_color, t.id AS task_id,
           t.start_date, t.due_date, t.completed_at
    FROM head_spaces hs
    JOIN lists l ON l.space_id = hs.space_id
    JOIN tasks t ON t.list_id = l.id
    WHERE t.archived_at IS NULL
  ),
  completed_entries AS (
    SELECT ta.user_id, st.space_id, st.space_name, st.space_color,
           calc_productivity_score(calc_delivery_pct(st.start_date, st.due_date, st.completed_at)) AS score,
           calc_delivery_pct(st.start_date, st.due_date, st.completed_at) AS delivery_pct
    FROM scope_tasks st
    JOIN task_assignees ta ON ta.task_id = st.task_id
    WHERE st.completed_at IS NOT NULL
      AND (p_start_date IS NULL OR st.completed_at >= p_start_date)
      AND (p_end_date IS NULL OR st.completed_at <= p_end_date)
  ),
  latest_transfers AS (
    SELECT DISTINCT ON (tah.task_id, tah.user_id)
      tah.task_id, tah.user_id, tah.unassigned_at, tah.assigned_at, tah.start_date, tah.due_date
    FROM task_assignee_history tah
    JOIN scope_tasks st ON st.task_id = tah.task_id
    WHERE tah.unassigned_at IS NOT NULL
    ORDER BY tah.task_id, tah.user_id, tah.unassigned_at DESC
  ),
  transferred_entries AS (
    SELECT lt.user_id, st.space_id, st.space_name, st.space_color,
           calc_productivity_score(calc_delivery_pct(COALESCE(lt.start_date, lt.assigned_at::date), lt.due_date, lt.unassigned_at)) AS score,
           calc_delivery_pct(COALESCE(lt.start_date, lt.assigned_at::date), lt.due_date, lt.unassigned_at) AS delivery_pct
    FROM latest_transfers lt
    JOIN scope_tasks st ON st.task_id = lt.task_id
    WHERE (p_start_date IS NULL OR lt.unassigned_at >= p_start_date)
      AND (p_end_date IS NULL OR lt.unassigned_at <= p_end_date)
  ),
  all_entries AS (
    SELECT * FROM completed_entries
    UNION ALL
    SELECT * FROM transferred_entries
  ),
  classified AS (
    SELECT ae.*,
      CASE
        WHEN ae.delivery_pct IS NULL THEN 'no_due_date'
        WHEN ae.delivery_pct <= p_early_threshold THEN 'early'
        WHEN ae.delivery_pct <= p_on_time_threshold THEN 'on_time'
        ELSE 'late'
      END AS classification
    FROM all_entries ae
  ),
  per_user AS (
    SELECT c.user_id,
      COALESCE(p.full_name, 'Sem nome') AS user_name,
      p.avatar_url,
      COUNT(*)::int AS total_tasks,
      COUNT(*) FILTER (WHERE c.classification = 'early')::int AS early,
      COUNT(*) FILTER (WHERE c.classification = 'on_time')::int AS on_time,
      COUNT(*) FILTER (WHERE c.classification = 'late')::int AS late,
      COUNT(*) FILTER (WHERE c.classification = 'no_due_date')::int AS no_due_date,
      COALESCE(ROUND(AVG(c.score)), 0)::int AS productivity_score
    FROM classified c
    LEFT JOIN profiles p ON p.id = c.user_id
    GROUP BY c.user_id, p.full_name, p.avatar_url
  ),
  per_space AS (
    SELECT c.space_id, c.space_name, c.space_color,
      COUNT(*)::int AS total,
      COALESCE(ROUND(AVG(c.score)), 0)::int AS avg_score,
      COUNT(DISTINCT c.user_id)::int AS user_count
    FROM classified c
    GROUP BY c.space_id, c.space_name, c.space_color
  )
  SELECT json_build_object(
    'avgScore', COALESCE((SELECT ROUND(AVG(pu.productivity_score)) FROM per_user pu), 0),
    'teamSize', COALESCE((SELECT COUNT(*) FROM per_user), 0),
    'spaceCount', COALESCE((SELECT COUNT(*) FROM head_spaces), 0),
    'users', COALESCE((
      SELECT json_agg(json_build_object(
        'userId', pu.user_id,
        'userName', pu.user_name,
        'avatarUrl', pu.avatar_url,
        'totalTasks', pu.total_tasks,
        'early', pu.early,
        'onTime', pu.on_time,
        'late', pu.late,
        'noDueDate', pu.no_due_date,
        'productivityScore', pu.productivity_score
      ) ORDER BY pu.productivity_score DESC)
      FROM per_user pu
    ), '[]'::json),
    'spaces', COALESCE((
      SELECT json_agg(json_build_object(
        'spaceId', ps.space_id,
        'spaceName', ps.space_name,
        'spaceColor', ps.space_color,
        'total', ps.total,
        'userCount', ps.user_count,
        'avgScore', ps.avg_score
      ) ORDER BY ps.avg_score DESC)
      FROM per_space ps
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$function$;

-- Head de Account: média das notas de Account dos spaces sob sua responsabilidade (inclusive sem Account definido)
CREATE OR REPLACE FUNCTION public.get_head_account_productivity_report(
  p_workspace_id uuid,
  p_head_user_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
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
  WITH head_spaces AS (
    SELECT s.id AS space_id, s.name AS space_name, s.color AS space_color,
           s.account_user_id, s.head_account_user_id
    FROM spaces s
    WHERE s.workspace_id = p_workspace_id
      AND s.archived_at IS NULL
      AND s.head_account_user_id IS NOT NULL
      AND (p_head_user_id IS NULL OR s.head_account_user_id = p_head_user_id)
  ),
  space_tasks AS (
    SELECT hs.space_id, hs.space_name, hs.space_color, hs.account_user_id, hs.head_account_user_id,
           t.id AS task_id, t.title AS task_title, t.completed_at, t.due_date, t.start_date,
           calc_delivery_pct(t.start_date, t.due_date, t.completed_at) AS delivery_pct,
           calc_productivity_score(calc_delivery_pct(t.start_date, t.due_date, t.completed_at)) AS score
    FROM head_spaces hs
    JOIN lists l ON l.space_id = hs.space_id
    JOIN tasks t ON t.list_id = l.id
    WHERE t.completed_at IS NOT NULL
      AND t.archived_at IS NULL
      AND (p_start_date IS NULL OR t.completed_at >= p_start_date)
      AND (p_end_date IS NULL OR t.completed_at <= p_end_date)
  ),
  classified AS (
    SELECT st.*,
      CASE
        WHEN st.delivery_pct IS NULL THEN 'no_due_date'
        WHEN st.delivery_pct <= p_early_threshold THEN 'early'
        WHEN st.delivery_pct <= p_on_time_threshold THEN 'on_time'
        ELSE 'late'
      END AS classification
    FROM space_tasks st
  ),
  per_space AS (
    SELECT c.space_id, c.space_name, c.space_color, c.account_user_id, c.head_account_user_id,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE c.classification = 'early')::int AS early,
      COUNT(*) FILTER (WHERE c.classification = 'on_time')::int AS on_time,
      COUNT(*) FILTER (WHERE c.classification = 'late')::int AS late,
      COUNT(*) FILTER (WHERE c.classification = 'no_due_date')::int AS no_due_date,
      COALESCE(ROUND(AVG(c.score)), 0)::int AS avg_score
    FROM classified c
    GROUP BY c.space_id, c.space_name, c.space_color, c.account_user_id, c.head_account_user_id
  ),
  per_head AS (
    SELECT ps.head_account_user_id,
      COALESCE(p.full_name, 'Sem nome') AS head_name,
      p.avatar_url,
      SUM(ps.total)::int AS total_tasks,
      SUM(ps.early)::int AS total_early,
      SUM(ps.on_time)::int AS total_on_time,
      SUM(ps.late)::int AS total_late,
      SUM(ps.no_due_date)::int AS total_no_due_date,
      COALESCE(ROUND(AVG(ps.avg_score)), 0)::int AS productivity_score,
      COUNT(DISTINCT ps.space_id)::int AS space_count
    FROM per_space ps
    LEFT JOIN profiles p ON p.id = ps.head_account_user_id
    GROUP BY ps.head_account_user_id, p.full_name, p.avatar_url
  )
  SELECT json_build_object(
    'avgScore', COALESCE((SELECT ROUND(AVG(ps.avg_score)) FROM per_space ps), 0),
    'heads', COALESCE((
      SELECT json_agg(json_build_object(
        'userId', ph.head_account_user_id,
        'userName', ph.head_name,
        'avatarUrl', ph.avatar_url,
        'totalTasks', ph.total_tasks,
        'early', ph.total_early,
        'onTime', ph.total_on_time,
        'late', ph.total_late,
        'noDueDate', ph.total_no_due_date,
        'productivityScore', ph.productivity_score,
        'spaceCount', ph.space_count
      ) ORDER BY ph.productivity_score DESC)
      FROM per_head ph
    ), '[]'::json),
    'spaces', COALESCE((
      SELECT json_agg(json_build_object(
        'spaceId', ps2.space_id,
        'spaceName', ps2.space_name,
        'spaceColor', ps2.space_color,
        'accountUserId', ps2.account_user_id,
        'hasAccount', ps2.account_user_id IS NOT NULL,
        'total', ps2.total,
        'early', ps2.early,
        'onTime', ps2.on_time,
        'late', ps2.late,
        'noDueDate', ps2.no_due_date,
        'avgScore', ps2.avg_score
      ) ORDER BY ps2.avg_score DESC)
      FROM per_space ps2
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_head_projetos_productivity_report(uuid, uuid, timestamptz, timestamptz, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_head_account_productivity_report(uuid, uuid, timestamptz, timestamptz, numeric, numeric) TO authenticated;
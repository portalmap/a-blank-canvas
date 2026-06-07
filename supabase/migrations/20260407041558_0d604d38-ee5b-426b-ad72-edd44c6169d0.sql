
-- Add account_user_id to spaces
ALTER TABLE public.spaces
ADD COLUMN account_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- RPC: get_account_productivity_report
CREATE OR REPLACE FUNCTION public.get_account_productivity_report(
  p_workspace_id uuid,
  p_account_user_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_early_threshold numeric DEFAULT 50,
  p_on_time_threshold numeric DEFAULT 100
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  WITH account_spaces AS (
    SELECT s.id as space_id, s.name as space_name, s.color as space_color,
           s.account_user_id
    FROM spaces s
    WHERE s.workspace_id = p_workspace_id
      AND s.archived_at IS NULL
      AND s.account_user_id IS NOT NULL
      AND (p_account_user_id IS NULL OR s.account_user_id = p_account_user_id)
  ),
  space_tasks AS (
    SELECT
      asp.space_id,
      asp.space_name,
      asp.space_color,
      asp.account_user_id,
      t.id as task_id,
      t.title as task_title,
      t.completed_at,
      t.due_date,
      t.start_date,
      calc_delivery_pct(t.start_date, t.due_date, t.completed_at) as delivery_pct,
      calc_productivity_score(calc_delivery_pct(t.start_date, t.due_date, t.completed_at)) as score
    FROM account_spaces asp
    JOIN lists l ON l.space_id = asp.space_id
    JOIN tasks t ON t.list_id = l.id
    WHERE t.completed_at IS NOT NULL
      AND t.archived_at IS NULL
      AND (p_start_date IS NULL OR t.completed_at >= p_start_date)
      AND (p_end_date IS NULL OR t.completed_at <= p_end_date)
  ),
  classified AS (
    SELECT *,
      CASE
        WHEN delivery_pct IS NULL THEN 'no_due_date'
        WHEN delivery_pct <= p_early_threshold THEN 'early'
        WHEN delivery_pct <= p_on_time_threshold THEN 'on_time'
        ELSE 'late'
      END as classification
    FROM space_tasks
  ),
  per_space AS (
    SELECT
      space_id, space_name, space_color, account_user_id,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE classification = 'early') as early,
      COUNT(*) FILTER (WHERE classification = 'on_time') as on_time,
      COUNT(*) FILTER (WHERE classification = 'late') as late,
      COUNT(*) FILTER (WHERE classification = 'no_due_date') as no_due_date,
      COALESCE(ROUND(AVG(score)), 0) as avg_score
    FROM classified
    GROUP BY space_id, space_name, space_color, account_user_id
  ),
  per_account AS (
    SELECT
      ps.account_user_id,
      COALESCE(p.full_name, 'Sem nome') as account_name,
      p.avatar_url as account_avatar,
      SUM(ps.total)::int as total_tasks,
      SUM(ps.early)::int as total_early,
      SUM(ps.on_time)::int as total_on_time,
      SUM(ps.late)::int as total_late,
      SUM(ps.no_due_date)::int as total_no_due_date,
      COALESCE(ROUND(AVG(ps.avg_score)), 0) as productivity_score,
      COUNT(DISTINCT ps.space_id)::int as space_count
    FROM per_space ps
    LEFT JOIN profiles p ON p.id = ps.account_user_id
    GROUP BY ps.account_user_id, p.full_name, p.avatar_url
  )
  SELECT json_build_object(
    'accounts', COALESCE((
      SELECT json_agg(json_build_object(
        'userId', pa.account_user_id,
        'userName', pa.account_name,
        'avatarUrl', pa.account_avatar,
        'totalTasks', pa.total_tasks,
        'early', pa.total_early,
        'onTime', pa.total_on_time,
        'late', pa.total_late,
        'noDueDate', pa.total_no_due_date,
        'productivityScore', pa.productivity_score,
        'spaceCount', pa.space_count
      ) ORDER BY pa.productivity_score DESC)
      FROM per_account pa
    ), '[]'::json),
    'spaces', COALESCE((
      SELECT json_agg(json_build_object(
        'spaceId', ps2.space_id,
        'spaceName', ps2.space_name,
        'spaceColor', ps2.space_color,
        'accountUserId', ps2.account_user_id,
        'total', ps2.total,
        'early', ps2.early,
        'onTime', ps2.on_time,
        'late', ps2.late,
        'noDueDate', ps2.no_due_date,
        'avgScore', ps2.avg_score
      ) ORDER BY ps2.avg_score DESC)
      FROM per_space ps2
    ), '[]'::json),
    'tasks', COALESCE((
      SELECT json_agg(json_build_object(
        'id', c2.task_id,
        'title', c2.task_title,
        'spaceId', c2.space_id,
        'spaceName', c2.space_name,
        'completedAt', c2.completed_at,
        'dueDate', c2.due_date,
        'classification', c2.classification,
        'productivityScore', c2.score
      ) ORDER BY c2.completed_at DESC)
      FROM classified c2
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

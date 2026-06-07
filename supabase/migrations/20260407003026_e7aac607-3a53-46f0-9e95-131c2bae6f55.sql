
-- =============================================
-- 1. Drop the duplicate 9-param version
-- =============================================
DROP FUNCTION IF EXISTS public.get_productivity_stats(uuid, timestamptz, timestamptz, text, uuid, uuid, uuid[], numeric, numeric);

-- =============================================
-- 2. Replace the 10-param version fixing column names
-- =============================================
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
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
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
        COALESCE(tah.start_date, tah.assigned_at::date),
        tah.due_date,
        tah.unassigned_at
      ) as delivery_pct,
      calc_productivity_score(
        calc_delivery_pct(
          COALESCE(tah.start_date, tah.assigned_at::date),
          tah.due_date,
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

-- =============================================
-- 3. Update on_task_assignee_removed to classify
-- =============================================
CREATE OR REPLACE FUNCTION public.on_task_assignee_removed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_start date;
  v_due date;
  v_pct double precision;
  v_early numeric;
  v_ontime numeric;
  v_class text;
BEGIN
  SELECT t.start_date, t.due_date INTO v_start, v_due
  FROM tasks t WHERE t.id = OLD.task_id;

  v_pct := calc_delivery_pct(v_start, v_due, now());

  SELECT COALESCE(ps.early_threshold_percent, 50), COALESCE(ps.on_time_threshold_percent, 100)
  INTO v_early, v_ontime
  FROM tasks t
  LEFT JOIN productivity_settings ps ON ps.workspace_id = t.workspace_id
  WHERE t.id = OLD.task_id;

  v_class := CASE
    WHEN v_pct IS NULL THEN 'no_due_date'
    WHEN v_pct <= v_early THEN 'early'
    WHEN v_pct <= v_ontime THEN 'on_time'
    ELSE 'late'
  END;

  UPDATE task_assignee_history
  SET unassigned_at = now(),
      start_date = COALESCE(v_start, start_date),
      due_date = COALESCE(v_due, due_date),
      classification = v_class
  WHERE task_id = OLD.task_id
    AND user_id = OLD.user_id
    AND unassigned_at IS NULL;

  RETURN OLD;
END;
$$;

-- =============================================
-- 4. Create trigger for task completion
-- =============================================
CREATE OR REPLACE FUNCTION public.on_task_completed_classify()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_pct double precision;
  v_early numeric;
  v_ontime numeric;
  v_class text;
  rec RECORD;
BEGIN
  IF OLD.completed_at IS NOT NULL OR NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ps.early_threshold_percent, 50), COALESCE(ps.on_time_threshold_percent, 100)
  INTO v_early, v_ontime
  FROM productivity_settings ps
  WHERE ps.workspace_id = NEW.workspace_id;

  FOR rec IN
    SELECT id, start_date AS h_start, due_date AS h_due
    FROM task_assignee_history
    WHERE task_id = NEW.id AND unassigned_at IS NULL
  LOOP
    v_pct := calc_delivery_pct(
      COALESCE(rec.h_start, NEW.start_date),
      COALESCE(rec.h_due, NEW.due_date),
      NEW.completed_at
    );

    v_class := CASE
      WHEN v_pct IS NULL THEN 'no_due_date'
      WHEN v_pct <= v_early THEN 'early'
      WHEN v_pct <= v_ontime THEN 'on_time'
      ELSE 'late'
    END;

    UPDATE task_assignee_history
    SET classification = v_class
    WHERE id = rec.id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_completed_classify ON tasks;
CREATE TRIGGER trg_task_completed_classify
  AFTER UPDATE OF completed_at ON tasks
  FOR EACH ROW
  WHEN (OLD.completed_at IS DISTINCT FROM NEW.completed_at)
  EXECUTE FUNCTION on_task_completed_classify();

-- =============================================
-- 5. Backfill existing records
-- =============================================

-- 5a. Completed tasks (current assignees)
UPDATE task_assignee_history
SET classification = sub.cls
FROM (
  SELECT 
    tah.id as history_id,
    CASE
      WHEN calc_delivery_pct(
        COALESCE(tah.start_date, t.start_date),
        COALESCE(tah.due_date, t.due_date),
        t.completed_at
      ) IS NULL THEN 'no_due_date'
      WHEN calc_delivery_pct(
        COALESCE(tah.start_date, t.start_date),
        COALESCE(tah.due_date, t.due_date),
        t.completed_at
      ) <= COALESCE(ps.early_threshold_percent, 50) THEN 'early'
      WHEN calc_delivery_pct(
        COALESCE(tah.start_date, t.start_date),
        COALESCE(tah.due_date, t.due_date),
        t.completed_at
      ) <= COALESCE(ps.on_time_threshold_percent, 100) THEN 'on_time'
      ELSE 'late'
    END as cls
  FROM task_assignee_history tah
  JOIN tasks t ON t.id = tah.task_id
  LEFT JOIN productivity_settings ps ON ps.workspace_id = t.workspace_id
  WHERE t.completed_at IS NOT NULL
    AND tah.unassigned_at IS NULL
    AND tah.classification IS NULL
) sub
WHERE task_assignee_history.id = sub.history_id;

-- 5b. Transferred records
UPDATE task_assignee_history
SET classification = sub.cls
FROM (
  SELECT 
    tah.id as history_id,
    CASE
      WHEN calc_delivery_pct(
        COALESCE(tah.start_date, tah.assigned_at::date),
        tah.due_date,
        tah.unassigned_at
      ) IS NULL THEN 'no_due_date'
      WHEN calc_delivery_pct(
        COALESCE(tah.start_date, tah.assigned_at::date),
        tah.due_date,
        tah.unassigned_at
      ) <= COALESCE(ps.early_threshold_percent, 50) THEN 'early'
      WHEN calc_delivery_pct(
        COALESCE(tah.start_date, tah.assigned_at::date),
        tah.due_date,
        tah.unassigned_at
      ) <= COALESCE(ps.on_time_threshold_percent, 100) THEN 'on_time'
      ELSE 'late'
    END as cls
  FROM task_assignee_history tah
  JOIN tasks t ON t.id = tah.task_id
  LEFT JOIN productivity_settings ps ON ps.workspace_id = t.workspace_id
  WHERE tah.unassigned_at IS NOT NULL
    AND tah.classification IS NULL
) sub
WHERE task_assignee_history.id = sub.history_id;


-- 1. Create space_followers table
CREATE TABLE public.space_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(space_id, user_id)
);

-- 2. Create folder_followers table
CREATE TABLE public.folder_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(folder_id, user_id)
);

-- 3. Create list_followers table
CREATE TABLE public.list_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(list_id, user_id)
);

-- 4. Enable RLS
ALTER TABLE public.space_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_followers ENABLE ROW LEVEL SECURITY;

-- 5. RLS for space_followers
CREATE POLICY "Members can view space followers"
ON public.space_followers FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM spaces s
  JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
  WHERE s.id = space_followers.space_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can add space followers"
ON public.space_followers FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM spaces s
  JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
  WHERE s.id = space_followers.space_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can remove space followers"
ON public.space_followers FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM spaces s
  JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
  WHERE s.id = space_followers.space_id AND wm.user_id = auth.uid()
));

-- 6. RLS for folder_followers
CREATE POLICY "Members can view folder followers"
ON public.folder_followers FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM folders f
  JOIN spaces s ON s.id = f.space_id
  JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
  WHERE f.id = folder_followers.folder_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can add folder followers"
ON public.folder_followers FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM folders f
  JOIN spaces s ON s.id = f.space_id
  JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
  WHERE f.id = folder_followers.folder_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can remove folder followers"
ON public.folder_followers FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM folders f
  JOIN spaces s ON s.id = f.space_id
  JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
  WHERE f.id = folder_followers.folder_id AND wm.user_id = auth.uid()
));

-- 7. RLS for list_followers
CREATE POLICY "Members can view list followers"
ON public.list_followers FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM lists l
  JOIN spaces s ON s.id = l.space_id
  JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
  WHERE l.id = list_followers.list_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can add list followers"
ON public.list_followers FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM lists l
  JOIN spaces s ON s.id = l.space_id
  JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
  WHERE l.id = list_followers.list_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can remove list followers"
ON public.list_followers FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM lists l
  JOIN spaces s ON s.id = l.space_id
  JOIN workspace_members wm ON wm.workspace_id = s.workspace_id
  WHERE l.id = list_followers.list_id AND wm.user_id = auth.uid()
));

-- 8. Fix task_followers INSERT policy to allow adding others
DROP POLICY IF EXISTS "Users can follow accessible tasks" ON public.task_followers;
CREATE POLICY "Members can add task followers"
ON public.task_followers FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM tasks t
  JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
  WHERE t.id = task_followers.task_id AND wm.user_id = auth.uid()
));

-- Fix task_followers DELETE policy to allow removing others
DROP POLICY IF EXISTS "Users can unfollow tasks" ON public.task_followers;
CREATE POLICY "Members can remove task followers"
ON public.task_followers FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM tasks t
  JOIN workspace_members wm ON wm.workspace_id = t.workspace_id
  WHERE t.id = task_followers.task_id AND wm.user_id = auth.uid()
));

-- 9. Propagation triggers (SECURITY DEFINER functions)

-- Space follower added → propagate to all tasks in space
CREATE OR REPLACE FUNCTION public.propagate_space_follower_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Add to folder_followers for all folders in this space
  INSERT INTO folder_followers (folder_id, user_id)
  SELECT f.id, NEW.user_id
  FROM folders f WHERE f.space_id = NEW.space_id
  ON CONFLICT DO NOTHING;

  -- Add to list_followers for all lists in this space
  INSERT INTO list_followers (list_id, user_id)
  SELECT l.id, NEW.user_id
  FROM lists l WHERE l.space_id = NEW.space_id
  ON CONFLICT DO NOTHING;

  -- Add to task_followers for all tasks in lists of this space
  INSERT INTO task_followers (task_id, user_id, source_type, source_id)
  SELECT t.id, NEW.user_id, 'space_follower', NEW.space_id::text
  FROM tasks t
  JOIN lists l ON l.id = t.list_id
  WHERE l.space_id = NEW.space_id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_propagate_space_follower_insert
AFTER INSERT ON public.space_followers
FOR EACH ROW EXECUTE FUNCTION public.propagate_space_follower_insert();

-- Space follower removed → remove propagated followers
CREATE OR REPLACE FUNCTION public.propagate_space_follower_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Remove from folder_followers
  DELETE FROM folder_followers
  WHERE user_id = OLD.user_id
  AND folder_id IN (SELECT id FROM folders WHERE space_id = OLD.space_id);

  -- Remove from list_followers
  DELETE FROM list_followers
  WHERE user_id = OLD.user_id
  AND list_id IN (SELECT id FROM lists WHERE space_id = OLD.space_id);

  -- Remove propagated task_followers
  DELETE FROM task_followers
  WHERE user_id = OLD.user_id
  AND source_type = 'space_follower'
  AND source_id = OLD.space_id::text;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_propagate_space_follower_delete
AFTER DELETE ON public.space_followers
FOR EACH ROW EXECUTE FUNCTION public.propagate_space_follower_delete();

-- Folder follower added → propagate to lists and tasks
CREATE OR REPLACE FUNCTION public.propagate_folder_follower_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Add to list_followers for all lists in this folder
  INSERT INTO list_followers (list_id, user_id)
  SELECT l.id, NEW.user_id
  FROM lists l WHERE l.folder_id = NEW.folder_id
  ON CONFLICT DO NOTHING;

  -- Add to task_followers for all tasks in lists of this folder
  INSERT INTO task_followers (task_id, user_id, source_type, source_id)
  SELECT t.id, NEW.user_id, 'folder_follower', NEW.folder_id::text
  FROM tasks t
  JOIN lists l ON l.id = t.list_id
  WHERE l.folder_id = NEW.folder_id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_propagate_folder_follower_insert
AFTER INSERT ON public.folder_followers
FOR EACH ROW EXECUTE FUNCTION public.propagate_folder_follower_insert();

-- Folder follower removed
CREATE OR REPLACE FUNCTION public.propagate_folder_follower_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only remove list_followers that aren't also from space level
  DELETE FROM list_followers
  WHERE user_id = OLD.user_id
  AND list_id IN (SELECT id FROM lists WHERE folder_id = OLD.folder_id)
  AND NOT EXISTS (
    SELECT 1 FROM space_followers sf
    JOIN folders f ON f.space_id = sf.space_id
    WHERE f.id = OLD.folder_id AND sf.user_id = OLD.user_id
  );

  -- Remove propagated task_followers
  DELETE FROM task_followers
  WHERE user_id = OLD.user_id
  AND source_type = 'folder_follower'
  AND source_id = OLD.folder_id::text;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_propagate_folder_follower_delete
AFTER DELETE ON public.folder_followers
FOR EACH ROW EXECUTE FUNCTION public.propagate_folder_follower_delete();

-- List follower added → propagate to tasks
CREATE OR REPLACE FUNCTION public.propagate_list_follower_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO task_followers (task_id, user_id, source_type, source_id)
  SELECT t.id, NEW.user_id, 'list_follower', NEW.list_id::text
  FROM tasks t
  WHERE t.list_id = NEW.list_id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_propagate_list_follower_insert
AFTER INSERT ON public.list_followers
FOR EACH ROW EXECUTE FUNCTION public.propagate_list_follower_insert();

-- List follower removed
CREATE OR REPLACE FUNCTION public.propagate_list_follower_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only remove task_followers that aren't from higher levels
  DELETE FROM task_followers
  WHERE user_id = OLD.user_id
  AND source_type = 'list_follower'
  AND source_id = OLD.list_id::text;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_propagate_list_follower_delete
AFTER DELETE ON public.list_followers
FOR EACH ROW EXECUTE FUNCTION public.propagate_list_follower_delete();

-- 10. When a new task is created, add followers from space/folder/list
CREATE OR REPLACE FUNCTION public.propagate_followers_to_new_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_space_id uuid;
  v_folder_id uuid;
BEGIN
  -- Get space_id and folder_id from the list
  SELECT l.space_id, l.folder_id INTO v_space_id, v_folder_id
  FROM lists l WHERE l.id = NEW.list_id;

  -- Add space followers
  IF v_space_id IS NOT NULL THEN
    INSERT INTO task_followers (task_id, user_id, source_type, source_id)
    SELECT NEW.id, sf.user_id, 'space_follower', sf.space_id::text
    FROM space_followers sf WHERE sf.space_id = v_space_id
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add folder followers
  IF v_folder_id IS NOT NULL THEN
    INSERT INTO task_followers (task_id, user_id, source_type, source_id)
    SELECT NEW.id, ff.user_id, 'folder_follower', ff.folder_id::text
    FROM folder_followers ff WHERE ff.folder_id = v_folder_id
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add list followers
  INSERT INTO task_followers (task_id, user_id, source_type, source_id)
  SELECT NEW.id, lf.user_id, 'list_follower', lf.list_id::text
  FROM list_followers lf WHERE lf.list_id = NEW.list_id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_propagate_followers_to_new_task
AFTER INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.propagate_followers_to_new_task();

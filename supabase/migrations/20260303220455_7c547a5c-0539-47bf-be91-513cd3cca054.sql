
-- Fix ::text casts in follower propagation triggers (source_id is uuid, not text)

-- 1. propagate_space_follower_insert
CREATE OR REPLACE FUNCTION propagate_space_follower_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO task_followers (task_id, user_id, source_type, source_id)
  SELECT t.id, NEW.user_id, 'space', NEW.space_id
  FROM tasks t
  JOIN lists l ON l.id = t.list_id
  WHERE l.space_id = NEW.space_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. propagate_folder_follower_insert
CREATE OR REPLACE FUNCTION propagate_folder_follower_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO task_followers (task_id, user_id, source_type, source_id)
  SELECT t.id, NEW.user_id, 'folder', NEW.folder_id
  FROM tasks t
  JOIN lists l ON l.id = t.list_id
  WHERE l.folder_id = NEW.folder_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. propagate_list_follower_insert
CREATE OR REPLACE FUNCTION propagate_list_follower_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO task_followers (task_id, user_id, source_type, source_id)
  SELECT t.id, NEW.user_id, 'list', NEW.list_id
  FROM tasks t
  WHERE t.list_id = NEW.list_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4. propagate_space_follower_delete
CREATE OR REPLACE FUNCTION propagate_space_follower_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM task_followers
  WHERE user_id = OLD.user_id
    AND source_type = 'space'
    AND source_id = OLD.space_id;
  RETURN OLD;
END;
$$;

-- 5. propagate_folder_follower_delete
CREATE OR REPLACE FUNCTION propagate_folder_follower_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM task_followers
  WHERE user_id = OLD.user_id
    AND source_type = 'folder'
    AND source_id = OLD.folder_id;
  RETURN OLD;
END;
$$;

-- 6. propagate_list_follower_delete
CREATE OR REPLACE FUNCTION propagate_list_follower_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM task_followers
  WHERE user_id = OLD.user_id
    AND source_type = 'list'
    AND source_id = OLD.list_id;
  RETURN OLD;
END;
$$;

-- 7. propagate_followers_to_new_task
CREATE OR REPLACE FUNCTION propagate_followers_to_new_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Space followers
  INSERT INTO task_followers (task_id, user_id, source_type, source_id)
  SELECT NEW.id, sf.user_id, 'space', sf.space_id
  FROM space_followers sf
  JOIN lists l ON l.id = NEW.list_id
  WHERE sf.space_id = l.space_id
  ON CONFLICT DO NOTHING;

  -- Folder followers
  INSERT INTO task_followers (task_id, user_id, source_type, source_id)
  SELECT NEW.id, ff.user_id, 'folder', ff.folder_id
  FROM folder_followers ff
  JOIN lists l ON l.id = NEW.list_id
  WHERE ff.folder_id = l.folder_id AND l.folder_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- List followers
  INSERT INTO task_followers (task_id, user_id, source_type, source_id)
  SELECT NEW.id, lf.user_id, 'list', lf.list_id
  FROM list_followers lf
  WHERE lf.list_id = NEW.list_id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

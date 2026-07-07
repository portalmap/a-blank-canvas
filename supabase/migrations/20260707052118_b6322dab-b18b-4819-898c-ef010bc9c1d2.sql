
-- Split BEFORE INSERT trigger so the workspace_members insert happens AFTER the workspace row exists,
-- avoiding the FK violation on workspace_members_workspace_id_fkey.

CREATE OR REPLACE FUNCTION public.set_workspace_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by_user_id := COALESCE(NEW.created_by_user_id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_workspace_creator_as_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.created_by_user_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.created_by_user_id, 'admin')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
DROP TRIGGER IF EXISTS set_workspace_creator_before_insert ON public.workspaces;

CREATE TRIGGER set_workspace_creator_before_insert
BEFORE INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.set_workspace_creator();

CREATE TRIGGER on_workspace_created
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.add_workspace_creator_as_member();

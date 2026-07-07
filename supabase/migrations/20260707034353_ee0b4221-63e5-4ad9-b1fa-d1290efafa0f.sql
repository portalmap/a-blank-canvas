ALTER TABLE public.workspaces
  DROP CONSTRAINT workspaces_created_by_user_id_fkey,
  ADD CONSTRAINT workspaces_created_by_user_id_fkey
    FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.add_workspace_creator_as_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by_user_id := COALESCE(NEW.created_by_user_id, auth.uid());
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, auth.uid(), 'admin')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
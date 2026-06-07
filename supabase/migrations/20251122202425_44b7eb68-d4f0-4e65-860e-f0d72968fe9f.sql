-- Create trigger to automatically add workspace owner as member
-- This ensures the creator is immediately added to workspace_members with 'owner' role

CREATE OR REPLACE FUNCTION public.auto_add_workspace_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.owner_user_id, 'owner');
    RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;

-- Create trigger that fires after workspace insert
CREATE TRIGGER on_workspace_created
    AFTER INSERT ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_add_workspace_owner();
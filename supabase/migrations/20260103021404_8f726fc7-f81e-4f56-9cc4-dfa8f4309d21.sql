-- Remove the trigger that uses invalid 'owner' value for workspace_role enum
DROP TRIGGER IF EXISTS validate_role_change_trigger ON public.workspace_members;

-- Remove the associated function
DROP FUNCTION IF EXISTS public.validate_role_change();
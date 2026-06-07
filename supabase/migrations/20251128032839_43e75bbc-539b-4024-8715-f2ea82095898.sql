-- Fix get_workspace_members_with_emails function to properly cast email to text
CREATE OR REPLACE FUNCTION public.get_workspace_members_with_emails(workspace_uuid uuid)
RETURNS TABLE(id uuid, user_id uuid, workspace_id uuid, role workspace_role, created_at timestamp with time zone, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wm.id,
    wm.user_id,
    wm.workspace_id,
    wm.role,
    wm.created_at,
    au.email::text
  FROM workspace_members wm
  LEFT JOIN auth.users au ON au.id = wm.user_id
  WHERE wm.workspace_id = workspace_uuid
  ORDER BY wm.created_at DESC;
END;
$$;
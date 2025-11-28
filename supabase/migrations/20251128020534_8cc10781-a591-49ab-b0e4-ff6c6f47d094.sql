-- Criar função para buscar membros do workspace com e-mails
CREATE OR REPLACE FUNCTION get_workspace_members_with_emails(workspace_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  workspace_id UUID,
  role workspace_role,
  created_at TIMESTAMPTZ,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wm.id,
    wm.user_id,
    wm.workspace_id,
    wm.role,
    wm.created_at,
    au.email
  FROM workspace_members wm
  LEFT JOIN auth.users au ON au.id = wm.user_id
  WHERE wm.workspace_id = workspace_uuid
  ORDER BY wm.created_at DESC;
END;
$$;
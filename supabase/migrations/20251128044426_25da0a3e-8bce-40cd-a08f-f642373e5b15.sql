-- Corrigir ambiguidade na função get_all_users_with_emails
CREATE OR REPLACE FUNCTION public.get_all_users_with_emails()
RETURNS TABLE(user_id uuid, email text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- System admins (global_owner ou owner) ou workspace admins podem executar
  IF NOT (
    is_system_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: Only administrators can access this function';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    au.email::text,
    p.full_name
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  WHERE au.email IS NOT NULL
  ORDER BY au.email;
END;
$function$;
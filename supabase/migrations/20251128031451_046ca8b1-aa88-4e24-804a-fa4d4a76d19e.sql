-- Create function to get all users with emails (for workspace admins)
CREATE OR REPLACE FUNCTION public.get_all_users_with_emails()
RETURNS TABLE(user_id uuid, email text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only workspace admins can execute
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only workspace administrators can access this function';
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
$$;
-- Fix get_all_users_for_system_admin function to properly cast email type
CREATE OR REPLACE FUNCTION public.get_all_users_for_system_admin()
 RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only system admins (global_owner or owner) can execute
  IF NOT is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Only system administrators can access this function';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::text,
    u.created_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$function$;
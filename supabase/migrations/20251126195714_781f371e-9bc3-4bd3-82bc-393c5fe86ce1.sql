-- Create function to check if user is an owner (technical team)
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT has_role(_user_id, 'owner')
$$;

-- Create function to check if user is global owner OR owner (both have full system access)
CREATE OR REPLACE FUNCTION public.is_system_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_global_owner(_user_id) OR is_owner(_user_id)
$$;

-- Update the get_all_users function to work for both global_owner and owner roles
CREATE OR REPLACE FUNCTION public.get_all_users_for_system_admin()
RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only system admins (global_owner or owner) can execute
  IF NOT is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Only system administrators can access this function';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    u.created_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Create function to check if a user can edit another user (owners can't edit global_owners)
CREATE OR REPLACE FUNCTION public.can_edit_user(_editor_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Global owners can edit anyone
  IF is_global_owner(_editor_id) THEN
    RETURN true;
  END IF;
  
  -- Owners can edit anyone except global owners
  IF is_owner(_editor_id) THEN
    RETURN NOT is_global_owner(_target_user_id);
  END IF;
  
  -- Others follow normal workspace rules
  RETURN false;
END;
$$;
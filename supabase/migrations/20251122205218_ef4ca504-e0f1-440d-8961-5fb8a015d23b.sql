-- Create function to get user ID by email
-- This is used when inviting members to a workspace by email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM auth.users
  WHERE auth.users.email = get_user_id_by_email.email
  LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.update_user_profile_as_admin(
  target_user_id uuid,
  new_full_name text DEFAULT NULL,
  new_phone text DEFAULT NULL,
  new_bio text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT (
    is_system_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE profiles SET
    full_name = COALESCE(new_full_name, full_name),
    phone = COALESCE(new_phone, phone),
    bio = COALESCE(new_bio, bio),
    updated_at = now()
  WHERE id = target_user_id;

  RETURN true;
END;
$$;
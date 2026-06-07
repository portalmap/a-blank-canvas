-- Create public 'avatars' bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read for avatars
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload their own avatar (path must start with their user_id)
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Workspace admins / system admins can manage any avatar
CREATE POLICY "Admins can upload any avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    public.is_system_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

CREATE POLICY "Admins can update any avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND (
    public.is_system_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

CREATE POLICY "Admins can delete any avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND (
    public.is_system_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- Allow admins to update avatar_url on any profile
-- (the existing update_user_profile_as_admin RPC doesn't include avatar)
CREATE OR REPLACE FUNCTION public.update_user_avatar_as_admin(
  target_user_id uuid,
  new_avatar_url text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  UPDATE profiles
  SET avatar_url = new_avatar_url, updated_at = now()
  WHERE id = target_user_id;

  RETURN true;
END;
$$;
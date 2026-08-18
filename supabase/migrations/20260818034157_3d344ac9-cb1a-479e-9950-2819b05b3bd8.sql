ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hub_user_id text,
  ADD COLUMN IF NOT EXISTS avatar_path text,
  ADD COLUMN IF NOT EXISTS avatar_origem text DEFAULT 'hub';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_hub_user_id_key
  ON public.profiles (hub_user_id) WHERE hub_user_id IS NOT NULL;

-- Storage policies for the private "avatars" bucket: owner of the folder or admins
DROP POLICY IF EXISTS "avatars_owner_or_admin_read" ON storage.objects;
CREATE POLICY "avatars_owner_or_admin_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_system_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS "avatars_owner_or_admin_insert" ON storage.objects;
CREATE POLICY "avatars_owner_or_admin_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_system_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS "avatars_owner_or_admin_update" ON storage.objects;
CREATE POLICY "avatars_owner_or_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_system_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS "avatars_owner_or_admin_delete" ON storage.objects;
CREATE POLICY "avatars_owner_or_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_system_admin(auth.uid())
  )
);
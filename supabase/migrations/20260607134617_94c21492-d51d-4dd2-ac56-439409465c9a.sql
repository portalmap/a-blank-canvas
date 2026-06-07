
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS role_slug text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_slug_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_slug_check
      CHECK (role_slug IS NULL OR role_slug IN (
        'administrador_global','administrador','gestor','membro','convidado'
      ));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_unique
  ON public.profiles ((lower(email)))
  WHERE email IS NOT NULL;

-- Backfill emails from auth.users so the upsert-by-email path matches existing rows.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email <> u.email);

CREATE OR REPLACE FUNCTION public.is_hub_global_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role_slug = 'administrador_global'
  )
$$;

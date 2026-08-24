ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS client_name text;

CREATE OR REPLACE FUNCTION public.normalize_client_key(_valor text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT btrim(regexp_replace(
    lower(translate(
      coalesce(_valor, ''),
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
    )),
    '[^a-z0-9]+', ' ', 'g'
  ))
$$;

UPDATE public.spaces
SET client_name = btrim(regexp_replace(name, '^\s*MAP\s*\|\s*', ''))
WHERE client_name IS NULL
  AND btrim(regexp_replace(name, '^\s*MAP\s*\|\s*', '')) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS spaces_workspace_client_name_key
  ON public.spaces (workspace_id, public.normalize_client_key(client_name))
  WHERE client_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS spaces_client_name_idx
  ON public.spaces (public.normalize_client_key(client_name))
  WHERE client_name IS NOT NULL;
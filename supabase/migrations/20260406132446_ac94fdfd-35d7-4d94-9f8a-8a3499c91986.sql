
-- Add archived_at column to spaces
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

-- Function to archive a space
CREATE OR REPLACE FUNCTION public.archive_space(p_space_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE spaces
  SET archived_at = now()
  WHERE id = p_space_id
    AND archived_at IS NULL;
END;
$$;

-- Function to restore a space
CREATE OR REPLACE FUNCTION public.restore_space(p_space_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE spaces
  SET archived_at = NULL
  WHERE id = p_space_id
    AND archived_at IS NOT NULL;
END;
$$;

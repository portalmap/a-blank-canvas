-- 1. Add new columns to feed_posts
ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS content_format text NOT NULL DEFAULT 'markdown',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.feed_posts
  DROP CONSTRAINT IF EXISTS feed_posts_content_format_check;
ALTER TABLE public.feed_posts
  ADD CONSTRAINT feed_posts_content_format_check CHECK (content_format IN ('plain','markdown'));

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_feed_posts_workspace_pinned_created
  ON public.feed_posts (workspace_id, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_tags
  ON public.feed_posts USING GIN (tags);

-- 3. Trigger: track edits and pin time
CREATE OR REPLACE FUNCTION public.feed_posts_handle_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_pinned IS DISTINCT FROM OLD.is_pinned THEN
    NEW.pinned_at := CASE WHEN NEW.is_pinned THEN now() ELSE NULL END;
  END IF;

  IF (
    NEW.title IS DISTINCT FROM OLD.title
    OR NEW.content IS DISTINCT FROM OLD.content
    OR NEW.tags IS DISTINCT FROM OLD.tags
    OR NEW.attachments IS DISTINCT FROM OLD.attachments
    OR NEW.content_format IS DISTINCT FROM OLD.content_format
  ) THEN
    NEW.edited_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feed_posts_handle_update ON public.feed_posts;
CREATE TRIGGER trg_feed_posts_handle_update
BEFORE UPDATE ON public.feed_posts
FOR EACH ROW EXECUTE FUNCTION public.feed_posts_handle_update();

-- 4. Allow author or workspace admin to update posts
DROP POLICY IF EXISTS "Authors and admins can update feed posts" ON public.feed_posts;
CREATE POLICY "Authors and admins can update feed posts"
ON public.feed_posts
FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  OR is_workspace_admin(auth.uid(), workspace_id)
  OR is_system_admin(auth.uid())
)
WITH CHECK (
  author_id = auth.uid()
  OR is_workspace_admin(auth.uid(), workspace_id)
  OR is_system_admin(auth.uid())
);

-- 5. Storage bucket for feed attachments (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('feed-attachments', 'feed-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies — path layout: <workspace_id>/<uuid>/<filename>
DROP POLICY IF EXISTS "Workspace members can read feed attachments" ON storage.objects;
CREATE POLICY "Workspace members can read feed attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'feed-attachments'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.workspace_id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Workspace members can upload feed attachments" ON storage.objects;
CREATE POLICY "Workspace members can upload feed attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'feed-attachments'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.workspace_id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Authors and admins can delete feed attachments" ON storage.objects;
CREATE POLICY "Authors and admins can delete feed attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'feed-attachments'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.workspace_id::text = (storage.foldername(name))[1]
      AND (wm.role = 'admin' OR is_system_admin(auth.uid()))
  )
);
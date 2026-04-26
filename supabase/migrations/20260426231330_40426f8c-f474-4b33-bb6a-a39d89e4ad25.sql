-- Restringir criação de posts no feed apenas a admins de workspace ou system admins
DROP POLICY IF EXISTS "Members can create feed posts" ON public.feed_posts;

CREATE POLICY "Only admins can create feed posts"
ON public.feed_posts
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND (
    public.is_workspace_admin(auth.uid(), workspace_id)
    OR public.is_system_admin(auth.uid())
  )
);

-- Permitir que admins excluam qualquer post do feed (autores já podem via política existente)
CREATE POLICY "Admins can delete any feed post"
ON public.feed_posts
FOR DELETE
USING (
  public.is_workspace_admin(auth.uid(), workspace_id)
  OR public.is_system_admin(auth.uid())
);

-- Permitir que admins excluam qualquer comentário (autores já podem via política existente)
CREATE POLICY "Admins can delete any comment"
ON public.feed_post_comments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.feed_posts p
    WHERE p.id = feed_post_comments.post_id
      AND (
        public.is_workspace_admin(auth.uid(), p.workspace_id)
        OR public.is_system_admin(auth.uid())
      )
  )
);
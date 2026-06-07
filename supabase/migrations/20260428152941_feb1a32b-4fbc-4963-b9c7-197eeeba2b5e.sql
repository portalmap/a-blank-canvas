DROP POLICY IF EXISTS "Users can create comments" ON public.feed_post_comments;

CREATE POLICY "Authenticated users can create comments"
ON public.feed_post_comments
FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());
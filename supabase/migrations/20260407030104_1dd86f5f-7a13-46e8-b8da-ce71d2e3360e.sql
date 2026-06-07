
-- Sticker Packs
CREATE TABLE public.sticker_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cover_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sticker_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view sticker packs"
  ON public.sticker_packs FOR SELECT TO authenticated
  USING (user_is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can create sticker packs"
  ON public.sticker_packs FOR INSERT TO authenticated
  WITH CHECK (user_is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "Creator or admin can delete sticker packs"
  ON public.sticker_packs FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Creator or admin can update sticker packs"
  ON public.sticker_packs FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR is_workspace_admin(auth.uid(), workspace_id));

-- Stickers
CREATE TABLE public.stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text,
  image_url text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view stickers"
  ON public.stickers FOR SELECT TO authenticated
  USING (user_is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can create stickers"
  ON public.stickers FOR INSERT TO authenticated
  WITH CHECK (user_is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "Creator or admin can delete stickers"
  ON public.stickers FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR is_workspace_admin(auth.uid(), workspace_id));

-- Sticker Usage (recentes)
CREATE TABLE public.sticker_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sticker_id uuid NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sticker_usage_user ON public.sticker_usage(user_id, used_at DESC);

ALTER TABLE public.sticker_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sticker usage"
  ON public.sticker_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sticker usage"
  ON public.sticker_usage FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sticker usage"
  ON public.sticker_usage FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Storage bucket for stickers
INSERT INTO storage.buckets (id, name, public) VALUES ('stickers', 'stickers', false);

CREATE POLICY "Authenticated users can upload stickers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stickers');

CREATE POLICY "Authenticated users can read stickers"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stickers');

CREATE POLICY "Users can delete own stickers"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stickers' AND auth.uid()::text = (storage.foldername(name))[1]);


-- 1. Add reply_to column to chat_messages for threads
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL;

-- 2. Add dm and group_dm to chat_channel_type enum
ALTER TYPE public.chat_channel_type ADD VALUE IF NOT EXISTS 'dm';
ALTER TYPE public.chat_channel_type ADD VALUE IF NOT EXISTS 'group_dm';

-- 3. Create chat_reactions table
CREATE TABLE public.chat_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — workspace members via channel
CREATE POLICY "Workspace members can view reactions"
  ON public.chat_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_channels cc ON cc.id = cm.channel_id
      JOIN workspace_members wm ON wm.workspace_id = cc.workspace_id
      WHERE cm.id = chat_reactions.message_id
        AND wm.user_id = auth.uid()
    )
  );

-- RLS: INSERT — authenticated users can react
CREATE POLICY "Authenticated users can add reactions"
  ON public.chat_reactions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_channels cc ON cc.id = cm.channel_id
      JOIN workspace_members wm ON wm.workspace_id = cc.workspace_id
      WHERE cm.id = chat_reactions.message_id
        AND wm.user_id = auth.uid()
    )
  );

-- RLS: DELETE — only own reactions
CREATE POLICY "Users can remove own reactions"
  ON public.chat_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. Create chat_pinned_messages table
CREATE TABLE public.chat_pinned_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL UNIQUE REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  pinned_by uuid NOT NULL,
  pinned_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_pinned_messages ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — workspace members
CREATE POLICY "Workspace members can view pinned messages"
  ON public.chat_pinned_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_channels cc
      JOIN workspace_members wm ON wm.workspace_id = cc.workspace_id
      WHERE cc.id = chat_pinned_messages.channel_id
        AND wm.user_id = auth.uid()
    )
  );

-- RLS: INSERT — admins or channel creator
CREATE POLICY "Admins and channel creators can pin messages"
  ON public.chat_pinned_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = pinned_by
    AND EXISTS (
      SELECT 1 FROM chat_channels cc
      JOIN workspace_members wm ON wm.workspace_id = cc.workspace_id
      WHERE cc.id = chat_pinned_messages.channel_id
        AND wm.user_id = auth.uid()
        AND (
          wm.role = 'admin'
          OR cc.created_by_user_id = auth.uid()
        )
    )
  );

-- RLS: DELETE — admins or channel creator
CREATE POLICY "Admins and channel creators can unpin messages"
  ON public.chat_pinned_messages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_channels cc
      JOIN workspace_members wm ON wm.workspace_id = cc.workspace_id
      WHERE cc.id = chat_pinned_messages.channel_id
        AND wm.user_id = auth.uid()
        AND (
          wm.role = 'admin'
          OR cc.created_by_user_id = auth.uid()
        )
    )
  );

-- 5. Enable realtime for chat_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;

-- 6. Create index for thread queries
CREATE INDEX idx_chat_messages_reply_to ON public.chat_messages(reply_to) WHERE reply_to IS NOT NULL;

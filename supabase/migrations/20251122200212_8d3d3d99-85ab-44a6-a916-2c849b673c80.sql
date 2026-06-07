-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_message_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CHAT CHANNELS POLICIES
-- =============================================

CREATE POLICY "Users can view channels in their workspaces"
    ON public.chat_channels FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = chat_channels.workspace_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create channels"
    ON public.chat_channels FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = chat_channels.workspace_id
              AND user_id = auth.uid()
        )
        AND created_by_user_id = auth.uid()
    );

CREATE POLICY "Channel owners can update channels"
    ON public.chat_channels FOR UPDATE
    USING (
        created_by_user_id = auth.uid()
        OR public.user_is_workspace_admin(auth.uid(), workspace_id)
    );

CREATE POLICY "Channel owners can delete channels"
    ON public.chat_channels FOR DELETE
    USING (
        created_by_user_id = auth.uid()
        OR public.user_is_workspace_admin(auth.uid(), workspace_id)
    );

-- =============================================
-- CHAT CHANNEL MEMBERS POLICIES
-- =============================================

CREATE POLICY "Users can view channel members"
    ON public.chat_channel_members FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.chat_channels c
            JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
            WHERE c.id = chat_channel_members.channel_id
              AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Channel owners can add members"
    ON public.chat_channel_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_channels c
            WHERE c.id = chat_channel_members.channel_id
              AND (c.created_by_user_id = auth.uid() 
                   OR public.user_is_workspace_admin(auth.uid(), c.workspace_id))
        )
    );

CREATE POLICY "Channel owners can remove members"
    ON public.chat_channel_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_channels c
            WHERE c.id = chat_channel_members.channel_id
              AND (c.created_by_user_id = auth.uid() 
                   OR public.user_is_workspace_admin(auth.uid(), c.workspace_id))
        )
    );

-- =============================================
-- CHAT MESSAGES POLICIES
-- =============================================

CREATE POLICY "Channel members can view messages"
    ON public.chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_channel_members
            WHERE channel_id = chat_messages.channel_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Channel members can send messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_channel_members
            WHERE channel_id = chat_messages.channel_id
              AND user_id = auth.uid()
        )
        AND sender_id = auth.uid()
    );

CREATE POLICY "Users can update their own messages"
    ON public.chat_messages FOR UPDATE
    USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
    ON public.chat_messages FOR DELETE
    USING (sender_id = auth.uid());

-- =============================================
-- DIRECT MESSAGE CONVERSATIONS POLICIES
-- =============================================

CREATE POLICY "Users can view their conversations"
    ON public.direct_message_conversations FOR SELECT
    USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can create conversations"
    ON public.direct_message_conversations FOR INSERT
    WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

-- =============================================
-- DIRECT MESSAGES POLICIES
-- =============================================

CREATE POLICY "Conversation participants can view messages"
    ON public.direct_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.direct_message_conversations
            WHERE id = direct_messages.conversation_id
              AND (user1_id = auth.uid() OR user2_id = auth.uid())
        )
    );

CREATE POLICY "Conversation participants can send messages"
    ON public.direct_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.direct_message_conversations
            WHERE id = direct_messages.conversation_id
              AND (user1_id = auth.uid() OR user2_id = auth.uid())
        )
        AND sender_id = auth.uid()
    );

-- =============================================
-- FEED POSTS POLICIES
-- =============================================

CREATE POLICY "Users can view feed posts in their workspaces"
    ON public.feed_posts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = feed_posts.workspace_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create feed posts"
    ON public.feed_posts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = feed_posts.workspace_id
              AND user_id = auth.uid()
        )
        AND author_id = auth.uid()
    );

CREATE POLICY "Authors can update their posts"
    ON public.feed_posts FOR UPDATE
    USING (author_id = auth.uid());

CREATE POLICY "Authors can delete their posts"
    ON public.feed_posts FOR DELETE
    USING (author_id = auth.uid());

-- =============================================
-- FEED POST COMMENTS POLICIES
-- =============================================

CREATE POLICY "Users can view comments on visible posts"
    ON public.feed_post_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.feed_posts p
            JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = feed_post_comments.post_id
              AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create comments"
    ON public.feed_post_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.feed_posts p
            JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = feed_post_comments.post_id
              AND wm.user_id = auth.uid()
        )
        AND author_id = auth.uid()
    );

CREATE POLICY "Authors can delete their comments"
    ON public.feed_post_comments FOR DELETE
    USING (author_id = auth.uid());

-- =============================================
-- FEED POST REACTIONS POLICIES
-- =============================================

CREATE POLICY "Users can view reactions"
    ON public.feed_post_reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.feed_posts p
            JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = feed_post_reactions.post_id
              AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add reactions"
    ON public.feed_post_reactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.feed_posts p
            JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
            WHERE p.id = feed_post_reactions.post_id
              AND wm.user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can remove their reactions"
    ON public.feed_post_reactions FOR DELETE
    USING (user_id = auth.uid());

-- =============================================
-- TEAMS POLICIES
-- =============================================

CREATE POLICY "Users can view teams in their workspaces"
    ON public.teams FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = teams.workspace_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can create teams"
    ON public.teams FOR INSERT
    WITH CHECK (public.user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update teams"
    ON public.teams FOR UPDATE
    USING (public.user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete teams"
    ON public.teams FOR DELETE
    USING (public.user_is_workspace_admin(auth.uid(), workspace_id));

-- =============================================
-- TEAM MEMBERS POLICIES
-- =============================================

CREATE POLICY "Users can view team members"
    ON public.team_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.teams t
            JOIN public.workspace_members wm ON wm.workspace_id = t.workspace_id
            WHERE t.id = team_members.team_id
              AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can add team members"
    ON public.team_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = team_members.team_id
              AND public.user_is_workspace_admin(auth.uid(), t.workspace_id)
        )
    );

CREATE POLICY "Admins can remove team members"
    ON public.team_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = team_members.team_id
              AND public.user_is_workspace_admin(auth.uid(), t.workspace_id)
        )
    );

-- =============================================
-- DOCUMENTS POLICIES
-- =============================================

CREATE POLICY "Users can view documents with permission"
    ON public.documents FOR SELECT
    USING (
        created_by_user_id = auth.uid()
        OR public.user_is_workspace_admin(auth.uid(), workspace_id)
        OR EXISTS (
            SELECT 1 FROM public.document_permissions
            WHERE document_id = documents.id
              AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.document_permissions dp
            JOIN public.team_members tm ON tm.team_id = dp.team_id
            WHERE dp.document_id = documents.id
              AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create documents"
    ON public.documents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = documents.workspace_id
              AND user_id = auth.uid()
        )
        AND created_by_user_id = auth.uid()
    );

CREATE POLICY "Creators and editors can update documents"
    ON public.documents FOR UPDATE
    USING (
        created_by_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.document_permissions
            WHERE document_id = documents.id
              AND user_id = auth.uid()
              AND role = 'editor'
        )
    );

CREATE POLICY "Creators can delete documents"
    ON public.documents FOR DELETE
    USING (created_by_user_id = auth.uid());

-- =============================================
-- DOCUMENT PERMISSIONS POLICIES
-- =============================================

CREATE POLICY "Users can view document permissions"
    ON public.document_permissions FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_permissions.document_id
              AND (d.created_by_user_id = auth.uid() 
                   OR public.user_is_workspace_admin(auth.uid(), d.workspace_id))
        )
    );

CREATE POLICY "Document creators can manage permissions"
    ON public.document_permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_permissions.document_id
              AND (d.created_by_user_id = auth.uid() 
                   OR public.user_is_workspace_admin(auth.uid(), d.workspace_id))
        )
    );

-- =============================================
-- DASHBOARDS POLICIES
-- =============================================

CREATE POLICY "Users can view dashboards with permission"
    ON public.dashboards FOR SELECT
    USING (
        created_by_user_id = auth.uid()
        OR public.user_is_workspace_admin(auth.uid(), workspace_id)
        OR EXISTS (
            SELECT 1 FROM public.dashboard_permissions
            WHERE dashboard_id = dashboards.id
              AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.dashboard_permissions dp
            JOIN public.team_members tm ON tm.team_id = dp.team_id
            WHERE dp.dashboard_id = dashboards.id
              AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create dashboards"
    ON public.dashboards FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = dashboards.workspace_id
              AND user_id = auth.uid()
        )
        AND created_by_user_id = auth.uid()
    );

CREATE POLICY "Creators and editors can update dashboards"
    ON public.dashboards FOR UPDATE
    USING (
        created_by_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.dashboard_permissions
            WHERE dashboard_id = dashboards.id
              AND user_id = auth.uid()
              AND role = 'editor'
        )
    );

CREATE POLICY "Creators can delete dashboards"
    ON public.dashboards FOR DELETE
    USING (created_by_user_id = auth.uid());

-- =============================================
-- DASHBOARD PERMISSIONS POLICIES
-- =============================================

CREATE POLICY "Users can view dashboard permissions"
    ON public.dashboard_permissions FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.dashboards d
            WHERE d.id = dashboard_permissions.dashboard_id
              AND (d.created_by_user_id = auth.uid() 
                   OR public.user_is_workspace_admin(auth.uid(), d.workspace_id))
        )
    );

CREATE POLICY "Dashboard creators can manage permissions"
    ON public.dashboard_permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.dashboards d
            WHERE d.id = dashboard_permissions.dashboard_id
              AND (d.created_by_user_id = auth.uid() 
                   OR public.user_is_workspace_admin(auth.uid(), d.workspace_id))
        )
    );

-- =============================================
-- AUTOMATIONS POLICIES
-- =============================================

CREATE POLICY "Users can view automations in their workspaces"
    ON public.automations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = automations.workspace_id
              AND user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can create automations"
    ON public.automations FOR INSERT
    WITH CHECK (public.user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update automations"
    ON public.automations FOR UPDATE
    USING (public.user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete automations"
    ON public.automations FOR DELETE
    USING (public.user_is_workspace_admin(auth.uid(), workspace_id));

-- =============================================
-- AUTOMATION LOGS POLICIES
-- =============================================

CREATE POLICY "Admins can view automation logs"
    ON public.automation_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_logs.automation_id
              AND public.user_is_workspace_admin(auth.uid(), a.workspace_id)
        )
    );
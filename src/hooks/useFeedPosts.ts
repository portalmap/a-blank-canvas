// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { FeedAttachment } from '@/lib/feedAttachments';

export interface FeedPost {
  id: string;
  title: string | null;
  content: string;
  content_format: 'plain' | 'markdown';
  tags: string[];
  is_pinned: boolean;
  pinned_at: string | null;
  edited_at: string | null;
  attachments: FeedAttachment[];
  created_at: string;
  author_id: string;
  workspace_id: string;
  visibility: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  reactions_count: number;
  comments_count: number;
  user_has_reacted: boolean;
}

export interface FeedComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CreatePostInput {
  title?: string;
  content: string;
  content_format?: 'plain' | 'markdown';
  tags?: string[];
  attachments?: FeedAttachment[];
}

export interface UpdatePostInput {
  id: string;
  title?: string | null;
  content?: string;
  content_format?: 'plain' | 'markdown';
  tags?: string[];
  attachments?: FeedAttachment[];
}

export function useFeedPosts() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const permissionsQuery = useQuery({
    queryKey: ['feed-permissions', activeWorkspace?.id, user?.id],
    queryFn: async () => {
      if (!user?.id || !activeWorkspace?.id) {
        return { canCreatePost: false, isAdmin: false };
      }

      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', activeWorkspace.id)
        .eq('user_id', user.id)
        .maybeSingle();

      const isWorkspaceAdmin = membership?.role === 'admin';

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isSystemAdmin = !!roles?.some(
        (r) => r.role === 'global_owner' || r.role === 'owner'
      );

      const isAdmin = isWorkspaceAdmin || isSystemAdmin;
      return { canCreatePost: isAdmin, isAdmin };
    },
    enabled: !!user?.id && !!activeWorkspace?.id,
  });

  const postsQuery = useQuery({
    queryKey: ['feed-posts', activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];

      const { data: posts, error: postsError } = await supabase
        .from('feed_posts')
        .select(
          'id, title, content, content_format, tags, is_pinned, pinned_at, edited_at, attachments, created_at, author_id, workspace_id, visibility'
        )
        .eq('workspace_id', activeWorkspace.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      if (!posts || posts.length === 0) return [];

      const authorIds = [...new Set(posts.map((p) => p.author_id))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      const postIds = posts.map((p) => p.id);

      const { data: reactionsCounts } = await supabase
        .from('feed_post_reactions')
        .select('post_id')
        .in('post_id', postIds);

      const reactionsCountMap = new Map<string, number>();
      reactionsCounts?.forEach((r) => {
        reactionsCountMap.set(r.post_id, (reactionsCountMap.get(r.post_id) || 0) + 1);
      });

      const { data: commentsCounts } = await supabase
        .from('feed_post_comments')
        .select('post_id')
        .in('post_id', postIds);

      const commentsCountMap = new Map<string, number>();
      commentsCounts?.forEach((c) => {
        commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) || 0) + 1);
      });

      const { data: userReactions } = await supabase
        .from('feed_post_reactions')
        .select('post_id')
        .eq('user_id', user?.id || '')
        .in('post_id', postIds);

      const userReactedPosts = new Set(userReactions?.map((r) => r.post_id) || []);

      return posts.map((post) => ({
        ...post,
        content_format: (post.content_format as 'plain' | 'markdown') || 'markdown',
        tags: post.tags || [],
        attachments: (post.attachments as unknown as FeedAttachment[]) || [],
        author: profilesMap.get(post.author_id) || null,
        reactions_count: reactionsCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
        user_has_reacted: userReactedPosts.has(post.id),
      })) as FeedPost[];
    },
    enabled: !!activeWorkspace?.id,
  });

  const createPostMutation = useMutation({
    mutationFn: async (input: CreatePostInput) => {
      if (!user?.id || !activeWorkspace?.id)
        throw new Error('Usuário ou workspace não encontrado');

      const { data, error } = await supabase
        .from('feed_posts')
        .insert({
          author_id: user.id,
          workspace_id: activeWorkspace.id,
          title: input.title || null,
          content: input.content,
          content_format: input.content_format || 'markdown',
          tags: input.tags || [],
          attachments: (input.attachments || []) as unknown as never,
          visibility: 'workspace',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts', activeWorkspace?.id] });
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdatePostInput) => {
      const update: Record<string, unknown> = {};
      if (input.title !== undefined) update.title = input.title;
      if (input.content !== undefined) update.content = input.content;
      if (input.content_format !== undefined) update.content_format = input.content_format;
      if (input.tags !== undefined) update.tags = input.tags;
      if (input.attachments !== undefined) update.attachments = input.attachments;

      const { error } = await supabase.from('feed_posts').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts', activeWorkspace?.id] });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase
        .from('feed_posts')
        .update({ is_pinned })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts', activeWorkspace?.id] });
    },
  });

  const toggleReactionMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!user?.id) throw new Error('Usuário não encontrado');

      const { data: existingReaction } = await supabase
        .from('feed_post_reactions')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingReaction) {
        const { error } = await supabase
          .from('feed_post_reactions')
          .delete()
          .eq('id', existingReaction.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('feed_post_reactions')
          .insert({ post_id: postId, user_id: user.id, type: 'like' });
        if (error) throw error;
      }
    },
    onSuccess: (_d, postId) => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts', activeWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ['feed-reactors', postId] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user?.id) throw new Error('Usuário não encontrado');

      const { data, error } = await supabase
        .from('feed_post_comments')
        .insert({ post_id: postId, author_id: user.id, content })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts', activeWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ['feed-comments', variables.postId] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('feed_posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts', activeWorkspace?.id] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
      const { error } = await supabase
        .from('feed_post_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
      return { postId };
    },
    onSuccess: ({ postId }) => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts', activeWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ['feed-comments', postId] });
    },
  });

  return {
    posts: postsQuery.data || [],
    isLoading: postsQuery.isLoading,
    error: postsQuery.error,
    canCreatePost: permissionsQuery.data?.canCreatePost ?? false,
    isAdmin: permissionsQuery.data?.isAdmin ?? false,
    createPost: createPostMutation.mutateAsync,
    isCreating: createPostMutation.isPending,
    updatePost: updatePostMutation.mutateAsync,
    isUpdating: updatePostMutation.isPending,
    togglePin: togglePinMutation.mutateAsync,
    toggleReaction: toggleReactionMutation.mutateAsync,
    addComment: addCommentMutation.mutateAsync,
    isAddingComment: addCommentMutation.isPending,
    deletePost: deletePostMutation.mutateAsync,
    deleteComment: deleteCommentMutation.mutateAsync,
  };
}

export function usePostComments(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['feed-comments', postId],
    queryFn: async (): Promise<FeedComment[]> => {
      const { data: comments, error } = await supabase
        .from('feed_post_comments')
        .select('id, post_id, author_id, content, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!comments || comments.length === 0) return [];

      const authorIds = [...new Set(comments.map((c) => c.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return comments.map((c) => ({
        ...c,
        author: profilesMap.get(c.author_id) || null,
      }));
    },
    enabled: enabled && !!postId,
  });
}

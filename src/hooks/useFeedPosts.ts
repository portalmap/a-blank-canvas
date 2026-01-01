import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface FeedPost {
  id: string;
  title: string | null;
  content: string;
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

export function useFeedPosts() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const postsQuery = useQuery({
    queryKey: ['feed-posts', activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];

      // Fetch posts with author profile
      const { data: posts, error: postsError } = await supabase
        .from('feed_posts')
        .select(`
          id,
          title,
          content,
          created_at,
          author_id,
          workspace_id,
          visibility
        `)
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      if (!posts || posts.length === 0) return [];

      // Get unique author IDs
      const authorIds = [...new Set(posts.map(p => p.author_id))];
      
      // Fetch profiles for all authors
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch reactions count per post
      const { data: reactionsCounts } = await supabase
        .from('feed_post_reactions')
        .select('post_id')
        .in('post_id', posts.map(p => p.id));

      const reactionsCountMap = new Map<string, number>();
      reactionsCounts?.forEach(r => {
        reactionsCountMap.set(r.post_id, (reactionsCountMap.get(r.post_id) || 0) + 1);
      });

      // Fetch comments count per post
      const { data: commentsCounts } = await supabase
        .from('feed_post_comments')
        .select('post_id')
        .in('post_id', posts.map(p => p.id));

      const commentsCountMap = new Map<string, number>();
      commentsCounts?.forEach(c => {
        commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) || 0) + 1);
      });

      // Fetch user's reactions
      const { data: userReactions } = await supabase
        .from('feed_post_reactions')
        .select('post_id')
        .eq('user_id', user?.id || '')
        .in('post_id', posts.map(p => p.id));

      const userReactedPosts = new Set(userReactions?.map(r => r.post_id) || []);

      // Combine all data
      return posts.map(post => ({
        ...post,
        author: profilesMap.get(post.author_id) || null,
        reactions_count: reactionsCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
        user_has_reacted: userReactedPosts.has(post.id),
      })) as FeedPost[];
    },
    enabled: !!activeWorkspace?.id,
  });

  const createPostMutation = useMutation({
    mutationFn: async ({ title, content }: { title?: string; content: string }) => {
      if (!user?.id || !activeWorkspace?.id) throw new Error('Usuário ou workspace não encontrado');

      const { data, error } = await supabase
        .from('feed_posts')
        .insert({
          author_id: user.id,
          workspace_id: activeWorkspace.id,
          title: title || null,
          content,
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

  const toggleReactionMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!user?.id) throw new Error('Usuário não encontrado');

      // Check if user already reacted
      const { data: existingReaction } = await supabase
        .from('feed_post_reactions')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('feed_post_reactions')
          .delete()
          .eq('id', existingReaction.id);
        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('feed_post_reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            type: 'like',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts', activeWorkspace?.id] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user?.id) throw new Error('Usuário não encontrado');

      const { data, error } = await supabase
        .from('feed_post_comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          content,
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

  return {
    posts: postsQuery.data || [],
    isLoading: postsQuery.isLoading,
    error: postsQuery.error,
    createPost: createPostMutation.mutateAsync,
    isCreating: createPostMutation.isPending,
    toggleReaction: toggleReactionMutation.mutateAsync,
    addComment: addCommentMutation.mutateAsync,
  };
}

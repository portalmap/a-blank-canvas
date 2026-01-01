import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MyAssignedComment {
  id: string;
  content: string;
  created_at: string;
  task_id: string;
  task_title: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useMyAssignedComments = () => {
  return useQuery({
    queryKey: ['my-assigned-comments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get comments assigned to user that are not resolved
      const { data: comments, error: commentsError } = await supabase
        .from('task_comments')
        .select('id, content, created_at, task_id, author_id')
        .eq('assignee_id', user.id)
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;
      if (!comments || comments.length === 0) return [];

      // Get task titles
      const taskIds = [...new Set(comments.map(c => c.task_id))];
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title')
        .in('id', taskIds);

      const taskMap = new Map(tasks?.map(t => [t.id, t.title]) || []);

      // Get author profiles
      const authorIds = [...new Set(comments.map(c => c.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        task_id: comment.task_id,
        task_title: taskMap.get(comment.task_id) || 'Tarefa',
        author: profileMap.get(comment.author_id) || null,
      })) as MyAssignedComment[];
    },
  });
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MyAssignedComment {
  id: string;
  content: string;
  created_at: string;
  source_id: string;
  source_type: 'task' | 'chat';
  source_title: string;
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

      // 1. Get task comments assigned to user that are not resolved
      const { data: taskComments, error: taskCommentsError } = await supabase
        .from('task_comments')
        .select('id, content, created_at, task_id, author_id')
        .eq('assignee_id', user.id)
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (taskCommentsError) throw taskCommentsError;

      // 2. Get chat messages assigned to user that are not resolved
      const { data: chatMessages, error: chatMessagesError } = await supabase
        .from('chat_messages')
        .select('id, content, created_at, channel_id, sender_id')
        .eq('assignee_id', user.id)
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (chatMessagesError) throw chatMessagesError;

      // Get task titles
      const taskIds = [...new Set((taskComments || []).map(c => c.task_id))];
      let taskMap = new Map<string, string>();
      if (taskIds.length > 0) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title')
          .in('id', taskIds);
        taskMap = new Map(tasks?.map(t => [t.id, t.title]) || []);
      }

      // Get channel names
      const channelIds = [...new Set((chatMessages || []).map(m => m.channel_id))];
      let channelMap = new Map<string, string>();
      if (channelIds.length > 0) {
        const { data: channels } = await supabase
          .from('chat_channels')
          .select('id, name')
          .in('id', channelIds);
        channelMap = new Map(channels?.map(c => [c.id, c.name]) || []);
      }

      // Get author profiles
      const authorIds = [
        ...new Set([
          ...(taskComments || []).map(c => c.author_id),
          ...(chatMessages || []).map(m => m.sender_id),
        ])
      ];
      let profileMap = new Map<string, { id: string; full_name: string | null; avatar_url: string | null }>();
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', authorIds);
        profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      }

      // Combine and format both types
      const taskItems: MyAssignedComment[] = (taskComments || []).map(comment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at || '',
        source_id: comment.task_id,
        source_type: 'task' as const,
        source_title: taskMap.get(comment.task_id) || 'Tarefa',
        author: profileMap.get(comment.author_id) || null,
      }));

      const chatItems: MyAssignedComment[] = (chatMessages || []).map(message => ({
        id: message.id,
        content: message.content,
        created_at: message.created_at,
        source_id: message.channel_id,
        source_type: 'chat' as const,
        source_title: channelMap.get(message.channel_id) || 'Canal',
        author: profileMap.get(message.sender_id) || null,
      }));

      // Sort by date (most recent first)
      return [...taskItems, ...chatItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });
};

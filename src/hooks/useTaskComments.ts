import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  assignee_id: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  resolver?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useTaskComments = (taskId?: string) => {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data: comments, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!comments || comments.length === 0) return [];

      // Collect all user IDs (authors, assignees, resolvers)
      const userIds = new Set<string>();
      comments.forEach(c => {
        userIds.add(c.author_id);
        if (c.assignee_id) userIds.add(c.assignee_id);
        if (c.resolved_by) userIds.add(c.resolved_by);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return comments.map(comment => ({
        ...comment,
        author: profileMap.get(comment.author_id) || null,
        assignee: comment.assignee_id ? profileMap.get(comment.assignee_id) || null : null,
        resolver: comment.resolved_by ? profileMap.get(comment.resolved_by) || null : null,
      })) as TaskComment[];
    },
    enabled: !!taskId,
  });
};

export const useCreateTaskComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      content, 
      assigneeId 
    }: { 
      taskId: string; 
      content: string;
      assigneeId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          author_id: user.id,
          content,
          assignee_id: assigneeId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, hasAssignee: !!assigneeId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.task_id] });
      if (data.hasAssignee) {
        toast.success('Comentário com atribuição adicionado!');
      } else {
        toast.success('Comentário adicionado!');
      }
    },
    onError: (error) => {
      toast.error('Erro ao adicionar comentário');
      console.error(error);
    },
  });
};

export const useResolveCommentAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, taskId }: { commentId: string; taskId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('task_comments')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', commentId);

      if (error) throw error;
      return { commentId, taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.taskId] });
      queryClient.invalidateQueries({ queryKey: ['my-assigned-comments'] });
      toast.success('Atribuição resolvida!');
    },
    onError: (error) => {
      toast.error('Erro ao resolver atribuição');
      console.error(error);
    },
  });
};

export const useUpdateTaskComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      commentId, 
      taskId, 
      content,
      authorId,
      assigneeId,
    }: { 
      commentId: string; 
      taskId: string; 
      content: string;
      authorId: string;
      assigneeId?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar se o usuário é o autor (proteção adicional no frontend)
      if (authorId !== user.id) {
        throw new Error('Você não tem permissão para editar este comentário');
      }

      const { error } = await supabase
        .from('task_comments')
        .update({ 
          content,
          assignee_id: assigneeId,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;
      return { commentId, taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', data.taskId] });
      queryClient.invalidateQueries({ queryKey: ['my-assigned-comments'] });
      toast.success('Comentário atualizado!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar comentário');
    },
  });
};

export const useDeleteTaskComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', data.taskId] });
      toast.success('Comentário removido!');
    },
    onError: (error) => {
      toast.error('Erro ao remover comentário');
      console.error(error);
    },
  });
};

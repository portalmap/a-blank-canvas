import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  created_at: string;
  source_type?: string;
  source_id?: string;
  user?: {
    full_name: string;
    avatar_url?: string;
  };
}

export const useTaskAssignees = (taskId?: string) => {
  return useQuery({
    queryKey: ['task-assignees', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      // Get assignees
      const { data: assignees, error } = await supabase
        .from('task_assignees')
        .select('*')
        .eq('task_id', taskId);

      if (error) throw error;
      if (!assignees || assignees.length === 0) return [];

      // Get user profiles separately
      const userIds = assignees.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // Combine data
      return assignees.map(assignee => ({
        ...assignee,
        user: profiles?.find(p => p.id === assignee.user_id),
      })) as TaskAssignee[];
    },
    enabled: !!taskId,
  });
};

export const useAddTaskAssignee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('task_assignees')
        .insert({
          task_id: taskId,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignees', data.task_id] });
      toast.success('Responsável adicionado!');
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('Este usuário já é responsável pela tarefa');
      } else {
        toast.error('Erro ao adicionar responsável');
      }
      console.error(error);
    },
  });
};

export const useRemoveTaskAssignee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const { error } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
      return { taskId, userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignees', data.taskId] });
      toast.success('Responsável removido!');
    },
    onError: (error) => {
      toast.error('Erro ao remover responsável');
      console.error(error);
    },
  });
};

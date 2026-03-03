import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TaskFollower {
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

export const useTaskFollowers = (taskId?: string) => {
  return useQuery({
    queryKey: ['task-followers', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data: followers, error } = await supabase
        .from('task_followers')
        .select('*')
        .eq('task_id', taskId);

      if (error) throw error;
      if (!followers || followers.length === 0) return [];

      const userIds = followers.map(f => f.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      return followers.map(follower => ({
        ...follower,
        user: profiles?.find(p => p.id === follower.user_id),
      })) as TaskFollower[];
    },
    enabled: !!taskId,
  });
};

export const useAddTaskFollower = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('task_followers')
        .insert({
          task_id: taskId,
          user_id: userId,
          source_type: 'manual',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-followers', data.task_id] });
      toast.success('Seguidor adicionado!');
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('Este usuário já é seguidor da tarefa');
      } else {
        toast.error('Erro ao adicionar seguidor');
      }
      console.error(error);
    },
  });
};

export const useRemoveTaskFollower = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const { error } = await supabase
        .from('task_followers')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
      return { taskId, userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-followers', data.taskId] });
      toast.success('Seguidor removido!');
    },
    onError: (error) => {
      toast.error('Erro ao remover seguidor');
      console.error(error);
    },
  });
};

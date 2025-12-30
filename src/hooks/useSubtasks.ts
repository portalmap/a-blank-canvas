import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSubtasks = (parentId?: string) => {
  return useQuery({
    queryKey: ['subtasks', parentId],
    queryFn: async () => {
      if (!parentId) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles(full_name, avatar_url), status:statuses(name, color)')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!parentId,
  });
};

export const useCreateSubtask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      parentId,
      workspaceId,
      listId, 
      statusId,
      title, 
      description,
      priority = 'medium',
      assigneeId,
      dueDate,
      startDate
    }: { 
      parentId: string;
      workspaceId: string;
      listId: string; 
      statusId: string;
      title: string; 
      description?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      assigneeId?: string;
      dueDate?: string;
      startDate?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('tasks')
        .insert({ 
          parent_id: parentId,
          workspace_id: workspaceId,
          list_id: listId,
          status_id: statusId,
          title, 
          description,
          priority,
          assignee_id: assigneeId,
          due_date: dueDate,
          start_date: startDate,
          created_by_user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar atividade na tarefa pai
      await supabase.from('task_activities').insert({
        task_id: parentId,
        user_id: user.id,
        activity_type: 'subtask.created',
        metadata: {
          subtask_id: data.id,
          subtask_title: title,
          created_by: 'user',
        },
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', data.parent_id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', data.parent_id] });
      toast.success('Subtarefa criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar subtarefa');
      console.error(error);
    },
  });
};

export const useSubtaskCount = (parentId?: string) => {
  return useQuery({
    queryKey: ['subtask-count', parentId],
    queryFn: async () => {
      if (!parentId) return { total: 0, completed: 0 };
      
      const { data, error } = await supabase
        .from('tasks')
        .select('id, completed_at')
        .eq('parent_id', parentId);

      if (error) throw error;
      
      const total = data?.length || 0;
      const completed = data?.filter(t => t.completed_at !== null).length || 0;
      
      return { total, completed };
    },
    enabled: !!parentId,
  });
};

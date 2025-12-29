import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { applyAutomationsToTask } from './useApplyAutomations';

export const useTasks = (listId?: string) => {
  return useQuery({
    queryKey: ['tasks', listId],
    queryFn: async () => {
      if (!listId) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status_id,
          priority,
          assignee_id,
          start_date,
          due_date,
          list_id,
          workspace_id,
          parent_id,
          completed_at,
          created_at,
          assignee:profiles(full_name, avatar_url),
          status:statuses(name, color)
        `)
        .eq('list_id', listId)
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!listId,
  });
};

export const useMoveTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, listId, workspaceId }: { id: string; listId: string; workspaceId: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ list_id: listId, workspace_id: workspaceId })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa movida com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao mover tarefa');
      console.error(error);
    },
  });
};

export const useArchiveTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.list_id] });
      toast.success('Tarefa arquivada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao arquivar tarefa');
      console.error(error);
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
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

      // Aplicar automações (responsáveis e seguidores automáticos)
      try {
        const result = await applyAutomationsToTask({
          id: data.id,
          workspace_id: data.workspace_id,
          list_id: data.list_id,
        });
        
        if (result.assigneesAdded > 0 || result.followersAdded > 0) {
          console.log(`Automações aplicadas: ${result.assigneesAdded} responsáveis, ${result.followersAdded} seguidores`);
        }
      } catch (automationError) {
        console.error('Erro ao aplicar automações:', automationError);
        // Não falhar a criação da tarefa por causa de erro nas automações
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.list_id] });
      queryClient.invalidateQueries({ queryKey: ['task-assignees', data.id] });
      queryClient.invalidateQueries({ queryKey: ['task-followers', data.id] });
      toast.success('Tarefa criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar tarefa');
      console.error(error);
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      title, 
      description,
      statusId,
      priority,
      assigneeId,
      dueDate,
      startDate,
      completedAt
    }: { 
      id: string; 
      title?: string; 
      description?: string | null;
      statusId?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      assigneeId?: string | null;
      dueDate?: string | null;
      startDate?: string | null;
      completedAt?: string | null;
    }) => {
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (statusId !== undefined) updateData.status_id = statusId;
      if (priority !== undefined) updateData.priority = priority;
      if (assigneeId !== undefined) updateData.assignee_id = assigneeId;
      if (dueDate !== undefined) updateData.due_date = dueDate;
      if (startDate !== undefined) updateData.start_date = startDate;
      if (completedAt !== undefined) updateData.completed_at = completedAt;

      if (Object.keys(updateData).length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.list_id] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
      toast.success('Tarefa atualizada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error(`Erro ao atualizar tarefa: ${error.message}`);
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir tarefa');
      console.error(error);
    },
  });
};

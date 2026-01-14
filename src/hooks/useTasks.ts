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
    mutationFn: async ({ id, listId, workspaceId, oldListName, newListName }: { 
      id: string; 
      listId: string; 
      workspaceId: string;
      oldListName?: string;
      newListName?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('tasks')
        .update({ list_id: listId, workspace_id: workspaceId })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Registrar atividade
      await supabase.from('task_activities').insert({
        task_id: id,
        user_id: user.id,
        activity_type: 'task.moved',
        old_value: oldListName || null,
        new_value: newListName || null,
        metadata: { 
          new_list_id: listId,
          new_workspace_id: workspaceId,
          created_by: 'user',
        },
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-with-assignees'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks-with-assignees'] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', data.id] });
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('tasks')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Registrar atividade
      await supabase.from('task_activities').insert({
        task_id: id,
        user_id: user.id,
        activity_type: 'task.archived',
        metadata: { created_by: 'user' },
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.list_id] });
      queryClient.invalidateQueries({ queryKey: ['tasks-with-assignees', data.list_id] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks-with-assignees'] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', data.id] });
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

      // VALIDAÇÃO: Verificar se o statusId pertence à lista
      let validatedStatusId = statusId;
      
      if (statusId) {
        const { data: validStatus } = await supabase
          .from('statuses')
          .select('id')
          .eq('id', statusId)
          .eq('scope_id', listId)
          .eq('scope_type', 'list')
          .maybeSingle();
        
        // Se o status não pertence à lista, buscar o default da lista
        if (!validStatus) {
          console.warn(`Status ${statusId} não pertence à lista ${listId}. Buscando status default...`);
          
          const { data: defaultStatus } = await supabase
            .from('statuses')
            .select('id')
            .eq('scope_id', listId)
            .eq('scope_type', 'list')
            .eq('is_default', true)
            .maybeSingle();
          
          if (defaultStatus) {
            validatedStatusId = defaultStatus.id;
          } else {
            // Fallback: primeiro status da lista
            const { data: firstStatus } = await supabase
              .from('statuses')
              .select('id')
              .eq('scope_id', listId)
              .eq('scope_type', 'list')
              .order('order_index', { ascending: true })
              .limit(1)
              .maybeSingle();
            
            if (firstStatus) {
              validatedStatusId = firstStatus.id;
            }
          }
        }
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({ 
          workspace_id: workspaceId,
          list_id: listId,
          status_id: validatedStatusId,
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
      queryClient.invalidateQueries({ queryKey: ['tasks-with-assignees', data.list_id] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks', data.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks-with-assignees', data.workspace_id] });
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
      queryClient.invalidateQueries({ queryKey: ['tasks-with-assignees', data.list_id] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks-with-assignees'] });
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
    mutationFn: async ({ id, taskTitle }: { id: string; taskTitle?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar a tarefa para obter o parent_id (se for subtarefa)
      const { data: task } = await supabase
        .from('tasks')
        .select('parent_id, title')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Se for uma subtarefa, registrar atividade na tarefa pai
      if (task?.parent_id) {
        await supabase.from('task_activities').insert({
          task_id: task.parent_id,
          user_id: user.id,
          activity_type: 'subtask.deleted',
          metadata: {
            subtask_title: task.title || taskTitle || 'Subtarefa',
            created_by: 'user',
          },
        });
      }

      return { parentId: task?.parent_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-with-assignees'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks-with-assignees'] });
      if (data?.parentId) {
        queryClient.invalidateQueries({ queryKey: ['subtasks', data.parentId] });
        queryClient.invalidateQueries({ queryKey: ['task-activities', data.parentId] });
      }
      toast.success('Tarefa excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir tarefa');
      console.error(error);
    },
  });
};

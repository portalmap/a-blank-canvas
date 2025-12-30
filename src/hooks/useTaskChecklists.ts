import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTaskChecklists = (taskId?: string) => {
  return useQuery({
    queryKey: ['task-checklists', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data: checklists, error: checklistError } = await supabase
        .from('task_checklists')
        .select('*')
        .eq('task_id', taskId)
        .order('order_index', { ascending: true });

      if (checklistError) throw checklistError;
      if (!checklists || checklists.length === 0) return [];

      const checklistIds = checklists.map(c => c.id);
      
      const { data: items, error: itemsError } = await supabase
        .from('task_checklist_items')
        .select('*')
        .in('checklist_id', checklistIds)
        .order('order_index', { ascending: true });

      if (itemsError) throw itemsError;

      return checklists.map(checklist => ({
        ...checklist,
        items: items?.filter(item => item.checklist_id === checklist.id) || []
      }));
    },
    enabled: !!taskId,
  });
};

export const useCreateTaskChecklist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('task_checklists')
        .insert({ task_id: taskId, title })
        .select()
        .single();

      if (error) throw error;

      // Registrar atividade
      await supabase.from('task_activities').insert({
        task_id: taskId,
        user_id: user.id,
        activity_type: 'checklist.created',
        metadata: {
          checklist_id: data.id,
          checklist_title: title,
        },
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-checklists', data.task_id] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', data.task_id] });
      toast.success('Checklist criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar checklist');
      console.error(error);
    },
  });
};

export const useDeleteTaskChecklist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase
        .from('task_checklists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-checklists', data.taskId] });
      toast.success('Checklist removida!');
    },
    onError: (error) => {
      toast.error('Erro ao remover checklist');
      console.error(error);
    },
  });
};

export const useCreateChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ checklistId, content, taskId }: { checklistId: string; content: string; taskId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('task_checklist_items')
        .insert({ checklist_id: checklistId, content })
        .select()
        .single();

      if (error) throw error;

      // Registrar atividade
      await supabase.from('task_activities').insert({
        task_id: taskId,
        user_id: user.id,
        activity_type: 'checklist.item.created',
        metadata: {
          item_id: data.id,
          item_content: content,
          checklist_id: checklistId,
        },
      });

      return { ...data, taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-checklists', data.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-activities', data.taskId] });
    },
    onError: (error) => {
      toast.error('Erro ao adicionar item');
      console.error(error);
    },
  });
};

export const useUpdateChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      isCompleted, 
      content,
      taskId 
    }: { 
      id: string; 
      isCompleted?: boolean; 
      content?: string;
      taskId: string;
    }) => {
      const updateData: any = {};
      if (isCompleted !== undefined) updateData.is_completed = isCompleted;
      if (content !== undefined) updateData.content = content;

      const { data, error } = await supabase
        .from('task_checklist_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-checklists', data.taskId] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar item');
      console.error(error);
    },
  });
};

export const useDeleteChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase
        .from('task_checklist_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-checklists', data.taskId] });
    },
    onError: (error) => {
      toast.error('Erro ao remover item');
      console.error(error);
    },
  });
};

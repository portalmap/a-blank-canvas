import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  activity_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  user?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useTaskActivities = (taskId?: string) => {
  return useQuery({
    queryKey: ['task-activities', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      // Buscar atividades
      const { data: activities, error } = await supabase
        .from('task_activities')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!activities) return [];

      // Buscar perfis dos usuários
      const userIds = [...new Set(activities.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // Mapear perfis
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return activities.map(activity => ({
        ...activity,
        user: profileMap.get(activity.user_id) || null,
      })) as TaskActivity[];
    },
    enabled: !!taskId,
  });
};

export const useCreateTaskActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      activityType,
      fieldName,
      oldValue,
      newValue,
      metadata,
    }: {
      taskId: string;
      activityType: string;
      fieldName?: string | null;
      oldValue?: string | null;
      newValue?: string | null;
      metadata?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('task_activities')
        .insert({
          task_id: taskId,
          user_id: user.id,
          activity_type: activityType,
          field_name: fieldName || null,
          old_value: oldValue || null,
          new_value: newValue || null,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-activities', data.task_id] });
    },
  });
};

// Helpers para traduzir tipos de atividade
export const getActivityLabel = (activity: TaskActivity): string => {
  const type = activity.activity_type;
  
  switch (type) {
    case 'task.created':
      return 'criou esta tarefa';
    case 'status.changed':
      return `alterou o status de "${activity.old_value || 'Sem status'}" para "${activity.new_value}"`;
    case 'priority.changed':
      return `alterou a prioridade de "${getPriorityLabel(activity.old_value)}" para "${getPriorityLabel(activity.new_value)}"`;
    case 'assignee.changed':
      if (!activity.old_value && activity.new_value) {
        return `atribuiu a tarefa para "${activity.new_value}"`;
      } else if (activity.old_value && !activity.new_value) {
        return `removeu a atribuição de "${activity.old_value}"`;
      }
      return `alterou o responsável de "${activity.old_value}" para "${activity.new_value}"`;
    case 'due_date.changed':
      if (!activity.old_value && activity.new_value) {
        return `definiu a data de entrega para ${formatDate(activity.new_value)}`;
      } else if (activity.old_value && !activity.new_value) {
        return 'removeu a data de entrega';
      }
      return `alterou a data de entrega de ${formatDate(activity.old_value)} para ${formatDate(activity.new_value)}`;
    case 'start_date.changed':
      if (!activity.old_value && activity.new_value) {
        return `definiu a data de início para ${formatDate(activity.new_value)}`;
      } else if (activity.old_value && !activity.new_value) {
        return 'removeu a data de início';
      }
      return `alterou a data de início de ${formatDate(activity.old_value)} para ${formatDate(activity.new_value)}`;
    case 'title.changed':
      return `alterou o título de "${activity.old_value}" para "${activity.new_value}"`;
    case 'description.changed':
      return activity.new_value ? 'atualizou a descrição' : 'removeu a descrição';
    case 'comment.created':
      return 'adicionou um comentário';
    case 'subtask.created':
      return `criou a subtarefa "${activity.metadata?.subtask_title || ''}"`;
    case 'checklist.created':
      return `criou o checklist "${activity.metadata?.checklist_title || ''}"`;
    case 'checklist.item.completed':
      return `marcou "${activity.metadata?.item_name || ''}" como concluído`;
    case 'checklist.item.uncompleted':
      return `desmarcou "${activity.metadata?.item_name || ''}"`;
    case 'subtask.completed':
      return `marcou a subtarefa "${activity.metadata?.subtask_title || ''}" como concluída`;
    case 'subtask.uncompleted':
      return `desmarcou a subtarefa "${activity.metadata?.subtask_title || ''}"`;
    case 'checklist.deleted':
      return `excluiu o checklist "${activity.metadata?.checklist_title || ''}" (${activity.metadata?.items_count || 0} itens)`;
    default:
      return type;
  }
};

const getPriorityLabel = (priority: string | null): string => {
  switch (priority) {
    case 'low': return 'Baixa';
    case 'medium': return 'Média';
    case 'high': return 'Alta';
    case 'urgent': return 'Urgente';
    default: return priority || 'Sem prioridade';
  }
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
};

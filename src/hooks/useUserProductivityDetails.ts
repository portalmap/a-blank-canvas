import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';

export interface TaskDetail {
  id: string;
  title: string;
  completedAt: string;
  dueDate: string | null;
  classification: 'early' | 'on_time' | 'late' | 'no_due_date';
  daysFromDue: number | null;
}

export interface UserProductivityDetails {
  earlyTasks: TaskDetail[];
  onTimeTasks: TaskDetail[];
  lateTasks: TaskDetail[];
  noDueDateTasks: TaskDetail[];
  summary: {
    early: number;
    onTime: number;
    late: number;
    noDueDate: number;
    total: number;
    score: number;
  };
}

interface UseUserProductivityDetailsOptions {
  userId: string | null;
  startDate?: string;
  endDate?: string;
}

const classifyTask = (completedAt: string, dueDate: string | null): { classification: TaskDetail['classification']; daysFromDue: number | null } => {
  if (!dueDate) {
    return { classification: 'no_due_date', daysFromDue: null };
  }

  const completed = startOfDay(parseISO(completedAt));
  const due = startOfDay(parseISO(dueDate));
  const daysFromDue = differenceInDays(due, completed);

  if (daysFromDue >= 7) {
    return { classification: 'early', daysFromDue };
  } else if (daysFromDue >= 0) {
    return { classification: 'on_time', daysFromDue };
  } else {
    return { classification: 'late', daysFromDue: Math.abs(daysFromDue) };
  }
};

const calculateScore = (early: number, onTime: number, noDueDate: number, late: number): number => {
  const total = early + onTime + noDueDate + late;
  if (total === 0) return 0;
  
  const points = (early * 2) + (onTime * 1) + (noDueDate * 1) + (late * 0);
  return Math.round((points / total) * 100);
};

export const useUserProductivityDetails = (options: UseUserProductivityDetailsOptions) => {
  const { activeWorkspace } = useWorkspace();
  const { userId, startDate, endDate } = options;

  return useQuery({
    queryKey: ['user-productivity-details', activeWorkspace?.id, userId, startDate, endDate],
    queryFn: async (): Promise<UserProductivityDetails | null> => {
      if (!activeWorkspace?.id || !userId) return null;

      // Buscar tarefas concluídas do usuário
      let query = supabase
        .from('tasks')
        .select(`
          id,
          title,
          completed_at,
          due_date,
          task_assignees!inner(user_id)
        `)
        .eq('task_assignees.user_id', userId)
        .not('completed_at', 'is', null)
        .is('archived_at', null);

      // Filtrar por período se especificado
      if (startDate) {
        query = query.gte('completed_at', startDate);
      }
      if (endDate) {
        query = query.lte('completed_at', endDate);
      }

      const { data: tasks, error } = await query.order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching user productivity details:', error);
        throw error;
      }

      // Filtrar para apenas tarefas do workspace atual
      const spacesQuery = await supabase
        .from('spaces')
        .select('id')
        .eq('workspace_id', activeWorkspace.id);

      const spaceIds = spacesQuery.data?.map(s => s.id) || [];

      // Buscar listas do workspace
      const listsQuery = await supabase
        .from('lists')
        .select('id, space_id, folder_id')
        .or(`space_id.in.(${spaceIds.join(',')}),folder_id.not.is.null`);

      const listIds = listsQuery.data?.map(l => l.id) || [];

      // Filtrar tarefas por listas do workspace
      const tasksWithListQuery = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          completed_at,
          due_date,
          list_id,
          task_assignees!inner(user_id)
        `)
        .eq('task_assignees.user_id', userId)
        .not('completed_at', 'is', null)
        .is('archived_at', null)
        .in('list_id', listIds)
        .order('completed_at', { ascending: false });

      let filteredTasks = tasksWithListQuery.data || [];

      // Aplicar filtros de data
      if (startDate) {
        filteredTasks = filteredTasks.filter(t => t.completed_at && t.completed_at >= startDate);
      }
      if (endDate) {
        filteredTasks = filteredTasks.filter(t => t.completed_at && t.completed_at <= endDate);
      }

      // Classificar tarefas
      const earlyTasks: TaskDetail[] = [];
      const onTimeTasks: TaskDetail[] = [];
      const lateTasks: TaskDetail[] = [];
      const noDueDateTasks: TaskDetail[] = [];

      for (const task of filteredTasks) {
        const { classification, daysFromDue } = classifyTask(
          task.completed_at!,
          task.due_date
        );

        const taskDetail: TaskDetail = {
          id: task.id,
          title: task.title,
          completedAt: task.completed_at!,
          dueDate: task.due_date,
          classification,
          daysFromDue,
        };

        switch (classification) {
          case 'early':
            earlyTasks.push(taskDetail);
            break;
          case 'on_time':
            onTimeTasks.push(taskDetail);
            break;
          case 'late':
            lateTasks.push(taskDetail);
            break;
          case 'no_due_date':
            noDueDateTasks.push(taskDetail);
            break;
        }
      }

      const summary = {
        early: earlyTasks.length,
        onTime: onTimeTasks.length,
        late: lateTasks.length,
        noDueDate: noDueDateTasks.length,
        total: filteredTasks.length,
        score: calculateScore(earlyTasks.length, onTimeTasks.length, noDueDateTasks.length, lateTasks.length),
      };

      return {
        earlyTasks,
        onTimeTasks,
        lateTasks,
        noDueDateTasks,
        summary,
      };
    },
    enabled: !!activeWorkspace?.id && !!userId,
    staleTime: 30000,
  });
};

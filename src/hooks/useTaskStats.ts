import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, isBefore } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';

interface OverdueTask {
  id: string;
  title: string;
  due_date: string;
  list_name?: string;
  priority?: string;
}

interface TaskStats {
  total: number;
  completed: number;
  overdue: number;
  onTrack: number;
  highPriority: number;
  byStatus: { name: string; color: string; count: number }[];
  completionRate: number;
  overdueTasks: OverdueTask[];
}

interface UseTaskStatsOptions {
  type: 'space' | 'folder';
  id?: string;
  startDate?: Date;
  endDate?: Date;
}

export const useTaskStats = ({ type, id, startDate, endDate }: UseTaskStatsOptions) => {
  return useQuery({
    queryKey: ['taskStats', type, id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<TaskStats> => {
      if (!id) {
        return {
          total: 0,
          completed: 0,
          overdue: 0,
          onTrack: 0,
          highPriority: 0,
          byStatus: [],
          completionRate: 0,
          overdueTasks: [],
        };
      }

      // First, get the lists for this space or folder
      let listsQuery = supabase.from('lists').select('id');
      
      if (type === 'space') {
        listsQuery = listsQuery.eq('space_id', id);
      } else {
        listsQuery = listsQuery.eq('folder_id', id);
      }

      const { data: lists, error: listsError } = await listsQuery;
      
      if (listsError) throw listsError;
      
      if (!lists || lists.length === 0) {
        return {
          total: 0,
          completed: 0,
          overdue: 0,
          onTrack: 0,
          highPriority: 0,
          byStatus: [],
          completionRate: 0,
          overdueTasks: [],
        };
      }

      const listIds = lists.map(l => l.id);

      // Get all tasks for these lists with status info
      let tasksQuery = supabase
        .from('tasks')
        .select(`
          id,
          title,
          completed_at,
          due_date,
          priority,
          archived_at,
          status_id,
          parent_id,
          created_at,
          statuses (
            id,
            name,
            color
          ),
          lists (
            name
          )
        `)
        .in('list_id', listIds)
        .is('archived_at', null)
        .is('parent_id', null);

      // Apply date filters if provided
      if (startDate) {
        tasksQuery = tasksQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        tasksQuery = tasksQuery.lte('created_at', endDate.toISOString());
      }

      const { data: tasks, error: tasksError } = await tasksQuery;

      if (tasksError) throw tasksError;

      const today = startOfDay(new Date());

      const total = tasks?.length || 0;
      const completed = tasks?.filter(t => t.completed_at !== null).length || 0;
      
      // Tarefa atrasada: due_date ANTES de hoje (não inclui o dia de hoje)
      const overdueTasks = tasks?.filter(t => {
        if (t.completed_at) return false;
        if (!t.due_date) return false;
        const dueDate = startOfDay(parseLocalDate(t.due_date)!);
        return isBefore(dueDate, today);
      }).map(t => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date!,
        list_name: (t.lists as { name: string } | null)?.name,
        priority: t.priority || undefined,
      })) || [];

      const overdue = overdueTasks.length;

      // No prazo: não concluída e (sem due_date OU due_date >= hoje)
      const onTrack = tasks?.filter(t => {
        if (t.completed_at) return false;
        if (!t.due_date) return true;
        const dueDate = startOfDay(parseLocalDate(t.due_date)!);
        return !isBefore(dueDate, today); // >= hoje
      }).length || 0;

      const highPriority = tasks?.filter(t => 
        !t.completed_at && (t.priority === 'high' || t.priority === 'urgent')
      ).length || 0;

      // Group by status
      const statusMap = new Map<string, { name: string; color: string; count: number }>();
      
      tasks?.forEach(task => {
        const status = task.statuses as { id: string; name: string; color: string | null } | null;
        if (status) {
          const existing = statusMap.get(status.id);
          if (existing) {
            existing.count++;
          } else {
            statusMap.set(status.id, {
              name: status.name,
              color: status.color || '#94a3b8',
              count: 1,
            });
          }
        }
      });

      const byStatus = Array.from(statusMap.values());
      const completionRate = total > 0 ? (completed / total) * 100 : 0;

      return {
        total,
        completed,
        overdue,
        onTrack,
        highPriority,
        byStatus,
        completionRate,
        overdueTasks,
      };
    },
    enabled: !!id,
  });
};

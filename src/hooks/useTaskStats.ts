import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TaskStats {
  total: number;
  completed: number;
  overdue: number;
  onTrack: number;
  highPriority: number;
  byStatus: { name: string; color: string; count: number }[];
  completionRate: number;
}

interface UseTaskStatsOptions {
  type: 'space' | 'folder';
  id?: string;
}

export const useTaskStats = ({ type, id }: UseTaskStatsOptions) => {
  return useQuery({
    queryKey: ['taskStats', type, id],
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
        };
      }

      const listIds = lists.map(l => l.id);

      // Get all tasks for these lists with status info
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          completed_at,
          due_date,
          priority,
          archived_at,
          status_id,
          parent_id,
          statuses (
            id,
            name,
            color
          )
        `)
        .in('list_id', listIds)
        .is('archived_at', null)
        .is('parent_id', null);

      if (tasksError) throw tasksError;

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const total = tasks?.length || 0;
      const completed = tasks?.filter(t => t.completed_at !== null).length || 0;
      
      const overdue = tasks?.filter(t => {
        if (t.completed_at) return false;
        if (!t.due_date) return false;
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < now;
      }).length || 0;

      const onTrack = tasks?.filter(t => {
        if (t.completed_at) return false;
        if (!t.due_date) return true;
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= now;
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
      };
    },
    enabled: !!id,
  });
};

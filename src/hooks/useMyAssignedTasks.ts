import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MyAssignedTask {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  start_date: string | null;
  created_at: string;
  status: {
    id: string;
    name: string;
    color: string;
    category: string | null;
  } | null;
  list: {
    id: string;
    name: string;
  } | null;
}

export const useMyAssignedTasks = () => {
  return useQuery({
    queryKey: ['my-assigned-tasks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get task IDs where user is assigned
      const { data: assignments, error: assignError } = await supabase
        .from('task_assignees')
        .select('task_id')
        .eq('user_id', user.id);

      if (assignError) throw assignError;
      if (!assignments || assignments.length === 0) return [];

      const taskIds = assignments.map(a => a.task_id);

      // Get tasks with status and list info
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          priority,
          due_date,
          start_date,
          created_at,
          completed_at,
          statuses:status_id (
            id,
            name,
            color,
            category
          ),
          lists:list_id (
            id,
            name
          )
        `)
        .in('id', taskIds)
        .is('archived_at', null)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (tasksError) throw tasksError;

      return (tasks || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority as 'low' | 'medium' | 'high' | 'urgent',
        due_date: task.due_date,
        start_date: task.start_date,
        created_at: task.created_at,
        status: task.statuses as any,
        list: task.lists as any,
      })) as MyAssignedTask[];
    },
  });
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskWithAssignees {
  id: string;
  title: string;
  description: string | null;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  list_id: string;
  workspace_id: string;
  parent_id: string | null;
  status_id: string;
  status: {
    id: string;
    name: string;
    color: string | null;
    category: string | null;
  } | null;
  assignees: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }[];
}

export function useTasksWithAssignees(listId?: string) {
  return useQuery({
    queryKey: ['tasks-with-assignees', listId],
    queryFn: async () => {
      if (!listId) return [];

      // Fetch tasks for the list
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          priority,
          due_date,
          start_date,
          completed_at,
          created_at,
          updated_at,
          list_id,
          workspace_id,
          parent_id,
          status_id,
          status:statuses(id, name, color, category)
        `)
        .eq('list_id', listId)
        .is('archived_at', null)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      if (!tasks || tasks.length === 0) return [];

      const taskIds = tasks.map(t => t.id);

      // Fetch all assignees for these tasks
      const { data: taskAssignees, error: assigneesError } = await supabase
        .from('task_assignees')
        .select('task_id, user_id')
        .in('task_id', taskIds);

      if (assigneesError) throw assigneesError;

      // Get unique user IDs
      const userIds = [...new Set(taskAssignees?.map(ta => ta.user_id) || [])];

      // Fetch profiles for these users
      let profiles: { id: string; full_name: string | null; avatar_url: string | null }[] = [];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        if (profilesError) throw profilesError;
        profiles = profilesData || [];
      }

      // Create a map of userId to profile
      const profileMap = new Map(profiles.map(p => [p.id, p]));

      // Create a map of taskId to assignees
      const taskAssigneesMap = new Map<string, typeof profiles>();
      taskAssignees?.forEach(ta => {
        const profile = profileMap.get(ta.user_id);
        if (profile) {
          const existing = taskAssigneesMap.get(ta.task_id) || [];
          existing.push(profile);
          taskAssigneesMap.set(ta.task_id, existing);
        }
      });

      // Combine tasks with assignees
      const tasksWithAssignees: TaskWithAssignees[] = tasks.map(task => ({
        ...task,
        status: task.status as TaskWithAssignees['status'],
        assignees: taskAssigneesMap.get(task.id) || [],
      }));

      return tasksWithAssignees;
    },
    enabled: !!listId,
  });
}

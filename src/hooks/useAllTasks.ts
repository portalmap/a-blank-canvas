import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AllTask {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  workspace_id: string;
  list_id: string;
  parent_id: string | null;
  status: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  assignee: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  list: {
    id: string;
    name: string;
    space_id: string;
    folder_id: string | null;
    space: {
      id: string;
      name: string;
    } | null;
    folder: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export function useAllTasks(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['all-tasks', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
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
          workspace_id,
          list_id,
          parent_id,
          status:statuses(id, name, color),
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url),
          list:lists(
            id,
            name,
            space_id,
            folder_id,
            space:spaces(id, name),
            folder:folders(id, name)
          )
        `)
        .eq('workspace_id', workspaceId)
        .is('archived_at', null)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as AllTask[];
    },
    enabled: !!workspaceId,
  });
}

export function useAllTasksWithAssignees(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['all-tasks-with-assignees', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      // Fetch tasks
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
          workspace_id,
          list_id,
          parent_id,
          status:statuses(id, name, color),
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url),
          list:lists(
            id,
            name,
            space_id,
            folder_id,
            space:spaces(id, name),
            folder:folders(id, name)
          )
        `)
        .eq('workspace_id', workspaceId)
        .is('archived_at', null)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch all assignees for these tasks
      const taskIds = tasks?.map(t => t.id) || [];
      const { data: assignees, error: assigneesError } = await supabase
        .from('task_assignees')
        .select(`
          task_id,
          user_id
        `)
        .in('task_id', taskIds);

      if (assigneesError) throw assigneesError;

      // Fetch profiles for assignees
      const userIds = [...new Set((assignees || []).map(a => a.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, { id: string; full_name: string | null; avatar_url: string | null }>);

      // Map assignees to tasks
      const assigneesByTask = (assignees || []).reduce((acc, a) => {
        if (!acc[a.task_id]) acc[a.task_id] = [];
        const profile = profilesMap[a.user_id];
        if (profile) acc[a.task_id].push(profile);
        return acc;
      }, {} as Record<string, Array<{ id: string; full_name: string | null; avatar_url: string | null }>>);

      return (tasks || []).map(task => ({
        ...task,
        assignees: assigneesByTask[task.id] || [],
      })) as unknown as (AllTask & { assignees: Array<{ id: string; full_name: string | null; avatar_url: string | null }> })[];
    },
    enabled: !!workspaceId,
  });
}

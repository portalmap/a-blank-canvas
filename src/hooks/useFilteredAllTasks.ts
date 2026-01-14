import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AllTask } from './useAllTasks';

export type TaskWithAssignees = AllTask & { 
  assignees: Array<{ id: string; full_name: string | null; avatar_url: string | null }> 
};

export function useFilteredAllTasks(workspaceId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['filtered-all-tasks', workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return [];

      // Check role directly for the specific workspace being queried
      const { data: globalRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasGlobalAdmin = globalRoles?.some(r => 
        ['global_owner', 'owner', 'admin'].includes(r.role)
      ) ?? false;

      let isAdmin = hasGlobalAdmin;

      // If no global admin role, check workspace-specific role
      if (!isAdmin) {
        const { data: membership } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('workspace_id', workspaceId)
          .single();

        isAdmin = membership?.role === 'admin';
      }

      // Admin: fetch all tasks
      // Member: fetch only tasks where they are assigned
      let taskIds: string[] | null = null;

      if (!isAdmin) {
        // Get task IDs where user is assigned
        const { data: assignments, error: assignError } = await supabase
          .from('task_assignees')
          .select('task_id')
          .eq('user_id', user.id);

        if (assignError) throw assignError;
        if (!assignments || assignments.length === 0) return [];

        taskIds = assignments.map(a => a.task_id);
      }

      // Fetch tasks
      let query = supabase
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

      // If not admin, filter by assigned task IDs
      if (taskIds !== null) {
        query = query.in('id', taskIds);
      }

      const { data: tasks, error: tasksError } = await query;

      if (tasksError) throw tasksError;

      // Fetch all assignees for these tasks
      const fetchedTaskIds = tasks?.map(t => t.id) || [];
      if (fetchedTaskIds.length === 0) return [];

      const { data: assignees, error: assigneesError } = await supabase
        .from('task_assignees')
        .select(`
          task_id,
          user_id
        `)
        .in('task_id', fetchedTaskIds);

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
      })) as unknown as TaskWithAssignees[];
    },
    enabled: !!workspaceId && !!user,
  });
}

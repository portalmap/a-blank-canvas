import { supabase } from '@/integrations/supabase/client';

interface TaskInfo {
  id: string;
  workspace_id: string;
  list_id: string;
}

interface ApplyAutomationsResult {
  assigneesAdded: number;
  followersAdded: number;
}

/**
 * Applies all relevant automations (in cascade) when a task is created
 * Hierarchy: Workspace -> Space -> Folder -> List (cumulative)
 */
export const applyAutomationsToTask = async (task: TaskInfo): Promise<ApplyAutomationsResult> => {
  const result: ApplyAutomationsResult = { assigneesAdded: 0, followersAdded: 0 };
  
  try {
    // 1. Get the list hierarchy
    const { data: list } = await supabase
      .from('lists')
      .select('id, space_id, folder_id')
      .eq('id', task.list_id)
      .single();

    if (!list) return result;

    // 2. Get folder and space info if needed
    const folderId: string | null = list.folder_id;
    const spaceId: string | null = list.space_id;

    // 3. Build scope conditions for querying automations
    const scopeIds: string[] = [task.workspace_id];
    if (spaceId) scopeIds.push(spaceId);
    if (folderId) scopeIds.push(folderId);
    scopeIds.push(task.list_id);

    // 4. Fetch all active automations for task_created trigger
    const { data: automations, error } = await supabase
      .from('automations')
      .select('*')
      .eq('trigger', 'on_task_created')
      .eq('enabled', true)
      .eq('workspace_id', task.workspace_id)
      .in('action_type', ['auto_assign_user', 'auto_add_follower']);

    if (error || !automations) {
      console.error('Error fetching automations:', error);
      return result;
    }

    // 5. Filter automations by matching scopes
    const applicableAutomations = automations.filter(automation => {
      // Workspace-level automations (scope_id is null)
      if (!automation.scope_id && automation.scope_type === 'workspace') {
        return true;
      }
      // Other scopes - check if scope_id matches any in hierarchy
      return automation.scope_id && scopeIds.includes(automation.scope_id);
    });

    // 6. Apply each automation
    for (const automation of applicableAutomations) {
      const actionConfig = automation.action_config as Record<string, any> | null;

      if (automation.action_type === 'auto_assign_user') {
        // Support both user_ids (array) and legacy user_id (string)
        const userIds = actionConfig?.user_ids || (actionConfig?.user_id ? [actionConfig.user_id] : []);
        if (!userIds.length) continue;
        
        // Add each assignee with source tracking
        for (const userId of userIds) {
          const { error: assignError } = await supabase
            .from('task_assignees')
            .upsert({
              task_id: task.id,
              user_id: userId,
              source_type: automation.scope_type,
              source_id: automation.scope_id || automation.workspace_id,
            } as any, { onConflict: 'task_id,user_id' });

          if (!assignError) {
            result.assigneesAdded++;
          }
        }
      } else if (automation.action_type === 'remove_all_assignees') {
        // Remove all assignees from task
        await supabase
          .from('task_assignees')
          .delete()
          .eq('task_id', task.id);
      } else if (automation.action_type === 'auto_add_follower') {
        // Support both user_ids (array) and legacy user_id (string)
        const userIds = actionConfig?.user_ids || (actionConfig?.user_id ? [actionConfig.user_id] : []);
        if (!userIds.length) continue;

        // Add each follower with source tracking
        for (const userId of userIds) {
          const { error: followError } = await supabase
            .from('task_followers')
            .upsert({
              task_id: task.id,
              user_id: userId,
              source_type: automation.scope_type,
              source_id: automation.scope_id || automation.workspace_id,
            } as any, { onConflict: 'task_id,user_id' });

          if (!followError) {
            result.followersAdded++;
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error applying automations:', error);
    return result;
  }
};

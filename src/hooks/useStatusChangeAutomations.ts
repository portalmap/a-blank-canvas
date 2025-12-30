import { supabase } from '@/integrations/supabase/client';

interface StatusChangeInfo {
  taskId: string;
  workspaceId: string;
  listId: string;
  oldStatusId: string;
  newStatusId: string;
}

interface AutomationExecutionResult {
  automationsExecuted: number;
  subtasksCreated: number;
  errors: string[];
}

// Helper para registrar atividade de automação
const logAutomationActivity = async (
  taskId: string,
  userId: string,
  activityType: string,
  options: {
    fieldName?: string;
    oldValue?: string | null;
    newValue?: string | null;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> => {
  try {
    await supabase.from('task_activities').insert({
      task_id: taskId,
      user_id: userId,
      activity_type: activityType,
      field_name: options.fieldName || null,
      old_value: options.oldValue || null,
      new_value: options.newValue || null,
      metadata: { ...options.metadata, created_by: 'automation' },
    });
  } catch (error) {
    console.error('Erro ao registrar atividade de automação:', error);
  }
};

/**
 * Executes automations triggered by status changes
 */
export const executeStatusChangeAutomations = async (
  info: StatusChangeInfo
): Promise<AutomationExecutionResult> => {
  const result: AutomationExecutionResult = {
    automationsExecuted: 0,
    subtasksCreated: 0,
    errors: [],
  };

  try {
    // 1. Get the list hierarchy for scope filtering
    const { data: list } = await supabase
      .from('lists')
      .select('id, space_id, folder_id')
      .eq('id', info.listId)
      .single();

    if (!list) return result;

    // 2. Build scope IDs for filtering
    const scopeIds: string[] = [info.workspaceId];
    if (list.space_id) scopeIds.push(list.space_id);
    if (list.folder_id) scopeIds.push(list.folder_id);
    scopeIds.push(info.listId);

    // 3. Fetch automations with 'on_status_changed' trigger
    const { data: automations, error } = await supabase
      .from('automations')
      .select('*')
      .eq('trigger', 'on_status_changed')
      .eq('enabled', true)
      .eq('workspace_id', info.workspaceId);

    if (error || !automations) {
      console.error('Error fetching status change automations:', error);
      return result;
    }

    // 4. Filter automations by matching scopes
    const applicableAutomations = automations.filter((automation) => {
      // Workspace-level automations
      if (!automation.scope_id && automation.scope_type === 'workspace') {
        return true;
      }
      // Other scopes - check if scope_id matches any in hierarchy
      return automation.scope_id && scopeIds.includes(automation.scope_id);
    });

    console.log(`Found ${applicableAutomations.length} applicable automations for status change`);

    // 5. Execute each automation
    for (const automation of applicableAutomations) {
      try {
        const actionConfig = automation.action_config as Record<string, any> | null;

        // Check if automation has status filter conditions
        const triggerConfig = actionConfig?.trigger_config;
        if (triggerConfig) {
          const { from_status_id, to_status_id } = triggerConfig;
          
          // Skip if from_status doesn't match (and it's specified)
          if (from_status_id && from_status_id !== info.oldStatusId) {
            continue;
          }
          // Skip if to_status doesn't match (and it's specified)
          if (to_status_id && to_status_id !== info.newStatusId) {
            continue;
          }
        }

        const automationName = automation.description || `Automação ${automation.id.slice(0, 8)}`;
        
        // Execute action based on type
        await executeAction(automation.action_type, info, actionConfig, automationName);
        result.automationsExecuted++;

        if (automation.action_type === 'create_subtask') {
          result.subtasksCreated++;
        }
      } catch (actionError) {
        console.error(`Error executing automation ${automation.id}:`, actionError);
        result.errors.push(`Automation ${automation.id}: ${actionError}`);
      }
    }

    return result;
  } catch (error) {
    console.error('Error in executeStatusChangeAutomations:', error);
    result.errors.push(String(error));
    return result;
  }
};

/**
 * Execute a specific automation action
 */
const executeAction = async (
  actionType: string,
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  switch (actionType) {
    case 'create_subtask':
      await executeCreateSubtask(info, config, automationName);
      break;

    case 'set_priority':
      await executeSetPriority(info, config, automationName);
      break;

    case 'add_assignee':
    case 'auto_assign_user':
      await executeAddAssignee(info, config, automationName);
      break;

    case 'archive_task':
      await executeArchiveTask(info, automationName);
      break;

    case 'set_due_date':
      await executeSetDueDate(info, config, automationName);
      break;

    default:
      console.log(`Action type '${actionType}' not implemented for status change`);
  }
};

/**
 * Create a subtask for the parent task
 */
const executeCreateSubtask = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get the default status for the workspace
  const { data: defaultStatus } = await supabase
    .from('statuses')
    .select('id')
    .eq('workspace_id', info.workspaceId)
    .eq('is_default', true)
    .single();

  const statusId = defaultStatus?.id;
  
  if (!statusId) {
    // Fallback: get first status
    const { data: firstStatus } = await supabase
      .from('statuses')
      .select('id')
      .eq('workspace_id', info.workspaceId)
      .order('order_index', { ascending: true })
      .limit(1)
      .single();

    if (!firstStatus) throw new Error('No status found for subtask');
    
    await createSubtaskWithActivity(info, config, user.id, firstStatus.id, automationName);
  } else {
    await createSubtaskWithActivity(info, config, user.id, statusId, automationName);
  }
};

const createSubtaskWithActivity = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  userId: string,
  statusId: string,
  automationName: string
): Promise<void> => {
  const subtaskTitle = config?.title || config?.subtask_title || 'Subtarefa automática';
  const subtaskDescription = config?.description || null;

  const { data: subtask, error } = await supabase.from('tasks').insert({
    workspace_id: info.workspaceId,
    list_id: info.listId,
    parent_id: info.taskId,
    status_id: statusId,
    title: subtaskTitle,
    description: subtaskDescription,
    priority: 'medium',
    created_by_user_id: userId,
  }).select('id').single();

  if (error) throw error;
  
  // Registrar atividade
  await logAutomationActivity(info.taskId, userId, 'subtask.created', {
    metadata: {
      subtask_id: subtask?.id,
      subtask_title: subtaskTitle,
      automation_name: automationName,
    },
  });
  
  console.log(`Subtask "${subtaskTitle}" created for task ${info.taskId}`);
};

/**
 * Set priority of the task
 */
const executeSetPriority = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Buscar prioridade atual
  const { data: task } = await supabase
    .from('tasks')
    .select('priority')
    .eq('id', info.taskId)
    .single();

  const oldPriority = task?.priority || 'medium';
  const newPriority = config?.priority || 'medium';
  
  const { error } = await supabase
    .from('tasks')
    .update({ priority: newPriority })
    .eq('id', info.taskId);

  if (error) throw error;
  
  // Registrar atividade
  await logAutomationActivity(info.taskId, user.id, 'priority.changed', {
    oldValue: oldPriority,
    newValue: newPriority,
    metadata: { automation_name: automationName },
  });
  
  console.log(`Priority set to "${newPriority}" for task ${info.taskId}`);
};

/**
 * Add an assignee to the task
 */
const executeAddAssignee = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const userId = config?.user_id;
  if (!userId) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('task_assignees')
    .upsert(
      { task_id: info.taskId, user_id: userId },
      { onConflict: 'task_id,user_id' }
    );

  if (error) throw error;
  
  // Buscar nome do usuário adicionado
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single();

  // Registrar atividade
  await logAutomationActivity(info.taskId, user.id, 'assignee.added', {
    newValue: profile?.full_name || userId,
    metadata: { 
      assignee_id: userId,
      automation_name: automationName,
    },
  });
  
  console.log(`Assignee ${userId} added to task ${info.taskId}`);
};

/**
 * Archive the task
 */
const executeArchiveTask = async (
  info: StatusChangeInfo,
  automationName: string
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('tasks')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', info.taskId);

  if (error) throw error;
  
  // Registrar atividade
  await logAutomationActivity(info.taskId, user.id, 'task.archived', {
    metadata: { automation_name: automationName },
  });
  
  console.log(`Task ${info.taskId} archived`);
};

/**
 * Set due date for the task
 */
const executeSetDueDate = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Buscar data atual
  const { data: task } = await supabase
    .from('tasks')
    .select('due_date')
    .eq('id', info.taskId)
    .single();

  const oldDueDate = task?.due_date;
  
  let dueDate: string | null = null;

  if (config?.days_from_now) {
    const date = new Date();
    date.setDate(date.getDate() + parseInt(config.days_from_now));
    dueDate = date.toISOString().split('T')[0];
  } else if (config?.due_date) {
    dueDate = config.due_date;
  }

  if (!dueDate) return;

  const { error } = await supabase
    .from('tasks')
    .update({ due_date: dueDate })
    .eq('id', info.taskId);

  if (error) throw error;
  
  // Registrar atividade
  await logAutomationActivity(info.taskId, user.id, 'due_date.changed', {
    oldValue: oldDueDate || null,
    newValue: dueDate,
    metadata: { automation_name: automationName },
  });
  
  console.log(`Due date set to ${dueDate} for task ${info.taskId}`);
};

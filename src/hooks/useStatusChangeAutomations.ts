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

interface AutomationCondition {
  id: string;
  field: 'tag' | 'priority' | 'assignee' | 'due_date' | 'has_subtasks';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_set' | 'is_not_set' | 'any_of' | 'none_of';
  value: string | string[];
  logic: 'AND' | 'OR';
}

interface TaskData {
  id: string;
  priority: string;
  due_date: string | null;
  tags: string[];
  assignees: string[];
  hasSubtasks: boolean;
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
 * Evaluate a single condition against task data
 */
const evaluateSingleCondition = (condition: AutomationCondition, taskData: TaskData): boolean => {
  const values = Array.isArray(condition.value) ? condition.value : [condition.value].filter(Boolean);

  switch (condition.field) {
    case 'priority':
      switch (condition.operator) {
        case 'equals':
          return values.includes(taskData.priority);
        case 'not_equals':
          return !values.includes(taskData.priority);
        case 'any_of':
          return values.some(v => v === taskData.priority);
        default:
          return true;
      }

    case 'tag':
      switch (condition.operator) {
        case 'contains':
          return values.some(v => taskData.tags.includes(v));
        case 'not_contains':
          return !values.some(v => taskData.tags.includes(v));
        case 'any_of':
          return values.some(v => taskData.tags.includes(v));
        case 'none_of':
          return !values.some(v => taskData.tags.includes(v));
        default:
          return true;
      }

    case 'assignee':
      switch (condition.operator) {
        case 'is_set':
          return taskData.assignees.length > 0;
        case 'is_not_set':
          return taskData.assignees.length === 0;
        case 'contains':
          return values.some(v => taskData.assignees.includes(v));
        case 'not_contains':
          return !values.some(v => taskData.assignees.includes(v));
        default:
          return true;
      }

    case 'due_date':
      switch (condition.operator) {
        case 'is_set':
          return !!taskData.due_date;
        case 'is_not_set':
          return !taskData.due_date;
        default:
          return true;
      }

    case 'has_subtasks':
      switch (condition.operator) {
        case 'is_set':
          return taskData.hasSubtasks;
        case 'is_not_set':
          return !taskData.hasSubtasks;
        default:
          return true;
      }

    default:
      return true;
  }
};

/**
 * Evaluate all conditions with AND/OR logic
 */
const evaluateConditions = (conditions: AutomationCondition[], taskData: TaskData): boolean => {
  if (!conditions || conditions.length === 0) return true;

  let result = evaluateSingleCondition(conditions[0], taskData);

  for (let i = 1; i < conditions.length; i++) {
    const prevCondition = conditions[i - 1];
    const currentCondition = conditions[i];
    const currentResult = evaluateSingleCondition(currentCondition, taskData);

    if (prevCondition.logic === 'AND') {
      result = result && currentResult;
    } else {
      result = result || currentResult;
    }
  }

  return result;
};

/**
 * Fetch task data needed for condition evaluation
 */
const fetchTaskData = async (taskId: string): Promise<TaskData | null> => {
  try {
    // Fetch task basic info
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, priority, due_date')
      .eq('id', taskId)
      .single();

    if (taskError || !task) return null;

    // Fetch tags
    const { data: tagRelations } = await supabase
      .from('task_tag_relations')
      .select('tag:task_tags(name)')
      .eq('task_id', taskId);

    const tags = tagRelations?.map((tr: any) => tr.tag?.name).filter(Boolean) || [];

    // Fetch assignees
    const { data: assigneeData } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', taskId);

    const assignees = assigneeData?.map(a => a.user_id) || [];

    // Check for subtasks
    const { count: subtaskCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', taskId);

    return {
      id: task.id,
      priority: task.priority,
      due_date: task.due_date,
      tags,
      assignees,
      hasSubtasks: (subtaskCount || 0) > 0,
    };
  } catch (error) {
    console.error('Error fetching task data for conditions:', error);
    return null;
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

    // 5. Fetch task data once for condition evaluation
    let taskData: TaskData | null = null;

    // 6. Execute each automation
    for (const automation of applicableAutomations) {
      try {
        const actionConfig = automation.action_config as Record<string, any> | null;

        // Check if automation has status filter conditions (multi-select support)
        const triggerConfig = actionConfig?.trigger_config;
        if (triggerConfig) {
          // Support both legacy single ID and new array format
          const fromStatusIds: string[] = triggerConfig.from_status_ids || 
            (triggerConfig.from_status_id ? [triggerConfig.from_status_id] : []);
          const toStatusIds: string[] = triggerConfig.to_status_ids || 
            (triggerConfig.to_status_id ? [triggerConfig.to_status_id] : []);
          
          // Skip if from_status doesn't match (and it's specified)
          if (fromStatusIds.length > 0 && !fromStatusIds.includes(info.oldStatusId)) {
            continue;
          }
          // Skip if to_status doesn't match (and it's specified)
          if (toStatusIds.length > 0 && !toStatusIds.includes(info.newStatusId)) {
            continue;
          }
        }

        // Check conditions
        const conditions = actionConfig?.conditions as AutomationCondition[] | undefined;
        if (conditions && conditions.length > 0) {
          // Fetch task data if not already fetched
          if (!taskData) {
            taskData = await fetchTaskData(info.taskId);
          }
          
          if (!taskData) {
            console.error('Could not fetch task data for condition evaluation');
            continue;
          }

          const conditionsMet = evaluateConditions(conditions, taskData);
          if (!conditionsMet) {
            console.log(`Conditions not met for automation ${automation.id}`);
            continue;
          }
        }

        const automationName = automation.description || `Automação ${automation.id.slice(0, 8)}`;
        
        // Check if automation has multiple actions
        const actionsArray = actionConfig?.actions as Array<{ type: string; config: Record<string, any> }> | undefined;
        
        if (actionsArray && actionsArray.length > 0) {
          // Execute multiple actions sequentially
          for (const action of actionsArray) {
            await executeAction(action.type, info, action.config, automationName);
          }
        } else {
          // Execute single action (legacy support)
          await executeAction(automation.action_type, info, actionConfig, automationName);
        }
        
        result.automationsExecuted++;

        if (automation.action_type === 'create_subtask' || 
            actionsArray?.some(a => a.type === 'create_subtask')) {
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

    case 'set_status':
      await executeSetStatus(info, config, automationName);
      break;

    case 'add_tag':
      await executeAddTag(info, config, automationName);
      break;

    case 'remove_tag':
      await executeRemoveTag(info, config, automationName);
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
 * Add assignees to the task (supports multiple users)
 */
const executeAddAssignee = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  // Support both user_ids (array) and legacy user_id (string)
  const userIds = config?.user_ids || (config?.user_id ? [config.user_id] : []);
  if (!userIds.length) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  for (const userId of userIds) {
    const { error } = await supabase
      .from('task_assignees')
      .upsert(
        { task_id: info.taskId, user_id: userId },
        { onConflict: 'task_id,user_id' }
      );

    if (error) {
      console.error('Error adding assignee:', error);
      continue;
    }
    
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
  }
  
  console.log(`${userIds.length} assignee(s) added to task ${info.taskId}`);
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

/**
 * Set status of the task
 */
const executeSetStatus = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const statusId = config?.status_id;
  if (!statusId) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('tasks')
    .update({ status_id: statusId })
    .eq('id', info.taskId);

  if (error) throw error;
  
  console.log(`Status changed to ${statusId} for task ${info.taskId} via automation`);
};

/**
 * Add a tag to the task
 */
const executeAddTag = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const tagName = config?.tag_name;
  if (!tagName) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Find or create tag
  let { data: tag } = await supabase
    .from('task_tags')
    .select('id')
    .eq('workspace_id', info.workspaceId)
    .eq('name', tagName)
    .single();

  if (!tag) {
    const { data: newTag, error: createError } = await supabase
      .from('task_tags')
      .insert({ workspace_id: info.workspaceId, name: tagName })
      .select('id')
      .single();

    if (createError) throw createError;
    tag = newTag;
  }

  if (!tag) return;

  // Add tag relation
  await supabase
    .from('task_tag_relations')
    .upsert(
      { task_id: info.taskId, tag_id: tag.id },
      { onConflict: 'task_id,tag_id' }
    );

  console.log(`Tag "${tagName}" added to task ${info.taskId}`);
};

/**
 * Remove a tag from the task
 */
const executeRemoveTag = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  const tagName = config?.tag_name;
  if (!tagName) return;

  // Find tag
  const { data: tag } = await supabase
    .from('task_tags')
    .select('id')
    .eq('workspace_id', info.workspaceId)
    .eq('name', tagName)
    .single();

  if (!tag) return;

  // Remove tag relation
  await supabase
    .from('task_tag_relations')
    .delete()
    .eq('task_id', info.taskId)
    .eq('tag_id', tag.id);

  console.log(`Tag "${tagName}" removed from task ${info.taskId}`);
};

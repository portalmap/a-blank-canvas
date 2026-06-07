import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper function to duplicate a task with all its relations
async function duplicateTaskWithRelations(
  originalTaskId: string,
  newListId: string,
  workspaceId: string,
  statusId: string,
  userId: string,
  newParentId?: string | null
): Promise<string> {
  // Fetch original task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', originalTaskId)
    .single();

  if (taskError || !task) {
    throw new Error('Failed to fetch original task');
  }

  // Create task copy
  const { data: newTask, error: newTaskError } = await supabase
    .from('tasks')
    .insert({
      title: task.title,
      description: task.description,
      priority: task.priority,
      start_date: task.start_date,
      due_date: task.due_date,
      estimated_time: task.estimated_time,
      is_milestone: task.is_milestone,
      cover_image_url: task.cover_image_url,
      list_id: newListId,
      workspace_id: workspaceId,
      status_id: statusId,
      parent_id: newParentId || null,
      created_by_user_id: userId,
    })
    .select()
    .single();

  if (newTaskError || !newTask) {
    throw new Error('Failed to create task copy');
  }

  // Copy assignees
  const { data: assignees } = await supabase
    .from('task_assignees')
    .select('user_id')
    .eq('task_id', originalTaskId);

  if (assignees && assignees.length > 0) {
    await supabase.from('task_assignees').insert(
      assignees.map(a => ({ task_id: newTask.id, user_id: a.user_id }))
    );
  }

  // Copy tag relations (tags are workspace-level, so they should still exist)
  const { data: tagRelations } = await supabase
    .from('task_tag_relations')
    .select('tag_id')
    .eq('task_id', originalTaskId);

  if (tagRelations && tagRelations.length > 0) {
    await supabase.from('task_tag_relations').insert(
      tagRelations.map(t => ({ task_id: newTask.id, tag_id: t.tag_id }))
    );
  }

  // Copy checklists and items
  const { data: checklists } = await supabase
    .from('task_checklists')
    .select('*, items:task_checklist_items(*)')
    .eq('task_id', originalTaskId);

  for (const checklist of checklists || []) {
    const { data: newChecklist } = await supabase
      .from('task_checklists')
      .insert({
        task_id: newTask.id,
        title: checklist.title,
        order_index: checklist.order_index,
      })
      .select()
      .single();

    if (newChecklist && checklist.items && checklist.items.length > 0) {
      await supabase.from('task_checklist_items').insert(
        checklist.items.map((item: any) => ({
          checklist_id: newChecklist.id,
          content: item.content,
          is_completed: false, // Reset to not completed
          order_index: item.order_index,
          assignee_id: item.assignee_id,
          due_date: item.due_date,
        }))
      );
    }
  }

  // Copy subtasks recursively
  const { data: subtasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('parent_id', originalTaskId);

  for (const subtask of subtasks || []) {
    await duplicateTaskWithRelations(
      subtask.id,
      newListId,
      workspaceId,
      statusId,
      userId,
      newTask.id
    );
  }

  return newTask.id;
}

// Helper to get default status for a workspace
async function getDefaultStatus(workspaceId: string): Promise<string> {
  const { data: statuses } = await supabase
    .from('statuses')
    .select('id, is_default')
    .eq('workspace_id', workspaceId)
    .order('is_default', { ascending: false })
    .limit(1);

  if (!statuses || statuses.length === 0) {
    throw new Error('No status found for workspace');
  }

  return statuses[0].id;
}

// Hook to duplicate a list
export const useDuplicateList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listId,
      targetSpaceIds,
      targetFolderId,
    }: {
      listId: string;
      targetSpaceIds: string[];
      targetFolderId?: string | null;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Fetch original list
      const { data: originalList, error: listError } = await supabase
        .from('lists')
        .select('*')
        .eq('id', listId)
        .single();

      if (listError || !originalList) {
        throw new Error('Failed to fetch original list');
      }

      // Fetch tasks from original list
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('list_id', listId)
        .is('parent_id', null); // Only top-level tasks

      const createdListIds: string[] = [];

      // For each target space, create a copy
      for (const spaceId of targetSpaceIds) {
        // Get workspace from space
        const { data: space } = await supabase
          .from('spaces')
          .select('workspace_id')
          .eq('id', spaceId)
          .single();

        if (!space) continue;

        const workspaceId = space.workspace_id;
        const defaultStatusId = await getDefaultStatus(workspaceId);

        // Create new list
        const { data: newList, error: newListError } = await supabase
          .from('lists')
          .insert({
            name: originalList.name,
            description: originalList.description,
            default_view: originalList.default_view,
            workspace_id: workspaceId,
            space_id: spaceId,
            folder_id: targetSpaceIds.length === 1 ? targetFolderId : null,
          })
          .select()
          .single();

        if (newListError || !newList) {
          console.error('Failed to create list copy:', newListError);
          continue;
        }

        createdListIds.push(newList.id);

        // Duplicate all tasks
        for (const task of tasks || []) {
          await duplicateTaskWithRelations(
            task.id,
            newList.id,
            workspaceId,
            defaultStatusId,
            user.id
          );
        }
      }

      return createdListIds;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Lista duplicada para ${variables.targetSpaceIds.length} space(s)!`);
    },
    onError: (error) => {
      console.error('Error duplicating list:', error);
      toast.error('Erro ao duplicar lista');
    },
  });
};

// Hook to duplicate a folder
export const useDuplicateFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderId,
      targetSpaceIds,
    }: {
      folderId: string;
      targetSpaceIds: string[];
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Fetch original folder
      const { data: originalFolder, error: folderError } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .single();

      if (folderError || !originalFolder) {
        throw new Error('Failed to fetch original folder');
      }

      // Fetch lists from original folder
      const { data: lists } = await supabase
        .from('lists')
        .select('*')
        .eq('folder_id', folderId);

      const createdFolderIds: string[] = [];

      // For each target space
      for (const spaceId of targetSpaceIds) {
        // Get workspace from space
        const { data: space } = await supabase
          .from('spaces')
          .select('workspace_id')
          .eq('id', spaceId)
          .single();

        if (!space) continue;

        const workspaceId = space.workspace_id;
        const defaultStatusId = await getDefaultStatus(workspaceId);

        // Create new folder
        const { data: newFolder, error: newFolderError } = await supabase
          .from('folders')
          .insert({
            name: originalFolder.name,
            description: originalFolder.description,
            space_id: spaceId,
          })
          .select()
          .single();

        if (newFolderError || !newFolder) {
          console.error('Failed to create folder copy:', newFolderError);
          continue;
        }

        createdFolderIds.push(newFolder.id);

        // Duplicate all lists in the folder
        for (const list of lists || []) {
          // Fetch tasks from list
          const { data: tasks } = await supabase
            .from('tasks')
            .select('id')
            .eq('list_id', list.id)
            .is('parent_id', null);

          // Create new list in new folder
          const { data: newList } = await supabase
            .from('lists')
            .insert({
              name: list.name,
              description: list.description,
              default_view: list.default_view,
              workspace_id: workspaceId,
              space_id: spaceId,
              folder_id: newFolder.id,
            })
            .select()
            .single();

          if (!newList) continue;

          // Duplicate all tasks
          for (const task of tasks || []) {
            await duplicateTaskWithRelations(
              task.id,
              newList.id,
              workspaceId,
              defaultStatusId,
              user.id
            );
          }
        }
      }

      return createdFolderIds;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Pasta duplicada para ${variables.targetSpaceIds.length} space(s)!`);
    },
    onError: (error) => {
      console.error('Error duplicating folder:', error);
      toast.error('Erro ao duplicar pasta');
    },
  });
};

// Hook to duplicate a single task
export const useDuplicateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      targetListId,
    }: {
      taskId: string;
      targetListId: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get list info for workspace
      const { data: list } = await supabase
        .from('lists')
        .select('workspace_id')
        .eq('id', targetListId)
        .single();

      if (!list) throw new Error('Target list not found');

      const defaultStatusId = await getDefaultStatus(list.workspace_id);

      const newTaskId = await duplicateTaskWithRelations(
        taskId,
        targetListId,
        list.workspace_id,
        defaultStatusId,
        user.id
      );

      return newTaskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      toast.success('Tarefa duplicada com sucesso!');
    },
    onError: (error) => {
      console.error('Error duplicating task:', error);
      toast.error('Erro ao duplicar tarefa');
    },
  });
};

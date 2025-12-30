import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      taskIds,
      statusId,
    }: {
      taskIds: string[];
      statusId: string;
    }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status_id: statusId, updated_at: new Date().toISOString() })
        .in("id", taskIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-with-assignees"] });
      toast({ title: `${variables.taskIds.length} tarefa(s) atualizada(s)` });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar tarefas", variant: "destructive" });
    },
  });
}

export function useBulkUpdatePriority() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      taskIds,
      priority,
    }: {
      taskIds: string[];
      priority: "low" | "medium" | "high" | "urgent";
    }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ priority, updated_at: new Date().toISOString() })
        .in("id", taskIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-with-assignees"] });
      toast({ title: `${variables.taskIds.length} tarefa(s) atualizada(s)` });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar prioridade", variant: "destructive" });
    },
  });
}

export function useBulkUpdateDueDate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      taskIds,
      dueDate,
    }: {
      taskIds: string[];
      dueDate: string | null;
    }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ due_date: dueDate, updated_at: new Date().toISOString() })
        .in("id", taskIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-with-assignees"] });
      toast({ title: `${variables.taskIds.length} tarefa(s) atualizada(s)` });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar data", variant: "destructive" });
    },
  });
}

export function useBulkAssignTasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      taskIds,
      assigneeIds,
    }: {
      taskIds: string[];
      assigneeIds: string[];
    }) => {
      // For each task, add the assignees
      for (const taskId of taskIds) {
        for (const assigneeId of assigneeIds) {
          await supabase
            .from("task_assignees")
            .upsert(
              { task_id: taskId, user_id: assigneeId },
              { onConflict: "task_id,user_id" }
            );
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-with-assignees"] });
      queryClient.invalidateQueries({ queryKey: ["task-assignees"] });
      toast({ title: `Responsáveis adicionados a ${variables.taskIds.length} tarefa(s)` });
    },
    onError: () => {
      toast({ title: "Erro ao atribuir responsáveis", variant: "destructive" });
    },
  });
}

export function useBulkAddTags() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      taskIds,
      tagIds,
    }: {
      taskIds: string[];
      tagIds: string[];
    }) => {
      for (const taskId of taskIds) {
        for (const tagId of tagIds) {
          await supabase
            .from("task_tag_relations")
            .upsert(
              { task_id: taskId, tag_id: tagId },
              { onConflict: "task_id,tag_id" }
            );
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-tag-relations"] });
      toast({ title: `Etiquetas adicionadas a ${variables.taskIds.length} tarefa(s)` });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar etiquetas", variant: "destructive" });
    },
  });
}

export function useBulkMoveTasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      taskIds,
      listId,
      workspaceId,
    }: {
      taskIds: string[];
      listId: string;
      workspaceId: string;
    }) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          list_id: listId,
          workspace_id: workspaceId,
          updated_at: new Date().toISOString(),
        })
        .in("id", taskIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-with-assignees"] });
      toast({ title: `${variables.taskIds.length} tarefa(s) movida(s)` });
    },
    onError: () => {
      toast({ title: "Erro ao mover tarefas", variant: "destructive" });
    },
  });
}

export function useBulkCopyTasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      taskIds,
      listId,
      workspaceId,
      statusId,
      userId,
    }: {
      taskIds: string[];
      listId: string;
      workspaceId: string;
      statusId: string;
      userId: string;
    }) => {
      // Get original tasks
      const { data: originalTasks, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds);

      if (fetchError) throw fetchError;

      // Create copies
      for (const task of originalTasks || []) {
        await supabase.from("tasks").insert({
          title: `${task.title} (cópia)`,
          description: task.description,
          priority: task.priority,
          due_date: task.due_date,
          start_date: task.start_date,
          list_id: listId,
          workspace_id: workspaceId,
          status_id: statusId,
          created_by_user_id: userId,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-with-assignees"] });
      toast({ title: `${variables.taskIds.length} tarefa(s) copiada(s)` });
    },
    onError: () => {
      toast({ title: "Erro ao copiar tarefas", variant: "destructive" });
    },
  });
}

export function useBulkArchiveTasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ taskIds }: { taskIds: string[] }) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in("id", taskIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-with-assignees"] });
      toast({ title: `${variables.taskIds.length} tarefa(s) arquivada(s)` });
    },
    onError: () => {
      toast({ title: "Erro ao arquivar tarefas", variant: "destructive" });
    },
  });
}

export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ taskIds }: { taskIds: string[] }) => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .in("id", taskIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-with-assignees"] });
      toast({ title: `${variables.taskIds.length} tarefa(s) excluída(s)` });
    },
    onError: () => {
      toast({ title: "Erro ao excluir tarefas", variant: "destructive" });
    },
  });
}

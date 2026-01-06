import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TaskTag {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface TaskTagRelation {
  id: string;
  task_id: string;
  tag_id: string;
  created_at: string;
  tag?: TaskTag;
}

export function useTaskTags(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["task-tags", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("task_tags")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");

      if (error) throw error;
      return data as TaskTag[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateTaskTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      name,
      color,
    }: {
      workspaceId: string;
      name: string;
      color?: string;
    }) => {
      const { data, error } = await supabase
        .from("task_tags")
        .insert({
          workspace_id: workspaceId,
          name,
          color: color || "#6366f1",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["task-tags", variables.workspaceId],
      });
      toast({ title: "Etiqueta criada com sucesso" });
    },
    onError: () => {
      toast({
        title: "Erro ao criar etiqueta",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTaskTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      tagId,
      workspaceId,
      name,
      color,
    }: {
      tagId: string;
      workspaceId: string;
      name: string;
      color?: string;
    }) => {
      const { data, error } = await supabase
        .from("task_tags")
        .update({
          name,
          color: color || "#6366f1",
        })
        .eq("id", tagId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["task-tags", variables.workspaceId],
      });
      toast({ title: "Etiqueta atualizada com sucesso" });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar etiqueta",
        variant: "destructive",
      });
    },
  });
}

export function useTagUsageCount(tagId: string | undefined) {
  return useQuery({
    queryKey: ["tag-usage-count", tagId],
    queryFn: async () => {
      if (!tagId) return 0;

      const { count, error } = await supabase
        .from("task_tag_relations")
        .select("*", { count: "exact", head: true })
        .eq("tag_id", tagId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!tagId,
  });
}

export function useDeleteTaskTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      tagId,
      workspaceId,
    }: {
      tagId: string;
      workspaceId: string;
    }) => {
      const { error } = await supabase
        .from("task_tags")
        .delete()
        .eq("id", tagId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["task-tags", variables.workspaceId],
      });
      toast({ title: "Etiqueta excluída com sucesso" });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir etiqueta",
        variant: "destructive",
      });
    },
  });
}

export function useTaskTagRelations(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-tag-relations", taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from("task_tag_relations")
        .select(`
          *,
          tag:task_tags(*)
        `)
        .eq("task_id", taskId);

      if (error) throw error;
      return data as (TaskTagRelation & { tag: TaskTag })[];
    },
    enabled: !!taskId,
  });
}

export function useAddTaskTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      tagId,
    }: {
      taskId: string;
      tagId: string;
    }) => {
      const { data, error } = await supabase
        .from("task_tag_relations")
        .insert({
          task_id: taskId,
          tag_id: tagId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["task-tag-relations", variables.taskId],
      });
    },
  });
}

export function useRemoveTaskTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      tagId,
    }: {
      taskId: string;
      tagId: string;
    }) => {
      const { error } = await supabase
        .from("task_tag_relations")
        .delete()
        .eq("task_id", taskId)
        .eq("tag_id", tagId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["task-tag-relations", variables.taskId],
      });
    },
  });
}

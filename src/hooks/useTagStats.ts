import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TagStat {
  id: string;
  name: string;
  color: string | null;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

export function useTagStats(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["tag-stats", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      // Get all tags for the workspace
      const { data: tags, error: tagsError } = await supabase
        .from("task_tags")
        .select("id, name, color")
        .eq("workspace_id", workspaceId);

      if (tagsError) throw tagsError;

      // Get tag relations with task completion status
      const { data: relations, error: relationsError } = await supabase
        .from("task_tag_relations")
        .select(`
          tag_id,
          task:tasks(id, completed_at)
        `)
        .in("tag_id", tags?.map(t => t.id) || []);

      if (relationsError) throw relationsError;

      // Calculate stats for each tag
      const stats: TagStat[] = tags?.map(tag => {
        const tagRelations = relations?.filter(r => r.tag_id === tag.id) || [];
        const totalTasks = tagRelations.length;
        const completedTasks = tagRelations.filter(r => r.task?.completed_at).length;
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        return {
          id: tag.id,
          name: tag.name,
          color: tag.color,
          totalTasks,
          completedTasks,
          completionRate,
        };
      }) || [];

      return stats.sort((a, b) => b.totalTasks - a.totalTasks);
    },
    enabled: !!workspaceId,
  });
}

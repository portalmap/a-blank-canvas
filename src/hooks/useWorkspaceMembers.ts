import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkspaceMember {
  id: string;
  user_id: string;
  workspace_id: string;
  role: string;
  created_at: string;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useWorkspaceMembers = (workspaceId?: string) => {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          id,
          user_id,
          workspace_id,
          role,
          created_at,
          profile:profiles!workspace_members_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      return (data || []) as unknown as WorkspaceMember[];
    },
    enabled: !!workspaceId,
  });
};

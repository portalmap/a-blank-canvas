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

      // Buscar membros do workspace
      const { data: members, error: membersError } = await supabase
        .from('workspace_members')
        .select('id, user_id, workspace_id, role, created_at')
        .eq('workspace_id', workspaceId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      // Buscar profiles dos membros
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combinar os dados
      return members.map(member => ({
        ...member,
        profile: profiles?.find(p => p.id === member.user_id) || null,
      })) as WorkspaceMember[];
    },
    enabled: !!workspaceId,
  });
};

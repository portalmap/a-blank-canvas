import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTeams = (workspaceId: string) => {
  return useQuery({
    queryKey: ['teams', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, team_members(count)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

export const useTeamMembers = (teamId: string) => {
  return useQuery({
    queryKey: ['team_members', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*, user_id')
        .eq('team_id', teamId);

      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
};

export const useCreateTeam = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { data: team, error } = await supabase
        .from('teams')
        .insert({
          workspace_id: workspaceId,
          name: data.name,
          description: data.description,
        })
        .select()
        .single();

      if (error) throw error;
      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', workspaceId] });
      toast.success('Equipe criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar equipe');
      console.error(error);
    },
  });
};

export const useAddTeamMember = (teamId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { user_id: string; role: 'leader' | 'member' }) => {
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: data.user_id,
          role: data.role,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members', teamId] });
      toast.success('Membro adicionado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar membro');
      console.error(error);
    },
  });
};
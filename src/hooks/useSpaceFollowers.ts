import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SpaceFollower {
  id: string;
  space_id: string;
  user_id: string;
  created_at: string;
  user?: { full_name: string; avatar_url?: string };
}

export const useSpaceFollowers = (spaceId?: string) => {
  return useQuery({
    queryKey: ['space-followers', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];
      const { data, error } = await supabase
        .from('space_followers')
        .select('*')
        .eq('space_id', spaceId);
      if (error) throw error;
      if (!data?.length) return [];
      const userIds = data.map(f => f.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      return data.map(f => ({
        ...f,
        user: profiles?.find(p => p.id === f.user_id),
      })) as SpaceFollower[];
    },
    enabled: !!spaceId,
  });
};

export const useAddSpaceFollower = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ spaceId, userId }: { spaceId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('space_followers')
        .insert({ space_id: spaceId, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['space-followers', data.space_id] });
      toast.success('Seguidor adicionado ao Space!');
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('Este usuário já é seguidor deste Space');
      } else {
        toast.error('Erro ao adicionar seguidor');
      }
    },
  });
};

export const useRemoveSpaceFollower = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ spaceId, userId }: { spaceId: string; userId: string }) => {
      const { error } = await supabase
        .from('space_followers')
        .delete()
        .eq('space_id', spaceId)
        .eq('user_id', userId);
      if (error) throw error;
      return { spaceId, userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['space-followers', data.spaceId] });
      queryClient.invalidateQueries({ queryKey: ['task-followers'] });
      toast.success('Seguidor removido do Space!');
    },
    onError: () => {
      toast.error('Erro ao remover seguidor');
    },
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ListFollower {
  id: string;
  list_id: string;
  user_id: string;
  created_at: string;
  user?: { full_name: string; avatar_url?: string };
}

export const useListFollowers = (listId?: string) => {
  return useQuery({
    queryKey: ['list-followers', listId],
    queryFn: async () => {
      if (!listId) return [];
      const { data, error } = await supabase
        .from('list_followers')
        .select('*')
        .eq('list_id', listId);
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
      })) as ListFollower[];
    },
    enabled: !!listId,
  });
};

export const useAddListFollower = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, userId }: { listId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('list_followers')
        .insert({ list_id: listId, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['list-followers', data.list_id] });
      toast.success('Seguidor adicionado à Lista!');
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('Este usuário já é seguidor desta Lista');
      } else {
        toast.error('Erro ao adicionar seguidor');
      }
    },
  });
};

export const useRemoveListFollower = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, userId }: { listId: string; userId: string }) => {
      const { error } = await supabase
        .from('list_followers')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', userId);
      if (error) throw error;
      return { listId, userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['list-followers', data.listId] });
      queryClient.invalidateQueries({ queryKey: ['task-followers'] });
      toast.success('Seguidor removido da Lista!');
    },
    onError: () => {
      toast.error('Erro ao remover seguidor');
    },
  });
};

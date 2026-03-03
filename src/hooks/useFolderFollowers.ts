import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FolderFollower {
  id: string;
  folder_id: string;
  user_id: string;
  created_at: string;
  user?: { full_name: string; avatar_url?: string };
}

export const useFolderFollowers = (folderId?: string) => {
  return useQuery({
    queryKey: ['folder-followers', folderId],
    queryFn: async () => {
      if (!folderId) return [];
      const { data, error } = await supabase
        .from('folder_followers')
        .select('*')
        .eq('folder_id', folderId);
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
      })) as FolderFollower[];
    },
    enabled: !!folderId,
  });
};

export const useAddFolderFollower = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ folderId, userId }: { folderId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('folder_followers')
        .insert({ folder_id: folderId, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folder-followers', data.folder_id] });
      toast.success('Seguidor adicionado à Pasta!');
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast.error('Este usuário já é seguidor desta Pasta');
      } else {
        toast.error('Erro ao adicionar seguidor');
      }
    },
  });
};

export const useRemoveFolderFollower = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ folderId, userId }: { folderId: string; userId: string }) => {
      const { error } = await supabase
        .from('folder_followers')
        .delete()
        .eq('folder_id', folderId)
        .eq('user_id', userId);
      if (error) throw error;
      return { folderId, userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folder-followers', data.folderId] });
      queryClient.invalidateQueries({ queryKey: ['task-followers'] });
      toast.success('Seguidor removido da Pasta!');
    },
    onError: () => {
      toast.error('Erro ao remover seguidor');
    },
  });
};

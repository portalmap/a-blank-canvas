import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useFoldersForWorkspace = (workspaceId?: string) => {
  return useQuery({
    queryKey: ['folders', 'workspace', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('folders')
        .select('*, spaces!inner(workspace_id)')
        .eq('spaces.workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

export const useFolders = (spaceId?: string) => {
  return useQuery({
    queryKey: ['folders', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];
      
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!spaceId,
  });
};

export const useFolder = (folderId?: string) => {
  return useQuery({
    queryKey: ['folder', folderId],
    queryFn: async () => {
      if (!folderId) return null;
      
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!folderId,
  });
};

export const useCreateFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ spaceId, name, description }: { 
      spaceId: string; 
      name: string; 
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('folders')
        .insert({ space_id: spaceId, name, description })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders', data.space_id] });
      toast.success('Pasta criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar pasta');
      console.error(error);
    },
  });
};

export const useUpdateFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description }: { 
      id: string; 
      name: string; 
      description?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('folders')
        .update({ name, description })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Pasta não encontrada');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders', data.space_id] });
      toast.success('Pasta atualizada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar pasta:', error);
      toast.error(`Erro ao atualizar pasta: ${error.message}`);
    },
  });
};

export const useDeleteFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('Pasta excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir pasta');
      console.error(error);
    },
  });
};

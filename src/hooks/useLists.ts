import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseListsOptions {
  spaceId?: string;
  folderId?: string;
}

export const useLists = ({ spaceId, folderId }: UseListsOptions = {}) => {
  return useQuery({
    queryKey: ['lists', spaceId, folderId],
    queryFn: async () => {
      let query = supabase.from('lists').select('*');
      
      if (folderId) {
        query = query.eq('folder_id', folderId);
      } else if (spaceId) {
        query = query.eq('space_id', spaceId).is('folder_id', null);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!(spaceId || folderId),
  });
};

export const useListsForWorkspace = (workspaceId?: string) => {
  return useQuery({
    queryKey: ['lists', 'workspace', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

export const useList = (listId?: string) => {
  return useQuery({
    queryKey: ['list', listId],
    queryFn: async () => {
      if (!listId) return null;
      
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('id', listId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!listId,
  });
};

export const useCreateList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workspaceId,
      spaceId, 
      folderId,
      name, 
      description,
      defaultView = 'list'
    }: { 
      workspaceId: string;
      spaceId: string; 
      folderId?: string;
      name: string; 
      description?: string;
      defaultView?: 'list' | 'kanban' | 'sprint';
    }) => {
      const { data, error } = await supabase
        .from('lists')
        .insert({ 
          workspace_id: workspaceId,
          space_id: spaceId, 
          folder_id: folderId || null,
          name, 
          description,
          default_view: defaultView
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lists', data.space_id] });
      if (data.folder_id) {
        queryClient.invalidateQueries({ queryKey: ['lists', data.space_id, data.folder_id] });
      }
      toast.success('Lista criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar lista');
      console.error(error);
    },
  });
};

export const useUpdateList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description, defaultView }: { 
      id: string; 
      name: string; 
      description?: string | null;
      defaultView?: 'list' | 'kanban' | 'sprint';
    }) => {
      const { data, error } = await supabase
        .from('lists')
        .update({ name, description, default_view: defaultView })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Lista não encontrada');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast.success('Lista atualizada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar lista:', error);
      toast.error(`Erro ao atualizar lista: ${error.message}`);
    },
  });
};

export const useDeleteList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast.success('Lista excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir lista');
      console.error(error);
    },
  });
};

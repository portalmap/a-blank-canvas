import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSpaces = (workspaceId?: string) => {
  return useQuery({
    queryKey: ['spaces', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

export const useCreateSpace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, name, description, color }: { 
      workspaceId: string; 
      name: string; 
      description?: string;
      color?: string;
    }) => {
      const { data, error } = await supabase
        .from('spaces')
        .insert({ workspace_id: workspaceId, name, description, color })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spaces', variables.workspaceId] });
      toast.success('Space criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar space');
      console.error(error);
    },
  });
};

export const useUpdateSpace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description, color }: { 
      id: string; 
      name: string; 
      description?: string | null;
      color?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('spaces')
        .update({ name, description, color })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Space não encontrado');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spaces', data.workspace_id] });
      toast.success('Space atualizado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar space:', error);
      toast.error(`Erro ao atualizar space: ${error.message}`);
    },
  });
};

export const useDeleteSpace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      toast.success('Space excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir space');
      console.error(error);
    },
  });
};

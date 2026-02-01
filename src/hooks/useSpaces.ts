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
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

export const useSpace = (spaceId?: string) => {
  return useQuery({
    queryKey: ['space', spaceId],
    queryFn: async () => {
      if (!spaceId) return null;
      
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', spaceId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!spaceId,
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
      // Usar função segura do banco de dados
      const { data, error } = await supabase
        .rpc('create_space_secure', {
          p_workspace_id: workspaceId,
          p_name: name,
          p_description: description || null,
          p_color: color || null,
        });

      if (error) throw error;
      
      // Buscar o space criado para retornar os dados completos
      const { data: space, error: fetchError } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', data)
        .single();
        
      if (fetchError) throw fetchError;
      return space;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spaces', variables.workspaceId] });
      toast.success('Space criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar space:', error);
      if (error.message?.includes('permissão')) {
        toast.error('Você não tem permissão para criar spaces neste workspace');
      } else {
        toast.error('Erro ao criar space');
      }
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
    onError: (error: any) => {
      console.error('Erro ao excluir space:', error);
      
      if (error.code === '23503') {
        toast.error('Não é possível excluir: existem dados vinculados');
      } else if (error.code === '42501') {
        toast.error('Você não tem permissão para excluir este space');
      } else {
        toast.error('Erro ao excluir space');
      }
    },
  });
};

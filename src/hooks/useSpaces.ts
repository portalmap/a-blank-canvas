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
        .is('archived_at', null)
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
    mutationFn: async ({ workspaceId, name, description, color, accountUserId }: { 
      workspaceId: string; 
      name: string; 
      description?: string;
      color?: string;
      accountUserId?: string | null;
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
      
      // Se accountUserId definido, atualizar o space
      if (accountUserId) {
        await supabase
          .from('spaces')
          .update({ account_user_id: accountUserId })
          .eq('id', data);
      }
      
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
    mutationFn: async ({ id, name, description, color, accountUserId }: { 
      id: string; 
      name: string; 
      description?: string | null;
      color?: string | null;
      accountUserId?: string | null;
    }) => {
      const updateData: any = { name, description, color };
      if (accountUserId !== undefined) {
        updateData.account_user_id = accountUserId;
      }
      
      const { data, error } = await supabase
        .from('spaces')
        .update(updateData)
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
      queryClient.invalidateQueries({ queryKey: ['archived-spaces'] });
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

export const useArchivedSpaces = (workspaceId?: string) => {
  return useQuery({
    queryKey: ['archived-spaces', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('workspace_id', workspaceId)
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

export const useArchiveSpace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      const { error } = await supabase.rpc('archive_space', { p_space_id: spaceId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['archived-spaces'] });
      toast.success('Space arquivado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao arquivar space');
    },
  });
};

export const useRestoreSpace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      const { error } = await supabase.rpc('restore_space', { p_space_id: spaceId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['archived-spaces'] });
      toast.success('Space restaurado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao restaurar space');
    },
  });
};

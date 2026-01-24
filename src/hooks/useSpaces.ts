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
      // Verificação robusta de sessão
      let user = (await supabase.auth.getUser()).data.user;
      
      if (!user) {
        // Tentar refresh da sessão
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session?.user) {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        user = refreshData.session.user;
      }

      // Inserção com retry para erros de RLS
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= 2; attempt++) {
        const { data, error } = await supabase
          .from('spaces')
          .insert({ workspace_id: workspaceId, name, description, color })
          .select()
          .single();

        if (!error && data) {
          return data;
        }

        // Se erro RLS e não é a última tentativa, refresh token
        if (error?.code === '42501' && attempt < 2) {
          console.warn(`RLS error on spaces, refreshing session (attempt ${attempt + 1})`);
          await supabase.auth.refreshSession();
          await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
          lastError = error;
          continue;
        }

        throw error;
      }

      throw lastError || new Error('Falha ao criar space após tentativas');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spaces', variables.workspaceId] });
      toast.success('Space criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar space:', error);
      
      if (error.code === '42501') {
        toast.error('Erro de permissão. Sua sessão pode ter expirado. Tente novamente.');
      } else if (error.message?.includes('Sessão expirada')) {
        toast.error('Sua sessão expirou. Faça login novamente.');
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
    onError: (error) => {
      toast.error('Erro ao excluir space');
      console.error(error);
    },
  });
};

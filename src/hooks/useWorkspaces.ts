import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export const useWorkspaces = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*, workspace_members(role)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Adicionar usuário como membro de workspaces sem membros
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data) {
        const workspacesWithoutMembers = data.filter(w => w.workspace_members.length === 0);
        
        if (workspacesWithoutMembers.length > 0) {
          await Promise.all(
            workspacesWithoutMembers.map(workspace =>
              supabase
                .from('workspace_members')
                .insert({
                  workspace_id: workspace.id,
                  user_id: user.id,
                  role: 'admin'
                })
                .select()
            )
          );
          
          // Recarregar workspaces após adicionar membros
          const { data: updatedData, error: updatedError } = await supabase
            .from('workspaces')
            .select('*, workspace_members(role)')
            .order('created_at', { ascending: false });
          
          if (updatedError) throw updatedError;
          return updatedData;
        }
      }

      return data;
    },
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('workspaces')
        .insert({ name })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar workspace');
      console.error(error);
    },
  });
};

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description }: { 
      id: string; 
      name: string; 
      description?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('workspaces')
        .update({ name, description })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Workspace não encontrado ou sem permissões');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace atualizado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar workspace:', error);
      toast.error(`Erro ao atualizar workspace: ${error.message}`);
    },
  });
};

export const useDefaultWorkspace = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['default-workspace', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single();
      
      if (error || !data?.default_workspace_id) return null;
      return data.default_workspace_id;
    },
    enabled: !!user,
  });
};

export const useSetDefaultWorkspace = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (workspaceId: string | null) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('profiles')
        .update({ default_workspace_id: workspaceId })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-workspace'] });
      toast.success('Workspace padrão atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao definir workspace padrão: ${error.message}`);
    },
  });
};
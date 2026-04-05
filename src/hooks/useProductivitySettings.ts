import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface ProductivitySettings {
  id: string;
  workspace_id: string;
  early_threshold_percent: number;
  on_time_threshold_percent: number;
  created_at: string;
  updated_at: string;
}

export interface ProductivityValidator {
  id: string;
  workspace_id: string;
  user_id: string;
  space_id: string | null;
  created_at: string;
}

export const useProductivitySettings = () => {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  return useQuery({
    queryKey: ['productivity-settings', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from('productivity_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as ProductivitySettings | null;
    },
    enabled: !!workspaceId,
  });
};

export const useUpsertProductivitySettings = () => {
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: { early_threshold_percent: number; on_time_threshold_percent: number }) => {
      if (!activeWorkspace?.id) throw new Error('No workspace');

      const { data, error } = await supabase
        .from('productivity_settings')
        .upsert({
          workspace_id: activeWorkspace.id,
          early_threshold_percent: settings.early_threshold_percent,
          on_time_threshold_percent: settings.on_time_threshold_percent,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-settings'] });
      toast.success('Regras de produtividade salvas!');
    },
    onError: () => toast.error('Erro ao salvar regras'),
  });
};

export const useProductivityValidators = () => {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  return useQuery({
    queryKey: ['productivity-validators', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('productivity_validators')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return (data || []) as ProductivityValidator[];
    },
    enabled: !!workspaceId,
  });
};

export const useAddProductivityValidator = () => {
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { user_id: string; space_ids: (string | null)[] }) => {
      if (!activeWorkspace?.id) throw new Error('No workspace');

      const rows = params.space_ids.map(spaceId => ({
        workspace_id: activeWorkspace.id,
        user_id: params.user_id,
        space_id: spaceId,
      }));

      const { error } = await supabase
        .from('productivity_validators')
        .upsert(rows, { onConflict: 'workspace_id,user_id,space_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-validators'] });
      toast.success('Validador adicionado!');
    },
    onError: () => toast.error('Erro ao adicionar validador'),
  });
};

export const useRemoveProductivityValidator = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (validatorId: string) => {
      const { error } = await supabase
        .from('productivity_validators')
        .delete()
        .eq('id', validatorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-validators'] });
      toast.success('Validador removido');
    },
    onError: () => toast.error('Erro ao remover validador'),
  });
};

export const useRemoveAllValidatorEntries = () => {
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!activeWorkspace?.id) throw new Error('No workspace');
      const { error } = await supabase
        .from('productivity_validators')
        .delete()
        .eq('workspace_id', activeWorkspace.id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-validators'] });
      toast.success('Validador removido');
    },
    onError: () => toast.error('Erro ao remover validador'),
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AutomationTrigger = Database['public']['Enums']['automation_trigger'];
type AutomationActionType = Database['public']['Enums']['automation_action'];
type AutomationScopeType = Database['public']['Enums']['automation_scope'];

export interface Automation {
  id: string;
  workspace_id: string;
  description?: string | null;
  trigger: AutomationTrigger;
  action_type: AutomationActionType;
  action_config: Record<string, any>;
  scope_type: AutomationScopeType;
  scope_id?: string | null;
  enabled: boolean;
  created_at: string;
}

export type { AutomationTrigger, AutomationActionType as AutomationAction, AutomationScopeType as AutomationScope };

export const useAutomations = (workspaceId?: string) => {
  return useQuery({
    queryKey: ['automations', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Automation[];
    },
    enabled: !!workspaceId,
  });
};

export const useAutomationsByScope = (scopeType: AutomationScopeType, scopeId?: string) => {
  return useQuery({
    queryKey: ['automations', 'scope', scopeType, scopeId],
    queryFn: async () => {
      if (!scopeId) return [];
      
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('scope_type', scopeType)
        .eq('scope_id', scopeId)
        .eq('enabled', true);

      if (error) throw error;
      return data as Automation[];
    },
    enabled: !!scopeId,
  });
};

interface CreateAutomationParams {
  workspaceId: string;
  description?: string;
  trigger: AutomationTrigger;
  actionType: AutomationActionType;
  actionConfig: Record<string, any>;
  scopeType: AutomationScopeType;
  scopeId?: string;
}

export const useCreateAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateAutomationParams) => {
      const { data, error } = await supabase
        .from('automations')
        .insert({
          workspace_id: params.workspaceId,
          description: params.description,
          trigger: params.trigger,
          action_type: params.actionType,
          action_config: params.actionConfig,
          scope_type: params.scopeType,
          scope_id: params.scopeId,
          enabled: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar automação');
      console.error(error);
    },
  });
};

interface UpdateAutomationParams {
  id: string;
  description?: string;
  trigger?: AutomationTrigger;
  action_type?: AutomationActionType;
  action_config?: Record<string, any>;
  scope_type?: AutomationScopeType;
  scope_id?: string | null;
  enabled?: boolean;
}

export const useUpdateAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateAutomationParams) => {
      const { data, error } = await supabase
        .from('automations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar automação');
      console.error(error);
    },
  });
};

export const useDeleteAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir automação');
      console.error(error);
    },
  });
};

export const useToggleAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('automations')
        .update({ enabled: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success(data.enabled ? 'Automação ativada!' : 'Automação desativada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar automação');
      console.error(error);
    },
  });
};

interface DuplicateAutomationParams {
  automation: Automation;
  targetScopeType: AutomationScopeType;
  targetScopeId?: string;
}

export const useDuplicateAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ automation, targetScopeType, targetScopeId }: DuplicateAutomationParams) => {
      const cloneDescription = automation.description 
        ? `CLONE - ${automation.description}` 
        : 'CLONE';

      const { data, error } = await supabase
        .from('automations')
        .insert({
          workspace_id: automation.workspace_id,
          description: cloneDescription,
          trigger: automation.trigger,
          action_type: automation.action_type,
          action_config: automation.action_config,
          scope_type: targetScopeType,
          scope_id: targetScopeId || null,
          enabled: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação duplicada! (desativada)');
    },
    onError: (error) => {
      toast.error('Erro ao duplicar automação');
      console.error(error);
    },
  });
};

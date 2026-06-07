import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AutomationTrigger = Database['public']['Enums']['automation_trigger'];
type AutomationActionType = Database['public']['Enums']['automation_action'];

export interface TemplateAutomation {
  id: string;
  template_id: string;
  description: string | null;
  trigger: AutomationTrigger;
  action_type: AutomationActionType;
  action_config: Record<string, any>;
  scope_type: 'space' | 'folder' | 'list';
  folder_ref_id: string | null;
  list_ref_id: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const useTemplateAutomations = (templateId?: string) => {
  return useQuery({
    queryKey: ['template-automations', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from('space_template_automations')
        .select('*')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TemplateAutomation[];
    },
    enabled: !!templateId,
  });
};

interface CreateTemplateAutomationParams {
  templateId: string;
  description?: string;
  trigger: AutomationTrigger;
  actionType: AutomationActionType;
  actionConfig: Record<string, any>;
  scopeType: 'space' | 'folder' | 'list';
  folderRefId?: string;
  listRefId?: string;
}

export const useCreateTemplateAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTemplateAutomationParams) => {
      const { data, error } = await supabase
        .from('space_template_automations')
        .insert({
          template_id: params.templateId,
          description: params.description,
          trigger: params.trigger,
          action_type: params.actionType,
          action_config: params.actionConfig,
          scope_type: params.scopeType,
          folder_ref_id: params.folderRefId || null,
          list_ref_id: params.listRefId || null,
          enabled: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['template-automations', variables.templateId] });
      toast.success('Automação adicionada ao template!');
    },
    onError: (error) => {
      toast.error('Erro ao criar automação no template');
      console.error(error);
    },
  });
};

interface UpdateTemplateAutomationParams {
  id: string;
  templateId: string;
  description?: string;
  trigger?: AutomationTrigger;
  action_type?: AutomationActionType;
  action_config?: Record<string, any>;
  scope_type?: 'space' | 'folder' | 'list';
  folder_ref_id?: string | null;
  list_ref_id?: string | null;
  enabled?: boolean;
}

export const useUpdateTemplateAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, templateId, ...updates }: UpdateTemplateAutomationParams) => {
      const { data, error } = await supabase
        .from('space_template_automations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, templateId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['template-automations', data.templateId] });
      toast.success('Automação atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar automação');
      console.error(error);
    },
  });
};

export const useDeleteTemplateAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) => {
      const { error } = await supabase
        .from('space_template_automations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { templateId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['template-automations', data.templateId] });
      toast.success('Automação removida do template!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir automação');
      console.error(error);
    },
  });
};

export const useToggleTemplateAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, templateId, enabled }: { id: string; templateId: string; enabled: boolean }) => {
      const { data, error } = await supabase
        .from('space_template_automations')
        .update({ enabled })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, templateId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['template-automations', data.templateId] });
      toast.success(data.enabled ? 'Automação ativada!' : 'Automação desativada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar automação');
      console.error(error);
    },
  });
};

export const useDuplicateTemplateAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ automation }: { automation: TemplateAutomation }) => {
      const cloneDescription = automation.description 
        ? `CLONE - ${automation.description}` 
        : 'CLONE';

      const { data, error } = await supabase
        .from('space_template_automations')
        .insert({
          template_id: automation.template_id,
          description: cloneDescription,
          trigger: automation.trigger,
          action_type: automation.action_type,
          action_config: automation.action_config,
          scope_type: automation.scope_type,
          folder_ref_id: automation.folder_ref_id,
          list_ref_id: automation.list_ref_id,
          enabled: false,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, templateId: automation.template_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ 
        queryKey: ['template-automations', result.templateId] 
      });
      toast.success('Automação duplicada! (desativada)');
    },
    onError: (error) => {
      toast.error('Erro ao duplicar automação');
      console.error(error);
    },
  });
};

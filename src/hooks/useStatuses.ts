import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type StatusCategory = 'not_started' | 'active' | 'in_progress' | 'done';

export interface StatusItem {
  id: string;
  name: string;
  color: string | null;
  is_default: boolean;
  order_index: number;
  category: string | null;
}

export const useStatuses = (workspaceId?: string) => {
  return useQuery({
    queryKey: ['statuses', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('statuses')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('scope_type', 'workspace')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

export const useStatusesForScope = (
  scopeType: 'list' | 'folder' | 'space' | 'workspace',
  scopeId?: string,
  workspaceId?: string
) => {
  return useQuery({
    queryKey: ['statuses-for-scope', scopeType, scopeId, workspaceId],
    queryFn: async (): Promise<StatusItem[]> => {
      if (!workspaceId) return [];
      
      // Para lista, verificar status_source e status_template_id
      if (scopeType === 'list' && scopeId) {
        const { data: list } = await supabase
          .from('lists')
          .select('status_source, status_template_id, folder_id, space_id')
          .eq('id', scopeId)
          .single();
          
        if (list?.status_source === 'template' && list?.status_template_id) {
          // Buscar status sincronizados na tabela statuses (scope_type='list', scope_id=listId)
          const { data: syncedStatuses, error: syncError } = await supabase
            .from('statuses')
            .select('*')
            .eq('scope_type', 'list')
            .eq('scope_id', scopeId)
            .order('order_index', { ascending: true });
          
          if (!syncError && syncedStatuses && syncedStatuses.length > 0) {
            return syncedStatuses.map(s => ({
              id: s.id,
              name: s.name,
              color: s.color,
              is_default: s.is_default,
              order_index: s.order_index,
              category: s.category,
            }));
          }
          
          // Se não há status sincronizados, sincronizar agora
          await supabase.rpc('sync_template_statuses_for_list', {
            p_list_id: scopeId,
            p_template_id: list.status_template_id,
            p_workspace_id: workspaceId
          });
          
          // Buscar novamente após sincronização
          const { data: newStatuses, error: newError } = await supabase
            .from('statuses')
            .select('*')
            .eq('scope_type', 'list')
            .eq('scope_id', scopeId)
            .order('order_index', { ascending: true });
          
          if (newError) throw newError;
          
          return newStatuses?.map(s => ({
            id: s.id,
            name: s.name,
            color: s.color,
            is_default: s.is_default,
            order_index: s.order_index,
            category: s.category,
          })) || [];
        }
      }
      
      // Fallback: buscar status do workspace
      const { data, error } = await supabase
        .from('statuses')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('scope_type', 'workspace')
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      
      return data?.map(s => ({
        id: s.id,
        name: s.name,
        color: s.color,
        is_default: s.is_default,
        order_index: s.order_index,
        category: s.category,
      })) || [];
    },
    enabled: !!workspaceId,
  });
};

export const useDefaultStatusForScope = (
  scopeType: 'list' | 'folder' | 'space' | 'workspace',
  scopeId?: string,
  workspaceId?: string
) => {
  return useQuery({
    queryKey: ['default-status-for-scope', scopeType, scopeId, workspaceId],
    queryFn: async (): Promise<StatusItem | null> => {
      if (!workspaceId) return null;
      
      // Para lista, verificar status_source e status_template_id
      if (scopeType === 'list' && scopeId) {
        const { data: list } = await supabase
          .from('lists')
          .select('status_source, status_template_id')
          .eq('id', scopeId)
          .single();
          
        if (list?.status_source === 'template' && list?.status_template_id) {
          // Buscar status sincronizados na tabela statuses
          let { data: syncedStatuses } = await supabase
            .from('statuses')
            .select('*')
            .eq('scope_type', 'list')
            .eq('scope_id', scopeId)
            .order('order_index', { ascending: true });
          
          // Se não há status sincronizados, sincronizar agora
          if (!syncedStatuses || syncedStatuses.length === 0) {
            await supabase.rpc('sync_template_statuses_for_list', {
              p_list_id: scopeId,
              p_template_id: list.status_template_id,
              p_workspace_id: workspaceId
            });
            
            const { data: newStatuses } = await supabase
              .from('statuses')
              .select('*')
              .eq('scope_type', 'list')
              .eq('scope_id', scopeId)
              .order('order_index', { ascending: true });
            
            syncedStatuses = newStatuses;
          }
          
          if (syncedStatuses && syncedStatuses.length > 0) {
            // Buscar o default ou primeiro
            const defaultStatus = syncedStatuses.find(s => s.is_default) || syncedStatuses[0];
            return {
              id: defaultStatus.id,
              name: defaultStatus.name,
              color: defaultStatus.color,
              is_default: defaultStatus.is_default,
              order_index: defaultStatus.order_index,
              category: defaultStatus.category,
            };
          }
        }
      }
      
      // Fallback: buscar status default do workspace
      const { data, error } = await supabase
        .from('statuses')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        return {
          id: data.id,
          name: data.name,
          color: data.color,
          is_default: data.is_default,
          order_index: data.order_index,
          category: data.category,
        };
      }
      
      return null;
    },
    enabled: !!workspaceId,
  });
};

export const useDefaultStatus = (workspaceId?: string) => {
  return useQuery({
    queryKey: ['default-status', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      
      const { data, error } = await supabase
        .from('statuses')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('scope_type', 'workspace')
        .eq('is_default', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

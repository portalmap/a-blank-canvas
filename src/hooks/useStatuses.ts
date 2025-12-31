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
          // Buscar status do template
          const { data: items, error } = await supabase
            .from('status_template_items')
            .select('*')
            .eq('template_id', list.status_template_id)
            .order('order_index');
          
          if (error) throw error;
          
          return items?.map(item => ({
            id: item.id,
            name: item.name,
            color: item.color,
            is_default: item.is_default || false,
            order_index: item.order_index || 0,
            category: item.category,
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
          // Buscar status default do template
          const { data: item, error } = await supabase
            .from('status_template_items')
            .select('*')
            .eq('template_id', list.status_template_id)
            .eq('is_default', true)
            .single();
          
          if (error && error.code !== 'PGRST116') throw error;
          
          if (item) {
            return {
              id: item.id,
              name: item.name,
              color: item.color,
              is_default: item.is_default || false,
              order_index: item.order_index || 0,
              category: item.category,
            };
          }
          
          // Se não houver default, pegar o primeiro
          const { data: firstItem } = await supabase
            .from('status_template_items')
            .select('*')
            .eq('template_id', list.status_template_id)
            .order('order_index')
            .limit(1)
            .single();
          
          if (firstItem) {
            return {
              id: firstItem.id,
              name: firstItem.name,
              color: firstItem.color,
              is_default: firstItem.is_default || false,
              order_index: firstItem.order_index || 0,
              category: firstItem.category,
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
        .eq('is_default', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

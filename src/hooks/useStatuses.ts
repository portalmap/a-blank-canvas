import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

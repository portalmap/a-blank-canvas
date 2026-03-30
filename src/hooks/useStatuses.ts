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

// Helper: fetch statuses for a specific scope, returns null if none found
async function fetchScopedStatuses(
  scopeType: 'list' | 'folder' | 'space',
  scopeId: string
): Promise<StatusItem[] | null> {
  const { data, error } = await supabase
    .from('statuses')
    .select('*')
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId)
    .order('order_index', { ascending: true });

  if (error || !data || data.length === 0) return null;

  return data.map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
    is_default: s.is_default,
    order_index: s.order_index,
    category: s.category,
  }));
}

// Helper: sync template statuses if configured, then fetch
async function syncAndFetchTemplateStatuses(
  scopeType: 'list',
  scopeId: string,
  templateId: string,
  workspaceId: string
): Promise<StatusItem[] | null> {
  // Try fetching existing synced statuses first
  let result = await fetchScopedStatuses(scopeType, scopeId);
  if (result) return result;

  // Sync from template
  await supabase.rpc('sync_template_statuses_for_list', {
    p_list_id: scopeId,
    p_template_id: templateId,
    p_workspace_id: workspaceId,
  });

  return await fetchScopedStatuses(scopeType, scopeId);
}

// Helper: fetch workspace default statuses
async function fetchWorkspaceStatuses(workspaceId: string): Promise<StatusItem[]> {
  const { data, error } = await supabase
    .from('statuses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('scope_type', 'workspace')
    .order('order_index', { ascending: true });

  if (error) throw error;

  return (data || []).map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
    is_default: s.is_default,
    order_index: s.order_index,
    category: s.category,
  }));
}

// Helper: check if a scope has custom/template statuses configured and return them
async function resolveStatusesForScope(
  scopeType: 'list' | 'folder' | 'space',
  scopeId: string,
  workspaceId: string
): Promise<StatusItem[] | null> {
  if (scopeType === 'list') {
    const { data: list } = await supabase
      .from('lists')
      .select('status_source, status_template_id, folder_id, space_id')
      .eq('id', scopeId)
      .single();

    if (list?.status_source === 'template' && list?.status_template_id) {
      const result = await syncAndFetchTemplateStatuses('list', scopeId, list.status_template_id, workspaceId);
      if (result) return result;
    } else if (list?.status_source === 'custom') {
      const result = await fetchScopedStatuses('list', scopeId);
      if (result) return result;
    }

    // Inherit from folder
    if (list?.folder_id) {
      const folderResult = await resolveStatusesForScope('folder', list.folder_id, workspaceId);
      if (folderResult) return folderResult;
    }

    // Inherit from space
    if (list?.space_id) {
      const spaceResult = await resolveStatusesForScope('space', list.space_id, workspaceId);
      if (spaceResult) return spaceResult;
    }

    return null;
  }

  if (scopeType === 'folder') {
    const { data: folder } = await supabase
      .from('folders')
      .select('status_source, status_template_id, space_id')
      .eq('id', scopeId)
      .single();

    if (folder?.status_source === 'template' || folder?.status_source === 'custom') {
      const result = await fetchScopedStatuses('folder', scopeId);
      if (result) return result;
    }

    // Inherit from space
    if (folder?.space_id) {
      const spaceResult = await resolveStatusesForScope('space', folder.space_id, workspaceId);
      if (spaceResult) return spaceResult;
    }

    return null;
  }

  if (scopeType === 'space') {
    const { data: space } = await supabase
      .from('spaces')
      .select('status_source, status_template_id')
      .eq('id', scopeId)
      .single();

    if (space?.status_source === 'template' || space?.status_source === 'custom') {
      const result = await fetchScopedStatuses('space', scopeId);
      if (result) return result;
    }

    return null;
  }

  return null;
}

export const useStatuses = (workspaceId?: string) => {
  return useQuery({
    queryKey: ['statuses', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return fetchWorkspaceStatuses(workspaceId);
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

      if (scopeType === 'workspace') {
        return fetchWorkspaceStatuses(workspaceId);
      }

      if (scopeId) {
        const result = await resolveStatusesForScope(scopeType, scopeId, workspaceId);
        if (result) return result;
      }

      // Fallback: workspace default
      return fetchWorkspaceStatuses(workspaceId);
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

      let statuses: StatusItem[] | null = null;

      if (scopeType !== 'workspace' && scopeId) {
        statuses = await resolveStatusesForScope(scopeType, scopeId, workspaceId);
      }

      if (!statuses) {
        statuses = await fetchWorkspaceStatuses(workspaceId);
      }

      if (statuses && statuses.length > 0) {
        return statuses.find(s => s.is_default) || statuses[0];
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

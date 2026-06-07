import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProductivitySettings } from './useProductivitySettings';
import { ProductivityScope } from './useProductivityStats';

export interface ProductivityTaskDetail {
  id: string;
  title: string;
  eventDate: string;
  dueDate: string | null;
  classification: 'early' | 'on_time' | 'late' | 'no_due_date';
  daysFromDue: number | null;
  isTransferred: boolean;
  userName: string | null;
  deliveryPct: number | null;
}

export interface ProductivityDetailsSummary {
  early: number;
  onTime: number;
  late: number;
  noDueDate: number;
  total: number;
}

export interface ProductivityDetailsReport {
  tasks: ProductivityTaskDetail[];
  summary: ProductivityDetailsSummary;
}

interface UseProductivityDetailsReportOptions {
  scope?: ProductivityScope;
  spaceId?: string;
  folderId?: string;
  listId?: string;
  userId?: string;
  userIds?: string[];
  startDate?: Date;
  endDate?: Date;
  includeTransferred?: boolean;
  enabled?: boolean;
}

export const useProductivityDetailsReport = (options: UseProductivityDetailsReportOptions = {}) => {
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { data: settings } = useProductivitySettings();
  const { scope = 'workspace', spaceId, folderId, listId, userId, userIds, startDate, endDate, includeTransferred = false, enabled = false } = options;

  const earlyThreshold = settings?.early_threshold_percent ?? 50;
  const onTimeThreshold = settings?.on_time_threshold_percent ?? 100;

  return useQuery({
    queryKey: ['productivity-details-report', activeWorkspace?.id, scope, spaceId, folderId, listId, userIds, userId, user?.id, startDate?.toISOString(), endDate?.toISOString(), earlyThreshold, onTimeThreshold, includeTransferred],
    queryFn: async (): Promise<ProductivityDetailsReport> => {
      if (!activeWorkspace?.id) {
        return { tasks: [], summary: { early: 0, onTime: 0, late: 0, noDueDate: 0, total: 0 } };
      }

      const { data, error } = await supabase.rpc('get_productivity_details_by_scope', {
        p_workspace_id: activeWorkspace.id,
        p_scope: scope,
        p_space_id: spaceId || null,
        p_folder_id: folderId || null,
        p_list_id: listId || null,
        p_user_id: scope === 'my_tasks' ? user?.id || null : userId || null,
        p_user_ids: userIds || null,
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
        p_include_transferred: includeTransferred,
        p_early_threshold: earlyThreshold,
        p_on_time_threshold: onTimeThreshold,
        p_limit: 500,
      } as any);

      if (error) throw error;

      const result = data as any;
      return {
        tasks: (result?.tasks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          eventDate: t.eventDate,
          dueDate: t.dueDate,
          classification: t.classification,
          daysFromDue: t.daysFromDue,
          isTransferred: t.isTransferred,
          userName: t.userName,
          deliveryPct: t.deliveryPct,
        })),
        summary: {
          early: result?.summary?.early ?? 0,
          onTime: result?.summary?.onTime ?? 0,
          late: result?.summary?.late ?? 0,
          noDueDate: result?.summary?.noDueDate ?? 0,
          total: result?.summary?.total ?? 0,
        },
      };
    },
    enabled: enabled && !!activeWorkspace?.id,
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });
};

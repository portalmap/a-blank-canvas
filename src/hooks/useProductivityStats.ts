import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProductivitySettings } from './useProductivitySettings';

export interface ProductivityStats {
  early: number;
  onTime: number;
  late: number;
  noDueDate: number;

  earlyRate: number;
  onTimeRate: number;
  lateRate: number;

  totalCompleted: number;
  productivityScore: number;
}

export type ProductivityScope = 'workspace' | 'my_tasks' | 'space' | 'user';

interface UseProductivityStatsOptions {
  scope?: ProductivityScope;
  spaceId?: string;
  userId?: string;
  userIds?: string[];
  startDate?: Date;
  endDate?: Date;
  includeTransferred?: boolean;
}

export const useProductivityStats = (options: UseProductivityStatsOptions = {}) => {
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { data: settings } = useProductivitySettings();
  const { scope = 'workspace', spaceId, userId, userIds, startDate, endDate, includeTransferred = false } = options;

  const earlyThreshold = settings?.early_threshold_percent ?? 50;
  const onTimeThreshold = settings?.on_time_threshold_percent ?? 100;

  return useQuery({
    queryKey: ['productivity-stats', activeWorkspace?.id, scope, spaceId, userIds, userId, user?.id, startDate?.toISOString(), endDate?.toISOString(), earlyThreshold, onTimeThreshold, includeTransferred],
    queryFn: async (): Promise<ProductivityStats> => {
      if (!activeWorkspace?.id) {
        return {
          early: 0, onTime: 0, late: 0, noDueDate: 0,
          earlyRate: 0, onTimeRate: 0, lateRate: 0,
          totalCompleted: 0, productivityScore: 100,
        };
      }

      const { data, error } = await supabase.rpc('get_productivity_stats', {
        p_workspace_id: activeWorkspace.id,
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
        p_scope: scope,
        p_space_id: spaceId || null,
        p_user_id: scope === 'my_tasks' ? user?.id || null : userId || null,
        p_user_ids: userIds || null,
        p_early_threshold: earlyThreshold,
        p_on_time_threshold: onTimeThreshold,
        p_include_transferred: includeTransferred,
      });

      if (error) throw error;

      const result = data as any;
      return {
        early: result?.early ?? 0,
        onTime: result?.onTime ?? 0,
        late: result?.late ?? 0,
        noDueDate: result?.noDueDate ?? 0,
        earlyRate: result?.earlyRate ?? 0,
        onTimeRate: result?.onTimeRate ?? 0,
        lateRate: result?.lateRate ?? 0,
        totalCompleted: result?.totalCompleted ?? 0,
        productivityScore: result?.productivityScore ?? 100,
      };
    },
    enabled: !!activeWorkspace?.id,
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });
};

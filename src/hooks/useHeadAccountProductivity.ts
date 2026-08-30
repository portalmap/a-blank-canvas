import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useProductivitySettings } from './useProductivitySettings';

export interface HeadAccountEntry {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  totalTasks: number;
  early: number;
  onTime: number;
  late: number;
  noDueDate: number;
  productivityScore: number;
  spaceCount: number;
}

export interface HeadAccountSpaceEntry {
  spaceId: string;
  spaceName: string;
  spaceColor: string | null;
  accountUserId: string | null;
  hasAccount: boolean;
  total: number;
  early: number;
  onTime: number;
  late: number;
  noDueDate: number;
  avgScore: number;
}

export interface HeadAccountReport {
  avgScore: number;
  heads: HeadAccountEntry[];
  spaces: HeadAccountSpaceEntry[];
}

interface UseHeadAccountProductivityOptions {
  headUserId?: string;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}

const EMPTY: HeadAccountReport = { avgScore: 0, heads: [], spaces: [] };

export const useHeadAccountProductivity = (
  options: UseHeadAccountProductivityOptions = {},
) => {
  const { activeWorkspace } = useWorkspace();
  const { data: settings } = useProductivitySettings();
  const { headUserId, startDate, endDate, enabled = true } = options;

  const earlyThreshold = settings?.early_threshold_percent ?? 50;
  const onTimeThreshold = settings?.on_time_threshold_percent ?? 100;

  return useQuery({
    queryKey: [
      'head-account-productivity',
      activeWorkspace?.id,
      headUserId,
      startDate?.toISOString(),
      endDate?.toISOString(),
      earlyThreshold,
      onTimeThreshold,
    ],
    queryFn: async (): Promise<HeadAccountReport> => {
      if (!activeWorkspace?.id) return EMPTY;

      const { data, error } = await (supabase.rpc as any)(
        'get_head_account_productivity_report',
        {
          p_workspace_id: activeWorkspace.id,
          p_head_user_id: headUserId || null,
          p_start_date: startDate?.toISOString() || null,
          p_end_date: endDate?.toISOString() || null,
          p_early_threshold: earlyThreshold,
          p_on_time_threshold: onTimeThreshold,
        },
      );

      if (error) throw error;

      const result = data as any;
      return {
        avgScore: Number(result?.avgScore ?? 0),
        heads: result?.heads || [],
        spaces: result?.spaces || [],
      };
    },
    enabled: !!activeWorkspace?.id && enabled,
    staleTime: 15000,
  });
};

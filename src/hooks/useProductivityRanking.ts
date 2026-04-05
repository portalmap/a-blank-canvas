import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useProductivitySettings } from './useProductivitySettings';

export interface UserProductivityStats {
  userId: string;
  userName: string;
  avatarUrl?: string;
  early: number;
  onTime: number;
  late: number;
  noDueDate: number;
  totalCompleted: number;
  productivityScore: number;
  transferredEarly: number;
  transferredOnTime: number;
  transferredLate: number;
  transferredTotal: number;
}

export interface ProductivityRankingResult {
  ranking: UserProductivityStats[];
  teamAverage: number;
  totalTasks: number;
}

interface UseProductivityRankingOptions {
  startDate?: Date;
  endDate?: Date;
  includeTransferred?: boolean;
}

export const useProductivityRanking = (options: UseProductivityRankingOptions = {}) => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;
  const { data: settings } = useProductivitySettings();

  const earlyThreshold = settings?.early_threshold_percent ?? 50;
  const onTimeThreshold = settings?.on_time_threshold_percent ?? 100;

  return useQuery({
    queryKey: ['productivity-ranking', workspaceId, options.startDate?.toISOString(), options.endDate?.toISOString(), options.includeTransferred, earlyThreshold, onTimeThreshold],
    queryFn: async (): Promise<ProductivityRankingResult> => {
      if (!workspaceId) return { ranking: [], teamAverage: 0, totalTasks: 0 };

      const { data, error } = await supabase.rpc('get_productivity_ranking', {
        p_workspace_id: workspaceId,
        p_start_date: options.startDate?.toISOString() || null,
        p_end_date: options.endDate?.toISOString() || null,
        p_include_transferred: options.includeTransferred || false,
        p_early_threshold: earlyThreshold,
        p_on_time_threshold: onTimeThreshold,
      });

      if (error) throw error;

      const result = data as any;
      return {
        ranking: (result?.ranking || []).map((r: any) => ({
          userId: r.userId,
          userName: r.userName,
          avatarUrl: r.avatarUrl || undefined,
          early: r.early ?? 0,
          onTime: r.onTime ?? 0,
          late: r.late ?? 0,
          noDueDate: r.noDueDate ?? 0,
          totalCompleted: r.totalCompleted ?? 0,
          productivityScore: r.productivityScore ?? 0,
          transferredEarly: r.transferredEarly ?? 0,
          transferredOnTime: r.transferredOnTime ?? 0,
          transferredLate: r.transferredLate ?? 0,
          transferredTotal: r.transferredTotal ?? 0,
        })),
        teamAverage: result?.teamAverage ?? 0,
        totalTasks: result?.totalTasks ?? 0,
      };
    },
    enabled: !!user && !!workspaceId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

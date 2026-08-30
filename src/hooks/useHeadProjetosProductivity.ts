import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useProductivitySettings } from './useProductivitySettings';

export interface HeadProjetosUserEntry {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  totalTasks: number;
  early: number;
  onTime: number;
  late: number;
  noDueDate: number;
  productivityScore: number;
}

export interface HeadProjetosSpaceEntry {
  spaceId: string;
  spaceName: string;
  spaceColor: string | null;
  total: number;
  userCount: number;
  avgScore: number;
}

export interface HeadProjetosReport {
  avgScore: number;
  teamSize: number;
  spaceCount: number;
  users: HeadProjetosUserEntry[];
  spaces: HeadProjetosSpaceEntry[];
}

interface UseHeadProjetosProductivityOptions {
  headUserId?: string;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}

const EMPTY: HeadProjetosReport = {
  avgScore: 0,
  teamSize: 0,
  spaceCount: 0,
  users: [],
  spaces: [],
};

export const useHeadProjetosProductivity = (
  options: UseHeadProjetosProductivityOptions = {},
) => {
  const { activeWorkspace } = useWorkspace();
  const { data: settings } = useProductivitySettings();
  const { headUserId, startDate, endDate, enabled = true } = options;

  const earlyThreshold = settings?.early_threshold_percent ?? 50;
  const onTimeThreshold = settings?.on_time_threshold_percent ?? 100;

  return useQuery({
    queryKey: [
      'head-projetos-productivity',
      activeWorkspace?.id,
      headUserId,
      startDate?.toISOString(),
      endDate?.toISOString(),
      earlyThreshold,
      onTimeThreshold,
    ],
    queryFn: async (): Promise<HeadProjetosReport> => {
      if (!activeWorkspace?.id) return EMPTY;

      const { data, error } = await (supabase.rpc as any)(
        'get_head_projetos_productivity_report',
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
        teamSize: Number(result?.teamSize ?? 0),
        spaceCount: Number(result?.spaceCount ?? 0),
        users: result?.users || [],
        spaces: result?.spaces || [],
      };
    },
    enabled: !!activeWorkspace?.id && enabled,
    staleTime: 15000,
  });
};

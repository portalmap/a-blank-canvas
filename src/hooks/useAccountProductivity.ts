// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useProductivitySettings } from './useProductivitySettings';

export interface AccountEntry {
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

export interface AccountSpaceEntry {
  spaceId: string;
  spaceName: string;
  spaceColor: string | null;
  accountUserId: string;
  total: number;
  early: number;
  onTime: number;
  late: number;
  noDueDate: number;
  avgScore: number;
}

export interface AccountTaskEntry {
  id: string;
  title: string;
  spaceId: string;
  spaceName: string;
  completedAt: string;
  dueDate: string | null;
  classification: 'early' | 'on_time' | 'late' | 'no_due_date';
  productivityScore: number;
}

export interface AccountProductivityReport {
  accounts: AccountEntry[];
  spaces: AccountSpaceEntry[];
  tasks: AccountTaskEntry[];
}

interface UseAccountProductivityOptions {
  accountUserId?: string;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}

export const useAccountProductivity = (options: UseAccountProductivityOptions = {}) => {
  const { activeWorkspace } = useWorkspace();
  const { data: settings } = useProductivitySettings();
  const { accountUserId, startDate, endDate, enabled = true } = options;

  const earlyThreshold = settings?.early_threshold_percent ?? 50;
  const onTimeThreshold = settings?.on_time_threshold_percent ?? 100;

  return useQuery({
    queryKey: [
      'account-productivity',
      activeWorkspace?.id,
      accountUserId,
      startDate?.toISOString(),
      endDate?.toISOString(),
      earlyThreshold,
      onTimeThreshold,
    ],
    queryFn: async (): Promise<AccountProductivityReport> => {
      if (!activeWorkspace?.id) return { accounts: [], spaces: [], tasks: [] };

      const { data, error } = await supabase.rpc('get_account_productivity_report', {
        p_workspace_id: activeWorkspace.id,
        p_account_user_id: accountUserId || null,
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
        p_early_threshold: earlyThreshold,
        p_on_time_threshold: onTimeThreshold,
      });

      if (error) throw error;

      const result = data as any;
      return {
        accounts: result?.accounts || [],
        spaces: result?.spaces || [],
        tasks: result?.tasks || [],
      };
    },
    enabled: !!activeWorkspace?.id && enabled,
    staleTime: 15000,
  });
};

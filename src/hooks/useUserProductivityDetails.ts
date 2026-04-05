import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useProductivitySettings } from './useProductivitySettings';

export interface TaskDetail {
  id: string;
  title: string;
  completedAt: string;
  dueDate: string | null;
  classification: 'early' | 'on_time' | 'late' | 'no_due_date';
  daysFromDue: number | null;
  isTransferred?: boolean;
  productivityScore?: number;
}

export interface UserProductivityDetails {
  earlyTasks: TaskDetail[];
  onTimeTasks: TaskDetail[];
  lateTasks: TaskDetail[];
  noDueDateTasks: TaskDetail[];
  summary: {
    early: number;
    onTime: number;
    late: number;
    noDueDate: number;
    total: number;
    score: number;
  };
}

interface UseUserProductivityDetailsOptions {
  userId: string | null;
  startDate?: string;
  endDate?: string;
  includeTransferred?: boolean;
}

export const useUserProductivityDetails = (options: UseUserProductivityDetailsOptions) => {
  const { activeWorkspace } = useWorkspace();
  const { userId, startDate, endDate, includeTransferred } = options;
  const { data: settings } = useProductivitySettings();

  const earlyThreshold = settings?.early_threshold_percent ?? 50;
  const onTimeThreshold = settings?.on_time_threshold_percent ?? 100;

  return useQuery({
    queryKey: ['user-productivity-details', activeWorkspace?.id, userId, startDate, endDate, includeTransferred, earlyThreshold, onTimeThreshold],
    queryFn: async (): Promise<UserProductivityDetails | null> => {
      if (!activeWorkspace?.id || !userId) return null;

      const { data, error } = await supabase.rpc('get_user_productivity_details', {
        p_workspace_id: activeWorkspace.id,
        p_user_id: userId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_include_transferred: includeTransferred || false,
        p_early_threshold: earlyThreshold,
        p_on_time_threshold: onTimeThreshold,
        p_limit: 200,
      });

      if (error) throw error;

      const result = data as any;
      if (!result) return null;

      const tasks: TaskDetail[] = (result.tasks || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        completedAt: t.completedAt,
        dueDate: t.dueDate,
        classification: t.classification,
        daysFromDue: t.daysFromDue,
        isTransferred: t.isTransferred,
        productivityScore: t.productivityScore,
      }));

      const earlyTasks = tasks.filter(t => t.classification === 'early');
      const onTimeTasks = tasks.filter(t => t.classification === 'on_time');
      const lateTasks = tasks.filter(t => t.classification === 'late');
      const noDueDateTasks = tasks.filter(t => t.classification === 'no_due_date');

      return {
        earlyTasks,
        onTimeTasks,
        lateTasks,
        noDueDateTasks,
        summary: {
          early: result.summary?.early ?? 0,
          onTime: result.summary?.onTime ?? 0,
          late: result.summary?.late ?? 0,
          noDueDate: result.summary?.noDueDate ?? 0,
          total: result.summary?.total ?? 0,
          score: result.summary?.score ?? 0,
        },
      };
    },
    enabled: !!activeWorkspace?.id && !!userId,
    staleTime: 15000,
  });
};

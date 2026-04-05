import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  calculateDeliveryPercentage,
  calculateProductivityScore,
  ProductivityClassification,
} from './useProductivityClassification';
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

const classify = (
  pct: number,
  earlyThreshold: number,
  onTimeThreshold: number
): ProductivityClassification | 'no_due_date' => {
  if (pct <= earlyThreshold) return 'early';
  if (pct <= onTimeThreshold) return 'on_time';
  return 'late';
};

export const useProductivityRanking = (options: UseProductivityRankingOptions = {}) => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;
  const { data: settings } = useProductivitySettings();

  const earlyThreshold = settings?.early_threshold_percent ?? 50;
  const onTimeThreshold = settings?.on_time_threshold_percent ?? 100;

  return useQuery({
    queryKey: ['productivity-ranking', workspaceId, options.startDate, options.endDate, options.includeTransferred, earlyThreshold, onTimeThreshold],
    queryFn: async (): Promise<ProductivityRankingResult> => {
      if (!workspaceId) return { ranking: [], teamAverage: 0, totalTasks: 0 };

      // 1. Members
      const { data: memberRows, error: membersError } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId);
      if (membersError) throw membersError;
      if (!memberRows?.length) return { ranking: [], teamAverage: 0, totalTasks: 0 };

      const memberUserIds = memberRows.map(m => m.user_id);

      // 2. Profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', memberUserIds);
      if (profilesError) throw profilesError;
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // 3. Completed tasks
      let tasksQuery = supabase
        .from('tasks')
        .select('id, completed_at, due_date, start_date')
        .eq('workspace_id', workspaceId)
        .not('completed_at', 'is', null)
        .is('archived_at', null);

      if (options.startDate) tasksQuery = tasksQuery.gte('completed_at', options.startDate.toISOString());
      if (options.endDate) tasksQuery = tasksQuery.lte('completed_at', options.endDate.toISOString());

      const { data: tasks, error: tasksError } = await tasksQuery;
      if (tasksError) throw tasksError;

      const taskIds = tasks?.map(t => t.id) || [];

      // 4. Current assignees
      let assignees: { task_id: string; user_id: string }[] = [];
      if (taskIds.length > 0) {
        const { data, error } = await supabase
          .from('task_assignees')
          .select('task_id, user_id')
          .in('task_id', taskIds);
        if (error) throw error;
        assignees = data || [];
      }

      // 5. Transfer history
      let transferredHistory: { task_id: string; user_id: string; assigned_at: string; unassigned_at: string; start_date: string | null; due_date: string | null }[] = [];
      if (options.includeTransferred) {
        const { data, error } = await supabase
          .from('task_assignee_history')
          .select('task_id, user_id, assigned_at, unassigned_at, start_date, due_date')
          .not('unassigned_at', 'is', null)
          .in('user_id', memberUserIds);
        if (error) throw error;

        let filtered = data || [];
        if (options.startDate) filtered = filtered.filter(h => h.unassigned_at && h.unassigned_at >= options.startDate!.toISOString());
        if (options.endDate) filtered = filtered.filter(h => h.unassigned_at && h.unassigned_at <= options.endDate!.toISOString());
        transferredHistory = filtered as typeof transferredHistory;
      }

      // 6. Map tasks by user
      const tasksByUser = new Map<string, typeof tasks>();
      for (const a of assignees) {
        const task = tasks?.find(t => t.id === a.task_id);
        if (task) {
          const arr = tasksByUser.get(a.user_id) || [];
          arr.push(task);
          tasksByUser.set(a.user_id, arr);
        }
      }

      // 7. Calculate per-user stats
      const ranking: UserProductivityStats[] = memberRows.map(member => {
        const userTasks = tasksByUser.get(member.user_id) || [];
        const profile = profileMap.get(member.user_id);

        let early = 0, onTime = 0, late = 0, noDueDate = 0;
        const scores: number[] = [];

        for (const task of userTasks) {
          if (!task.completed_at) continue;
          if (!task.start_date || !task.due_date) {
            noDueDate++;
            scores.push(100);
            continue;
          }
          const pct = calculateDeliveryPercentage(task.start_date, task.due_date, new Date(task.completed_at));
          const cls = classify(pct, earlyThreshold, onTimeThreshold);
          if (cls === 'early') early++;
          else if (cls === 'on_time') onTime++;
          else late++;
          scores.push(calculateProductivityScore(task.start_date, task.due_date, new Date(task.completed_at)));
        }

        // Transferred
        let transferredEarly = 0, transferredOnTime = 0, transferredLate = 0;
        if (options.includeTransferred) {
          const userHistory = transferredHistory.filter(h => h.user_id === member.user_id);
          for (const h of userHistory) {
            const sd = h.start_date || h.assigned_at;
            if (!sd || !h.due_date) continue;
            const pct = calculateDeliveryPercentage(sd, h.due_date, new Date(h.unassigned_at));
            const cls = classify(pct, earlyThreshold, onTimeThreshold);
            if (cls === 'early') transferredEarly++;
            else if (cls === 'on_time') transferredOnTime++;
            else transferredLate++;
            scores.push(calculateProductivityScore(sd, h.due_date, new Date(h.unassigned_at)));
          }
        }

        const totalCompleted = early + onTime + late + noDueDate + transferredEarly + transferredOnTime + transferredLate;
        const productivityScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        return {
          userId: member.user_id,
          userName: profile?.full_name || 'Usuário sem nome',
          avatarUrl: profile?.avatar_url || undefined,
          early, onTime, late, noDueDate,
          totalCompleted,
          productivityScore,
          transferredEarly, transferredOnTime, transferredLate,
          transferredTotal: transferredEarly + transferredOnTime + transferredLate,
        };
      });

      ranking.sort((a, b) => b.productivityScore !== a.productivityScore ? b.productivityScore - a.productivityScore : b.totalCompleted - a.totalCompleted);

      const totalScore = ranking.reduce((s, r) => s + r.productivityScore, 0);
      const teamAverage = ranking.length > 0 ? Math.round(totalScore / ranking.length) : 0;
      const totalTasks = ranking.reduce((s, r) => s + r.totalCompleted, 0);

      return { ranking, teamAverage, totalTasks };
    },
    enabled: !!user && !!workspaceId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

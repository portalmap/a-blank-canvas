import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { calculateProductivityScore } from './useProductivityClassification';

export interface ProductivityStats {
  early: number;
  onTime: number;
  late: number;
  noDueDate: number;

  earlyRate: number;
  onTimeRate: number;
  lateRate: number;

  totalCompleted: number;
  productivityScore: number; // 0-200%, média dos scores individuais
}

export type ProductivityScope = 'workspace' | 'my_tasks' | 'space' | 'user';

interface UseProductivityStatsOptions {
  scope?: ProductivityScope;
  spaceId?: string;
  userId?: string;
  userIds?: string[];
  startDate?: Date;
  endDate?: Date;
}

type TaskClassification = 'early' | 'on_time' | 'late' | 'no_due_date';

const classifyAndScore = (task: {
  completed_at: string;
  start_date: string | null;
  due_date: string | null;
}): { classification: TaskClassification; score: number } => {
  if (!task.start_date || !task.due_date) {
    return { classification: 'no_due_date', score: 100 };
  }

  const completedDate = new Date(task.completed_at);
  const score = calculateProductivityScore(task.start_date, task.due_date, completedDate);

  // Classify based on delivery percentage
  const start = new Date(task.start_date + 'T00:00:00');
  const due = new Date(task.due_date + 'T23:59:59');
  const totalMs = due.getTime() - start.getTime();

  if (totalMs <= 0) return { classification: 'late', score };

  const usedMs = completedDate.getTime() - start.getTime();
  const pct = (usedMs / totalMs) * 100;

  if (pct <= 50) return { classification: 'early', score };
  if (pct <= 100) return { classification: 'on_time', score };
  return { classification: 'late', score };
};

export const useProductivityStats = (options: UseProductivityStatsOptions = {}) => {
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { scope = 'workspace', spaceId, userId, userIds, startDate, endDate } = options;

  const effectiveUserIds = userIds || (userId ? [userId] : []);

  return useQuery({
    queryKey: ['productivity-stats', activeWorkspace?.id, scope, spaceId, effectiveUserIds, user?.id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<ProductivityStats> => {
      if (!activeWorkspace?.id) {
        return {
          early: 0, onTime: 0, late: 0, noDueDate: 0,
          earlyRate: 0, onTimeRate: 0, lateRate: 0,
          totalCompleted: 0, productivityScore: 100,
        };
      }

      let query = supabase
        .from('tasks')
        .select(`
          id,
          start_date,
          due_date,
          completed_at,
          list_id,
          lists:list_id (
            id,
            space_id
          )
        `)
        .eq('workspace_id', activeWorkspace.id)
        .not('completed_at', 'is', null)
        .is('archived_at', null);

      if (startDate) {
        query = query.gte('completed_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('completed_at', endDate.toISOString());
      }

      const { data: tasks, error } = await query;
      if (error) throw error;

      let filteredTasks = tasks || [];

      if (scope === 'my_tasks' && user?.id) {
        const taskIds = filteredTasks.map(t => t.id);
        if (taskIds.length > 0) {
          const { data: assignees } = await supabase
            .from('task_assignees')
            .select('task_id')
            .eq('user_id', user.id)
            .in('task_id', taskIds);

          const myTaskIds = new Set(assignees?.map(a => a.task_id) || []);
          filteredTasks = filteredTasks.filter(t => myTaskIds.has(t.id));
        }
      } else if (scope === 'space' && spaceId) {
        filteredTasks = filteredTasks.filter(t => {
          const list = t.lists as { id: string; space_id: string } | null;
          return list?.space_id === spaceId;
        });
      } else if (scope === 'user' && effectiveUserIds.length > 0) {
        const taskIds = filteredTasks.map(t => t.id);
        if (taskIds.length > 0) {
          const { data: assignees } = await supabase
            .from('task_assignees')
            .select('task_id')
            .in('user_id', effectiveUserIds)
            .in('task_id', taskIds);

          const userTaskIds = new Set(assignees?.map(a => a.task_id) || []);
          filteredTasks = filteredTasks.filter(t => userTaskIds.has(t.id));
        } else {
          filteredTasks = [];
        }
      }

      let early = 0;
      let onTime = 0;
      let late = 0;
      let noDueDate = 0;
      let totalScore = 0;

      filteredTasks.forEach(task => {
        if (!task.completed_at) return;

        const result = classifyAndScore({
          completed_at: task.completed_at,
          start_date: task.start_date,
          due_date: task.due_date,
        });

        totalScore += result.score;

        switch (result.classification) {
          case 'early': early++; break;
          case 'on_time': onTime++; break;
          case 'late': late++; break;
          case 'no_due_date': noDueDate++; break;
        }
      });

      const totalCompleted = early + onTime + late + noDueDate;
      const productivityScore = totalCompleted > 0
        ? Math.round(totalScore / totalCompleted)
        : 100;

      return {
        early,
        onTime,
        late,
        noDueDate,
        earlyRate: totalCompleted > 0 ? Math.round((early / totalCompleted) * 100) : 0,
        onTimeRate: totalCompleted > 0 ? Math.round(((onTime + noDueDate) / totalCompleted) * 100) : 0,
        lateRate: totalCompleted > 0 ? Math.round((late / totalCompleted) * 100) : 0,
        totalCompleted,
        productivityScore,
      };
    },
    enabled: !!activeWorkspace?.id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

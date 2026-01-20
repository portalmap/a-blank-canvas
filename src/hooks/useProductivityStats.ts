import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';

export interface ProductivityStats {
  early: number;           // Antecipadas (7+ dias antes)
  onTime: number;          // No prazo (até 7 dias antes)
  late: number;            // Atrasadas
  noDueDate: number;       // Sem data (conta como no prazo)
  
  earlyRate: number;       // Percentual de antecipadas
  onTimeRate: number;      // Percentual no prazo
  lateRate: number;        // Percentual atrasadas
  
  totalCompleted: number;  // Total analisado
  productivityScore: number; // 0-200%
}

export type ProductivityScope = 'workspace' | 'my_tasks' | 'space' | 'user';

interface UseProductivityStatsOptions {
  scope?: ProductivityScope;
  spaceId?: string;
  userId?: string;        // Deprecated - use userIds
  userIds?: string[];     // Array de IDs de usuários
  startDate?: Date;
  endDate?: Date;
}

type TaskClassification = 'early' | 'on_time' | 'late' | 'no_due_date';

const classifyTask = (task: { completed_at: string; due_date: string | null }): TaskClassification => {
  if (!task.due_date) return 'no_due_date';
  
  const completedDate = startOfDay(parseISO(task.completed_at));
  const dueDate = parseLocalDate(task.due_date);
  
  if (!dueDate) return 'no_due_date';
  
  const dueDateStart = startOfDay(dueDate);
  const daysDiff = differenceInDays(dueDateStart, completedDate);
  
  if (daysDiff >= 7) return 'early';      // 7+ dias antes do vencimento
  if (daysDiff >= 0) return 'on_time';    // Até o dia do vencimento
  return 'late';                           // Após vencimento
};

const calculateScore = (early: number, onTime: number, noDueDate: number, late: number): number => {
  // Total de tarefas analisadas (inclui sem data como no prazo)
  const total = early + onTime + noDueDate + late;
  if (total === 0) return 100;
  
  // Antecipada = 2 pontos, No prazo/Sem data = 1 ponto, Atrasada = 0 pontos
  const points = (early * 2) + (onTime * 1) + (noDueDate * 1) + (late * 0);
  
  // Score = pontos obtidos / total de tarefas * 100
  // Range: 0% (todas atrasadas) a 200% (todas antecipadas)
  return Math.round((points / total) * 100);
};

export const useProductivityStats = (options: UseProductivityStatsOptions = {}) => {
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { scope = 'workspace', spaceId, userId, userIds, startDate, endDate } = options;
  
  // Suporta tanto userId quanto userIds (prioriza userIds)
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

      // Build query for completed tasks
      let query = supabase
        .from('tasks')
        .select(`
          id,
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

      // Apply date filters if provided
      if (startDate) {
        query = query.gte('completed_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('completed_at', endDate.toISOString());
      }

      const { data: tasks, error } = await query;

      if (error) throw error;

      // Filter by scope
      let filteredTasks = tasks || [];
      
      if (scope === 'my_tasks' && user?.id) {
        // Need to fetch task assignees
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
        // Filtrar por usuários específicos (suporta múltiplos)
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

      // Classify tasks
      let early = 0;
      let onTime = 0;
      let late = 0;
      let noDueDate = 0;

      filteredTasks.forEach(task => {
        if (!task.completed_at) return;
        
        const classification = classifyTask({
          completed_at: task.completed_at,
          due_date: task.due_date,
        });

        switch (classification) {
          case 'early': early++; break;
          case 'on_time': onTime++; break;
          case 'late': late++; break;
          case 'no_due_date': noDueDate++; break;
        }
      });

      const totalCompleted = early + onTime + late + noDueDate;
      const productivityScore = calculateScore(early, onTime, noDueDate, late);

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

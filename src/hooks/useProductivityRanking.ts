import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { differenceInDays, parseISO } from 'date-fns';

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
}

export interface ProductivityRankingResult {
  ranking: UserProductivityStats[];
  teamAverage: number;
  totalTasks: number;
}

interface UseProductivityRankingOptions {
  startDate?: Date;
  endDate?: Date;
}

type TaskClassification = 'early' | 'on_time' | 'late' | 'no_due_date';

const classifyTask = (completedAt: string, dueDate: string | null): TaskClassification => {
  if (!dueDate) return 'no_due_date';
  
  const completed = parseISO(completedAt);
  const due = parseISO(dueDate);
  const daysBeforeDue = differenceInDays(due, completed);
  
  if (daysBeforeDue >= 7) return 'early';
  if (daysBeforeDue >= 0) return 'on_time';
  return 'late';
};

const calculateScore = (early: number, onTime: number, noDueDate: number, late: number): number => {
  const total = early + onTime + noDueDate + late;
  if (total === 0) return 0;
  
  const points = (early * 2) + (onTime * 1) + (noDueDate * 1) + (late * 0);
  return Math.round((points / total) * 100);
};

export const useProductivityRanking = (options: UseProductivityRankingOptions = {}) => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  return useQuery({
    queryKey: ['productivity-ranking', workspaceId, options.startDate, options.endDate],
    queryFn: async (): Promise<ProductivityRankingResult> => {
      if (!workspaceId) {
        return { ranking: [], teamAverage: 0, totalTasks: 0 };
      }

      // 1. Buscar membros do workspace
      const { data: memberRows, error: membersError } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId);

      if (membersError) throw membersError;
      if (!memberRows || memberRows.length === 0) {
        return { ranking: [], teamAverage: 0, totalTasks: 0 };
      }

      const memberUserIds = memberRows.map(m => m.user_id);

      // 2. Buscar perfis dos membros
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', memberUserIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // 3. Buscar todas as tarefas concluídas do workspace
      let tasksQuery = supabase
        .from('tasks')
        .select(`
          id,
          completed_at,
          due_date
        `)
        .eq('workspace_id', workspaceId)
        .not('completed_at', 'is', null)
        .is('archived_at', null);

      if (options.startDate) {
        tasksQuery = tasksQuery.gte('completed_at', options.startDate.toISOString());
      }
      if (options.endDate) {
        tasksQuery = tasksQuery.lte('completed_at', options.endDate.toISOString());
      }

      const { data: tasks, error: tasksError } = await tasksQuery;
      if (tasksError) throw tasksError;

      const taskIds = tasks?.map(t => t.id) || [];
      if (taskIds.length === 0) {
        const emptyRanking: UserProductivityStats[] = memberRows.map(m => {
          const profile = profileMap.get(m.user_id);
          return {
            userId: m.user_id,
            userName: profile?.full_name || 'Usuário sem nome',
            avatarUrl: profile?.avatar_url || undefined,
            early: 0,
            onTime: 0,
            late: 0,
            noDueDate: 0,
            totalCompleted: 0,
            productivityScore: 0,
          };
        });
        return { ranking: emptyRanking, teamAverage: 0, totalTasks: 0 };
      }

      // 4. Buscar atribuições de tarefas
      const { data: assignees, error: assigneesError } = await supabase
        .from('task_assignees')
        .select('task_id, user_id')
        .in('task_id', taskIds);

      if (assigneesError) throw assigneesError;

      // 5. Criar mapa de tarefas por usuário
      const tasksByUser = new Map<string, typeof tasks>();
      
      for (const assignee of assignees || []) {
        const task = tasks?.find(t => t.id === assignee.task_id);
        if (task) {
          const userTasks = tasksByUser.get(assignee.user_id) || [];
          userTasks.push(task);
          tasksByUser.set(assignee.user_id, userTasks);
        }
      }

      // 6. Calcular stats para cada usuário
      const ranking: UserProductivityStats[] = memberRows.map(member => {
        const userTasks = tasksByUser.get(member.user_id) || [];
        const profile = profileMap.get(member.user_id);
        
        let early = 0;
        let onTime = 0;
        let late = 0;
        let noDueDate = 0;

        for (const task of userTasks) {
          if (!task.completed_at) continue;
          
          const classification = classifyTask(task.completed_at, task.due_date);
          switch (classification) {
            case 'early': early++; break;
            case 'on_time': onTime++; break;
            case 'late': late++; break;
            case 'no_due_date': noDueDate++; break;
          }
        }

        const totalCompleted = early + onTime + late + noDueDate;
        const productivityScore = calculateScore(early, onTime, noDueDate, late);

        return {
          userId: member.user_id,
          userName: profile?.full_name || 'Usuário sem nome',
          avatarUrl: profile?.avatar_url || undefined,
          early,
          onTime,
          late,
          noDueDate,
          totalCompleted,
          productivityScore,
        };
      });

      // 6. Ordenar por score (desc), depois por total (desc)
      ranking.sort((a, b) => {
        if (b.productivityScore !== a.productivityScore) {
          return b.productivityScore - a.productivityScore;
        }
        return b.totalCompleted - a.totalCompleted;
      });

      // 7. Calcular média da equipe
      const totalScore = ranking.reduce((sum, r) => sum + r.productivityScore, 0);
      const teamAverage = ranking.length > 0 ? Math.round(totalScore / ranking.length) : 0;
      const totalTasks = ranking.reduce((sum, r) => sum + r.totalCompleted, 0);

      return { ranking, teamAverage, totalTasks };
    },
    enabled: !!user && !!workspaceId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { startOfDay, isBefore } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';

import { ProductivityScope } from './useProductivityStats';

export interface DashboardCard {
  id: string;
  type: 'pie_chart' | 'bar_chart' | 'line_chart' | 'task_list' | 'calculation' | 'notes' | 'overdue_tasks' | 'priority_breakdown' | 'productivity' | 'productivity_ranking';
  title: string;
  config: {
    dataSource?: 'workspace' | 'space' | 'folder' | 'list';
    sourceId?: string;
    groupBy?: 'status' | 'priority' | 'assignee';
    timeRange?: 'week' | 'month' | 'quarter' | 'year';
    metric?: 'total' | 'completed' | 'overdue' | 'on_track';
    content?: string;
    scope?: ProductivityScope;
    spaceId?: string;
    userId?: string;      // Deprecated - use userIds
    userIds?: string[];   // Array de IDs de usuários para escopo 'user'
  };
  position: { x: number; y: number; w: number; h: number };
}

export interface DashboardConfig {
  cards: DashboardCard[];
  filters?: {
    dateRange?: { start: string; end: string };
    assignees?: string[];
    priorities?: string[];
    statuses?: string[];
  };
  autoRefresh?: number; // minutes
}

export interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  config: DashboardConfig;
  workspace_id: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export const useDashboards = () => {
  const { activeWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['dashboards', activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(d => ({
        ...d,
        config: (d.config as unknown as DashboardConfig) || { cards: [] }
      })) as Dashboard[];
    },
    enabled: !!activeWorkspace?.id,
  });
};

export const useDashboard = (dashboardId: string | undefined) => {
  return useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: async () => {
      if (!dashboardId) return null;

      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .eq('id', dashboardId)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        config: (data.config as unknown as DashboardConfig) || { cards: [] }
      } as Dashboard;
    },
    enabled: !!dashboardId,
  });
};

export const useCreateDashboard = () => {
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, description, config }: { 
      name: string; 
      description?: string;
      config?: DashboardConfig;
    }) => {
      if (!activeWorkspace?.id || !user?.id) {
        throw new Error('Workspace or user not found');
      }

      const { data, error } = await supabase
        .from('dashboards')
        .insert({
          name,
          description: description || null,
          config: (config || { cards: [] }) as unknown as Json,
          workspace_id: activeWorkspace.id,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Painel criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating dashboard:', error);
      toast.error('Erro ao criar painel');
    },
  });
};

export const useUpdateDashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description, config }: { 
      id: string;
      name?: string; 
      description?: string;
      config?: DashboardConfig;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (config !== undefined) updateData.config = config as unknown as Json;

      const { data, error } = await supabase
        .from('dashboards')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', data.id] });
      toast.success('Painel atualizado!');
    },
    onError: (error) => {
      console.error('Error updating dashboard:', error);
      toast.error('Erro ao atualizar painel');
    },
  });
};

export const useDeleteDashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dashboards')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Painel excluído!');
    },
    onError: (error) => {
      console.error('Error deleting dashboard:', error);
      toast.error('Erro ao excluir painel');
    },
  });
};

export const useDashboardStats = (dashboardId: string | undefined) => {
  const { activeWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['dashboard-stats', dashboardId, activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return null;

      // Fetch tasks for the workspace
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status_id,
          priority,
          due_date,
          completed_at,
          assignee_id,
          created_at,
          statuses:status_id (id, name, color)
        `)
        .eq('workspace_id', activeWorkspace.id)
        .is('archived_at', null);

      if (error) throw error;

      const now = new Date();
      const todayStart = startOfDay(now);
      const total = tasks?.length || 0;
      const completed = tasks?.filter(t => t.completed_at).length || 0;
      const overdue = tasks?.filter(t => 
        t.due_date && 
        isBefore(startOfDay(new Date(t.due_date)), todayStart) && 
        !t.completed_at
      ).length || 0;

      // Group by status
      const byStatus: Record<string, { count: number; color: string; name: string }> = {};
      tasks?.forEach(task => {
        const status = task.statuses as { id: string; name: string; color: string } | null;
        if (status) {
          if (!byStatus[status.id]) {
            byStatus[status.id] = { count: 0, color: status.color || '#6b7280', name: status.name };
          }
          byStatus[status.id].count++;
        }
      });

      // Group by priority
      const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
      tasks?.forEach(task => {
        if (task.priority) {
          byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
        }
      });

      // Group by assignee
      const byAssignee: Record<string, number> = {};
      tasks?.forEach(task => {
        if (task.assignee_id) {
          byAssignee[task.assignee_id] = (byAssignee[task.assignee_id] || 0) + 1;
        }
      });

      // Overdue tasks list
      const overdueTasks = tasks?.filter(t => 
        t.due_date && 
        isBefore(startOfDay(parseLocalDate(t.due_date)!), todayStart) && 
        !t.completed_at
      ).slice(0, 10) || [];

      return {
        total,
        completed,
        overdue,
        onTrack: total - completed - overdue,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        byStatus: Object.entries(byStatus).map(([id, data]) => ({
          id,
          name: data.name,
          value: data.count,
          color: data.color,
        })),
        byPriority: Object.entries(byPriority).map(([name, value]) => ({
          name,
          value,
        })),
        byAssignee: Object.entries(byAssignee).map(([id, value]) => ({
          id,
          value,
        })),
        overdueTasks,
      };
    },
    enabled: !!activeWorkspace?.id,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

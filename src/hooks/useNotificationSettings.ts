import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface NotificationSettingsData {
  id: string;
  workspace_id: string;
  task_assigned: boolean;
  comment_assigned: boolean;
  task_due_tomorrow: boolean;
  task_overdue: boolean;
  feed_new_post: boolean;
  space_permission_change: boolean;
  created_at: string;
  updated_at: string;
}

export const useNotificationSettings = () => {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  return useQuery({
    queryKey: ['notification-settings', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error) throw error;

      // Return defaults if no row exists
      if (!data) {
        return {
          task_assigned: true,
          comment_assigned: true,
          task_due_tomorrow: true,
          task_overdue: true,
          feed_new_post: true,
          space_permission_change: true,
        } as Partial<NotificationSettingsData>;
      }

      return data as NotificationSettingsData;
    },
    enabled: !!workspaceId,
  });
};

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  return useMutation({
    mutationFn: async (settings: Partial<NotificationSettingsData>) => {
      if (!workspaceId) throw new Error('No workspace selected');

      const { data, error } = await supabase
        .from('notification_settings')
        .upsert(
          {
            workspace_id: workspaceId,
            ...settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'workspace_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings', workspaceId] });
      toast.success('Configurações de notificação salvas!');
    },
    onError: () => {
      toast.error('Erro ao salvar configurações de notificação');
    },
  });
};

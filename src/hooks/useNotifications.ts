import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  workspace_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = (userId?: string) => {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!userId,
  });
};

export const useUnreadNotificationsCount = (userId?: string) => {
  return useQuery({
    queryKey: ['notifications-unread-count', userId],
    queryFn: async () => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
  });
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: {
      userId: string;
      workspaceId: string;
      type: string;
      title: string;
      message?: string;
      link?: string;
      referenceType?: string;
      referenceId?: string;
    }) => {
      // Não usar .select().single() pois a RLS de SELECT só permite ver próprias notificações
      // Isso causava falha ao criar notificação para outro usuário
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.userId,
          workspace_id: notification.workspaceId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          reference_type: notification.referenceType,
          reference_id: notification.referenceId,
        });

      if (error) throw error;
      
      // Retornar userId para invalidar as queries corretas
      return { user_id: notification.userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', data.user_id] });
    },
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      return { id, userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', data.userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', data.userId] });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return userId;
    },
    onSuccess: (userId) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', userId] });
    },
  });
};

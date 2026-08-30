import { useCallback, useMemo } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useAuth } from '@/contexts/AuthContext';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useNotificationsRealtime,
  useMarkNotificationAsRead,
  useMarkNotificationAsUnread,
  useMarkAllNotificationsAsRead,
  type Notification,
} from '@/hooks/useNotifications';
import { resolveNotificationLink } from './notificationMeta';

export function useNotificationCenter() {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();

  useNotificationsRealtime(userId);

  const { data: notifications = [], isLoading } = useNotifications(userId);
  const { data: unreadCount = 0 } = useUnreadNotificationsCount(userId);
  const markRead = useMarkNotificationAsRead();
  const markUnread = useMarkNotificationAsUnread();
  const markAllRead = useMarkAllNotificationsAsRead();

  const unread = useMemo(
    () => notifications.filter((n) => !n.is_read),
    [notifications]
  );

  const open = useCallback(
    (notification: Notification) => {
      if (!userId) return;
      if (!notification.is_read) {
        markRead.mutate({ id: notification.id, userId });
      }
      const link = resolveNotificationLink(notification);
      if (link) navigate(link);
    },
    [markRead, navigate, userId]
  );

  const toggleRead = useCallback(
    (notification: Notification) => {
      if (!userId) return;
      if (notification.is_read) {
        markUnread.mutate({ id: notification.id, userId });
      } else {
        markRead.mutate({ id: notification.id, userId });
      }
    },
    [markRead, markUnread, userId]
  );

  const markAll = useCallback(() => {
    if (!userId) return;
    markAllRead.mutate(userId);
  }, [markAllRead, userId]);

  return {
    userId,
    notifications,
    unread,
    unreadCount,
    isLoading,
    open,
    toggleRead,
    markAll,
  };
}

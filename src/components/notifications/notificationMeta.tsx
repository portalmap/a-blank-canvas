import {
  Bell,
  UserPlus,
  MessageSquare,
  Clock,
  AlertTriangle,
  Newspaper,
  ShieldPlus,
  ShieldMinus,
} from 'lucide-react';
import type { Notification } from '@/hooks/useNotifications';

export function getNotificationIcon(type: string) {
  switch (type) {
    case 'task_assigned':
      return <UserPlus className="h-4 w-4" />;
    case 'comment_assigned':
    case 'chat_comment_assigned':
    case 'mention':
      return <MessageSquare className="h-4 w-4" />;
    case 'task_due_tomorrow':
      return <Clock className="h-4 w-4" />;
    case 'task_overdue':
      return <AlertTriangle className="h-4 w-4" />;
    case 'feed_new_post':
      return <Newspaper className="h-4 w-4" />;
    case 'space_permission_added':
      return <ShieldPlus className="h-4 w-4" />;
    case 'space_permission_removed':
      return <ShieldMinus className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

/** Resolve o destino da notificação (link explícito ou derivado da referência). */
export function resolveNotificationLink(n: Notification): string | null {
  if (n.link) return n.link;
  if (!n.reference_id) return null;
  switch (n.reference_type) {
    case 'task':
      return `/task/${n.reference_id}`;
    case 'space':
      return `/space/${n.reference_id}`;
    case 'list':
      return `/list/${n.reference_id}`;
    case 'folder':
      return `/folder/${n.reference_id}`;
    case 'document':
      return `/documents/${n.reference_id}`;
    case 'feed_post':
      return '/';
    default:
      return null;
  }
}

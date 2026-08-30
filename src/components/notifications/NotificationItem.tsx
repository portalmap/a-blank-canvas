import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/hooks/useNotifications';
import { getNotificationIcon } from './notificationMeta';

interface NotificationItemProps {
  notification: Notification;
  onOpen: (notification: Notification) => void;
  onToggleRead: (notification: Notification) => void;
  /** Mostra o tempo acumulado de "ignorando" a notificação (usado no modal). */
  showIgnoredTime?: boolean;
}

export function NotificationItem({
  notification,
  onOpen,
  onToggleRead,
  showIgnoredTime = false,
}: NotificationItemProps) {
  const created = new Date(notification.created_at);
  const unread = !notification.is_read;

  return (
    <div
      className={cn(
        'flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors',
        unread ? 'border-primary/30 bg-accent/50' : 'border-transparent bg-muted/30'
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="flex flex-1 items-start gap-3 text-left"
      >
        <span
          className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
            unread ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          {getNotificationIcon(notification.type)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                'truncate text-sm',
                unread ? 'font-semibold text-foreground' : 'text-foreground/80'
              )}
            >
              {notification.title}
            </span>
            {unread && <Circle className="h-2 w-2 shrink-0 fill-primary text-primary" />}
          </span>
          {notification.message && (
            <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
              {notification.message}
            </span>
          )}
          <span className="mt-1 block text-xs text-muted-foreground">
            {format(created, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            {' · '}
            {formatDistanceToNow(created, { locale: ptBR, addSuffix: true })}
          </span>
          {showIgnoredTime && unread && (
            <span className="mt-0.5 block text-xs font-medium text-destructive">
              Aguardando sua atenção há{' '}
              {formatDistanceToNow(created, { locale: ptBR })}
            </span>
          )}
        </span>
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        title={unread ? 'Marcar como lida' : 'Marcar como não lida'}
        onClick={() => onToggleRead(notification)}
      >
        {unread ? (
          <Check className="h-4 w-4" />
        ) : (
          <Circle className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="sr-only">
          {unread ? 'Marcar como lida' : 'Marcar como não lida'}
        </span>
      </Button>
    </div>
  );
}

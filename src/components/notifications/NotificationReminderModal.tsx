import { AlarmClock, CheckCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Notification } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

interface NotificationReminderModalProps {
  open: boolean;
  notifications: Notification[];
  onOpenNotification: (notification: Notification) => void;
  onToggleRead: (notification: Notification) => void;
  onMarkAll: () => void;
  onSnooze: () => void;
}

export function NotificationReminderModal({
  open,
  notifications,
  onOpenNotification,
  onToggleRead,
  onMarkAll,
  onSnooze,
}: NotificationReminderModalProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-lg [&>button.absolute]:hidden"

        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            Você tem {notifications.length} notificação
            {notifications.length > 1 ? 'ões' : ''} não lida
            {notifications.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Da mais recente para a mais antiga. Clique para abrir (isso marca como lida) ou adie
            por 30 minutos.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-3">
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onOpen={onOpenNotification}
                onToggleRead={onToggleRead}
                showIgnoredTime
              />
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={onSnooze} className="gap-2">
            <AlarmClock className="h-4 w-4" />
            Adiar (30 min)
          </Button>
          <Button onClick={onMarkAll} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

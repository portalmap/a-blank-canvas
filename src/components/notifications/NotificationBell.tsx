import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Notification } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { useNotificationCenter } from './useNotificationCenter';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, isLoading, open: openNotification, toggleRead, markAll } =
    useNotificationCenter();

  const handleOpen = (n: Notification) => {
    setOpen(false);
    openNotification(n);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="text-sm font-semibold">
            Notificações
            {unreadCount > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAll}>
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="max-h-[420px]">
          <div className="flex flex-col gap-1.5 p-2">
            {isLoading && (
              <p className="p-4 text-center text-sm text-muted-foreground">Carregando...</p>
            )}
            {!isLoading && notifications.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma notificação por aqui.
              </p>
            )}
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onOpen={handleOpen}
                onToggleRead={toggleRead}
              />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

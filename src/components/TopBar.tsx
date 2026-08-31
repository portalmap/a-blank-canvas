import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationTicker } from '@/components/notifications/NotificationTicker';
import { SafeBoundary } from '@/components/SafeBoundary';

/** Faixa fina no topo (desktop): letreiro vivo de notificações + sino. */
export function TopBar() {
  return (
    <div className="hidden h-10 shrink-0 items-center gap-3 bg-background px-4 md:flex">
      <SafeBoundary name="notification-ticker">
        <NotificationTicker />
      </SafeBoundary>
      <SafeBoundary name="notification-bell">
        <NotificationBell />
      </SafeBoundary>
    </div>
  );
}

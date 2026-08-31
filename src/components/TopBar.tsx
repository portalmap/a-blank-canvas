import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SafeBoundary } from '@/components/SafeBoundary';

/** Faixa fina no topo (desktop), alinhada à direita, acima do cabeçalho de cada página. */
export function TopBar() {
  return (
    <div className="hidden h-10 shrink-0 items-center justify-end gap-1 border-b bg-background px-4 md:flex">
      <ThemeToggle />
      <SafeBoundary name="notification-bell">
        <NotificationBell />
      </SafeBoundary>
    </div>
  );
}


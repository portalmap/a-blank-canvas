import { useEffect, useMemo, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/hooks/useNotifications';
import { useNotificationCenter } from './useNotificationCenter';
import { pickMotivationalMessage } from './motivationalMessages';

const SPEED_PX_PER_SECOND = 60;
const MIN_DURATION = 18;

export function NotificationTicker() {
  const { unread, open } = useNotificationCenter();
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(MIN_DURATION);
  const [message, setMessage] = useState(() => pickMotivationalMessage());

  const hasUnread = unread.length > 0;

  // Sorteia nova frase sempre que a caixa fica limpa.
  useEffect(() => {
    if (!hasUnread) setMessage(pickMotivationalMessage());
  }, [hasUnread]);

  const items = useMemo(() => {
    if (hasUnread) return unread;
    return [] as Notification[];
  }, [hasUnread, unread]);

  // Ajusta a duração ao tamanho real do conteúdo (velocidade constante).
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const width = el.scrollWidth / 2;
    setDuration(Math.max(MIN_DURATION, width / SPEED_PX_PER_SECOND));
  }, [items, message]);

  const content = (
    <div className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={false}>
      {hasUnread
        ? items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => open(n)}
              className="flex shrink-0 items-center gap-2 text-sm font-semibold text-destructive hover:underline"
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
              </span>
              <span className="whitespace-nowrap">
                {n.title}
                {n.message ? ` — ${n.message}` : ''}
              </span>
            </button>
          ))
        : (
            <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
              {message}
            </span>
          )}
    </div>
  );

  return (
    <div className="group relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
      <Radio
        className={cn('h-4 w-4 shrink-0', hasUnread ? 'text-destructive' : 'text-muted-foreground')}
      />
      <div className="ticker-viewport relative min-w-0 flex-1 overflow-hidden">
        <div
          ref={trackRef}
          className="ticker-track flex w-max items-center group-hover:[animation-play-state:paused]"
          style={{ animationDuration: `${duration}s` }}
        >
          {content}
          {content}
        </div>
      </div>
    </div>
  );
}

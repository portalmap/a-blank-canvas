import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from '@/lib/router-compat';
import type { Notification } from '@/hooks/useNotifications';
import { NotificationReminderModal } from './NotificationReminderModal';
import { useNotificationCenter } from './useNotificationCenter';

const SNOOZE_MS = 30 * 60 * 1000; // 30 minutos — fixo, sem opção de desligar
const SNOOZE_PREFIX = 'notif_snooze_';

function readSnoozeUntil(userId: string): number {
  try {
    const raw = localStorage.getItem(SNOOZE_PREFIX + userId);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeSnoozeUntil(userId: string, until: number) {
  try {
    localStorage.setItem(SNOOZE_PREFIX + userId, String(until));
  } catch {
    /* ignore */
  }
}

/**
 * Controla o modal central de notificações não lidas:
 * - abre ao autenticar e a cada 30 minutos;
 * - reabre ao navegar para outra página (se não estiver adiado);
 * - fecha somente com "Adiar" (30 min) ou ao zerar as não lidas.
 */
export function NotificationReminderProvider() {
  const { userId, unread, open: openNotification, toggleRead, markAll } = useNotificationCenter();
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const snoozedUntilRef = useRef(0);
  const [tick, setTick] = useState(0);

  // Carrega o "adiar" persistido ao trocar de usuário.
  useEffect(() => {
    snoozedUntilRef.current = userId ? readSnoozeUntil(userId) : 0;
    setModalOpen(false);
    setTick((t) => t + 1);
  }, [userId]);

  // Timer que reavalia a abertura a cada minuto (cobre o ciclo de 30 min).
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const unreadCount = unread.length;

  // Decide a abertura: sem não lidas -> fechado; adiado -> fechado; senão abre.
  useEffect(() => {
    if (!userId) return;
    if (unreadCount === 0) {
      setModalOpen(false);
      return;
    }
    if (Date.now() < snoozedUntilRef.current) {
      setModalOpen(false);
      return;
    }
    // Depois de clicar numa notificação, deixa o usuário ver o destino:
    // o modal só volta quando ele navegar para outra página.
    const visiting = visitingRef.current;
    if (visiting) {
      if (visiting.path === null) {
        if (location.pathname !== visiting.from) {
          visitingRef.current = { from: visiting.from, path: location.pathname };
        }
        setModalOpen(false);
        return;
      }
      if (location.pathname === visiting.path) {
        setModalOpen(false);
        return;
      }
      visitingRef.current = null;
    }
    setModalOpen(true);
  }, [userId, unreadCount, location.pathname, tick]);

  const handleSnooze = useCallback(() => {
    const until = Date.now() + SNOOZE_MS;
    snoozedUntilRef.current = until;
    if (userId) writeSnoozeUntil(userId, until);
    visitingRef.current = null;
    setModalOpen(false);
  }, [userId]);

  const handleOpenNotification = useCallback(
    (n: Notification) => {
      visitingRef.current = { from: location.pathname, path: null };
      setModalOpen(false);
      openNotification(n);
    },
    [openNotification, location.pathname]
  );


  const handleMarkAll = useCallback(() => {
    markAll();
    setModalOpen(false);
  }, [markAll]);

  if (!userId || unreadCount === 0) return null;

  return (
    <NotificationReminderModal
      open={modalOpen}
      notifications={unread}
      onOpenNotification={handleOpenNotification}
      onToggleRead={toggleRead}
      onMarkAll={handleMarkAll}
      onSnooze={handleSnooze}
    />
  );
}

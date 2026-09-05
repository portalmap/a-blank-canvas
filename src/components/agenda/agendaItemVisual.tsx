import { CalendarDays, CheckCircle2, Target, UserMinus, type LucideIcon } from 'lucide-react';
import type { AgendaItemType } from '@/hooks/useAgenda';

/** Ícone de cada tipo de item da agenda (evento, tarefa, ausente, foco). */
export const AGENDA_ITEM_ICON: Record<AgendaItemType, LucideIcon> = {
  event: CalendarDays,
  task: CheckCircle2,
  out_of_office: UserMinus,
  focus_time: Target,
};

export function AgendaItemIcon({
  type,
  className = 'h-3 w-3 shrink-0',
}: {
  type: AgendaItemType | null | undefined;
  className?: string;
}) {
  const Icon = AGENDA_ITEM_ICON[(type ?? 'event') as AgendaItemType] ?? CalendarDays;
  return <Icon className={className} />;
}

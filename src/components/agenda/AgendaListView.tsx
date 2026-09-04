import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin } from 'lucide-react';
import type { CalendarEvent } from '@/hooks/useAgenda';

interface Props {
  days: Date[];
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDay: (day: Date) => void;
}

export function AgendaListView({ days, events, onSelectEvent, onSelectDay }: Props) {
  return (
    <div className="space-y-3">
      {days.map((day) => {
        const dayEvents = events
          .filter((e) => {
            const start = new Date(e.starts_at);
            const end = new Date(e.ends_at);
            return isSameDay(start, day) || (start < day && end > day);
          })
          .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

        const today = isSameDay(day, new Date());

        return (
          <div key={day.toISOString()} className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left hover:bg-accent/40"
            >
              <span className={`text-sm font-medium ${today ? 'text-primary' : 'text-foreground'}`}>
                {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
              <span className="text-xs text-muted-foreground">
                {dayEvents.length === 0 ? 'Nada marcado' : `${dayEvents.length} compromisso${dayEvents.length > 1 ? 's' : ''}`}
              </span>
            </button>

            {dayEvents.length > 0 && (
              <div className="divide-y divide-border">
                {dayEvents.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onSelectEvent(e)}
                    className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-accent/40"
                  >
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{e.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {e.all_day
                            ? 'Dia inteiro'
                            : `${format(new Date(e.starts_at), 'HH:mm')} – ${format(new Date(e.ends_at), 'HH:mm')}`}
                        </span>
                        {e.location && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" />
                            {e.location}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

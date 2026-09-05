import { useEffect, useMemo, useRef, useState } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CalendarEvent } from '@/hooks/useAgenda';
import { AgendaItemIcon } from '@/components/agenda/agendaItemVisual';

interface Props {
  days: Date[];
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (date: Date) => void;
}

const HOUR_HEIGHT = 48;
const MINUTE = HOUR_HEIGHT / 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Positioned {
  event: CalendarEvent;
  top: number;
  height: number;
  left: number;
  width: number;
}

function layoutDay(dayEvents: CalendarEvent[], day: Date): Positioned[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 24 * 3600_000;

  const items = dayEvents
    .map((event) => {
      const start = Math.max(new Date(event.starts_at).getTime(), dayStart);
      const end = Math.min(Math.max(new Date(event.ends_at).getTime(), start + 15 * 60_000), dayEnd);
      return { event, start, end };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  // Agrupa eventos que se cruzam no tempo para dividir a largura da coluna.
  const groups: (typeof items)[] = [];
  let current: typeof items = [];
  let groupEnd = 0;
  for (const item of items) {
    if (current.length && item.start >= groupEnd) {
      groups.push(current);
      current = [];
      groupEnd = 0;
    }
    current.push(item);
    groupEnd = Math.max(groupEnd, item.end);
  }
  if (current.length) groups.push(current);

  const out: Positioned[] = [];
  for (const group of groups) {
    const columns: (typeof items)[] = [];
    for (const item of group) {
      let placed = false;
      for (const col of columns) {
        const last = col[col.length - 1]!;
        if (item.start >= last.end) {
          col.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([item]);
    }
    const total = columns.length;
    columns.forEach((col, index) => {
      for (const item of col) {
        const startMin = (item.start - dayStart) / 60_000;
        const endMin = (item.end - dayStart) / 60_000;
        out.push({
          event: item.event,
          top: startMin * MINUTE,
          height: Math.max((endMin - startMin) * MINUTE, 22),
          left: (index / total) * 100,
          width: 100 / total,
        });
      }
    });
  }
  return out;
}

export function AgendaWeekView({ days, events, onSelectEvent, onSelectSlot }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
  }, []);

  const perDay = useMemo(
    () =>
      days.map((day) => {
        const all = events.filter((e) => {
          const start = new Date(e.starts_at);
          const end = new Date(e.ends_at);
          return isSameDay(start, day) || isSameDay(end, day) || (start < day && end > day);
        });
        return {
          day,
          allDay: all.filter((e) => e.all_day),
          timed: layoutDay(
            all.filter((e) => !e.all_day),
            day,
          ),
        };
      }),
    [days, events],
  );

  const hasAllDay = perDay.some((d) => d.allDay.length > 0);
  const cols = days.length;
  const gridCols = { gridTemplateColumns: `56px repeat(${cols}, minmax(120px, 1fr))` };

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <div className={cols > 1 ? 'min-w-[860px]' : 'min-w-full'}>
          {/* Cabeçalho dos dias */}
          <div className="grid border-b border-border bg-card" style={gridCols}>
            <div className="border-r border-border px-2 py-2 text-[11px] text-muted-foreground">
              {format(now, 'OOOO', { locale: ptBR }).replace('GMT', 'GMT')}
            </div>
            {perDay.map(({ day }) => {
              const today = isSameDay(day, now);
              return (
                <div key={day.toISOString()} className="border-r border-border px-2 py-2 text-center last:border-r-0">
                  <div className="text-[11px] uppercase text-muted-foreground">
                    {format(day, 'EEE', { locale: ptBR })}
                  </div>
                  <div
                    className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                      today ? 'bg-primary text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Faixa de dia inteiro */}
          {hasAllDay && (
            <div className="grid border-b border-border bg-muted/30" style={gridCols}>
              <div className="border-r border-border px-2 py-1.5 text-[11px] text-muted-foreground">Dia inteiro</div>
              {perDay.map(({ day, allDay }) => (
                <div key={day.toISOString()} className="space-y-1 border-r border-border p-1 last:border-r-0">
                  {allDay.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onSelectEvent(e)}
                      className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-primary-foreground"
                      style={{ backgroundColor: e.color }}
                    >
                      {e.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Grade de horários */}
          <div ref={scrollRef} className="max-h-[calc(100vh-19rem)] min-h-[420px] overflow-y-auto">
            <div className="grid" style={gridCols}>
              {/* Coluna de horas */}
              <div className="border-r border-border">
                {HOURS.map((h) => (
                  <div key={h} className="relative border-b border-border/60" style={{ height: HOUR_HEIGHT }}>
                    <span className="absolute -top-2 right-1.5 bg-card px-1 text-[11px] text-muted-foreground">
                      {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
                    </span>
                  </div>
                ))}
              </div>

              {perDay.map(({ day, timed }) => {
                const today = isSameDay(day, now);
                const nowTop = (now.getHours() * 60 + now.getMinutes()) * MINUTE;
                return (
                  <div key={day.toISOString()} className="relative border-r border-border last:border-r-0">
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        aria-label={`Criar compromisso às ${String(h).padStart(2, '0')}:00`}
                        onClick={() => {
                          const date = startOfDay(day);
                          date.setHours(h, 0, 0, 0);
                          onSelectSlot(date);
                        }}
                        className="block w-full border-b border-border/60 hover:bg-accent/40"
                        style={{ height: HOUR_HEIGHT }}
                      />
                    ))}

                    {timed.map(({ event, top, height, left, width }) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onSelectEvent(event)}
                        className="absolute overflow-hidden rounded border border-card/40 px-1.5 py-0.5 text-left text-[11px] leading-tight text-primary-foreground shadow-sm"
                        style={{
                          top,
                          height,
                          left: `calc(${left}% + 2px)`,
                          width: `calc(${width}% - 4px)`,
                          backgroundColor: event.color,
                        }}
                        title={event.title}
                      >
                        <span
                          className={`flex items-center gap-1 truncate font-semibold ${
                            event.completed_at ? 'line-through opacity-80' : ''
                          }`}
                        >
                          <AgendaItemIcon type={event.item_type} />
                          <span className="truncate">{event.title}</span>
                        </span>
                        {height > 32 && (
                          <span className="block truncate opacity-90">
                            {format(new Date(event.starts_at), 'HH:mm')} – {format(new Date(event.ends_at), 'HH:mm')}
                          </span>
                        )}
                      </button>
                    ))}

                    {today && (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-destructive"
                        style={{ top: nowTop }}
                      >
                        <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-destructive" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

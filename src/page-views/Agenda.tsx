import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgendaMonthView } from '@/components/agenda/AgendaMonthView';
import { AgendaListView } from '@/components/agenda/AgendaListView';
import { AgendaEventDialog } from '@/components/agenda/AgendaEventDialog';
import { GoogleAgendaButton } from '@/components/agenda/GoogleAgendaButton';
import { useAgendaEvents, type CalendarEvent } from '@/hooks/useAgenda';

type ViewMode = 'month' | 'week' | 'day';

export default function Agenda() {
  const [view, setView] = useState<ViewMode>('month');
  const [reference, setReference] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>(undefined);

  const { rangeStart, rangeEnd, days } = useMemo(() => {
    if (view === 'month') {
      const start = startOfWeek(startOfMonth(reference), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(reference), { weekStartsOn: 0 });
      return { rangeStart: start, rangeEnd: end, days: [] as Date[] };
    }
    if (view === 'week') {
      const start = startOfWeek(reference, { weekStartsOn: 0 });
      const end = endOfWeek(reference, { weekStartsOn: 0 });
      return {
        rangeStart: start,
        rangeEnd: end,
        days: Array.from({ length: 7 }, (_, i) => addDays(start, i)),
      };
    }
    return { rangeStart: startOfDay(reference), rangeEnd: endOfDay(reference), days: [startOfDay(reference)] };
  }, [view, reference]);

  const { data: events = [], isLoading } = useAgendaEvents(rangeStart, rangeEnd);

  const goPrev = () => {
    if (view === 'month') setReference((d) => subMonths(d, 1));
    else if (view === 'week') setReference((d) => subWeeks(d, 1));
    else setReference((d) => addDays(d, -1));
  };

  const goNext = () => {
    if (view === 'month') setReference((d) => addMonths(d, 1));
    else if (view === 'week') setReference((d) => addWeeks(d, 1));
    else setReference((d) => addDays(d, 1));
  };

  const openNew = (date?: Date) => {
    setSelectedEvent(null);
    setDefaultDate(date);
    setDialogOpen(true);
  };

  const openEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDefaultDate(undefined);
    setDialogOpen(true);
  };

  const periodLabel = useMemo(() => {
    if (view === 'month') return format(reference, "MMMM 'de' yyyy", { locale: ptBR });
    if (view === 'week') {
      const start = startOfWeek(reference, { weekStartsOn: 0 });
      const end = endOfWeek(reference, { weekStartsOn: 0 });
      return `${format(start, 'd MMM', { locale: ptBR })} – ${format(end, "d MMM yyyy", { locale: ptBR })}`;
    }
    return format(reference, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }, [view, reference]);

  return (
    <div className="container mx-auto space-y-5 p-3 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
            <CalendarDays className="h-6 w-6 text-brand" />
            Agenda
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seus compromissos, lembretes e convites em um só lugar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GoogleAgendaButton />
          <Button size="sm" onClick={() => openNew()}>
            <Plus className="mr-1.5 h-4 w-4" />
            Novo
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setReference(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext} aria-label="Próximo">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium capitalize text-foreground">{periodLabel}</span>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="month">Mês</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="day">Dia</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          Carregando agenda...
        </div>
      ) : view === 'month' ? (
        <AgendaMonthView
          reference={reference}
          events={events}
          onSelectDay={(day) => openNew(new Date(day.setHours(9, 0, 0, 0)))}
          onSelectEvent={openEvent}
        />
      ) : (
        <AgendaListView
          days={days}
          events={events}
          onSelectEvent={openEvent}
          onSelectDay={(day) => openNew(new Date(new Date(day).setHours(9, 0, 0, 0)))}
        />
      )}

      <AgendaEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
        defaultDate={defaultDate}
      />
    </div>
  );
}

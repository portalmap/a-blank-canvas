import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  color: string;
  reminder_minutes: number | null;
  google_event_id: string | null;
  google_html_link: string | null;
  source: string;
}

export interface CalendarGuest {
  id: string;
  event_id: string;
  user_id: string | null;
  email: string | null;
  display_name: string | null;
  response_status: string;
  invite_status: string;
  invite_error: string | null;
}

export interface EventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  color: string;
  reminder_minutes: number | null;
  guests: { user_id?: string | null; email?: string | null; display_name?: string | null }[];
}

const AGENDA_KEY = 'agenda-events';

export function useAgendaEvents(rangeStart: Date, rangeEnd: Date) {
  const { user } = useAuth();
  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();

  return useQuery({
    queryKey: [AGENDA_KEY, user?.id, startIso, endIso],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .is('deleted_at', null)
        .lt('starts_at', endIso)
        .gt('ends_at', startIso)
        .order('starts_at');
      if (error) throw error;
      return (data ?? []) as CalendarEvent[];
    },
  });
}

export function useEventGuests(eventId?: string) {
  return useQuery({
    queryKey: ['agenda-guests', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_event_guests')
        .select('*')
        .eq('event_id', eventId!);
      if (error) throw error;
      return (data ?? []) as CalendarGuest[];
    },
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [AGENDA_KEY] });
  queryClient.invalidateQueries({ queryKey: ['agenda-guests'] });
}

async function syncGuests(eventId: string, guests: EventInput['guests']) {
  const { data: existing } = await supabase
    .from('calendar_event_guests')
    .select('id, user_id, email')
    .eq('event_id', eventId);

  const keyOf = (g: { user_id?: string | null; email?: string | null }) =>
    g.user_id ? `u:${g.user_id}` : `e:${(g.email ?? '').toLowerCase()}`;

  const wanted = new Map(guests.map((g) => [keyOf(g), g]));
  const current = new Map((existing ?? []).map((g) => [keyOf(g), g]));

  const toRemove = (existing ?? []).filter((g) => !wanted.has(keyOf(g))).map((g) => g.id);
  if (toRemove.length) {
    await supabase.from('calendar_event_guests').delete().in('id', toRemove);
  }

  const toInsert = guests
    .filter((g) => !current.has(keyOf(g)))
    .map((g) => ({
      event_id: eventId,
      user_id: g.user_id ?? null,
      email: g.email ? g.email.trim().toLowerCase() : null,
      display_name: g.display_name ?? null,
    }));
  if (toInsert.length) {
    const { error } = await supabase.from('calendar_event_guests').insert(toInsert);
    if (error) throw error;
  }
}

async function scheduleReminder(event: { id: string; user_id: string; starts_at: string; reminder_minutes: number | null }) {
  await supabase.from('calendar_event_reminders').delete().eq('event_id', event.id).eq('user_id', event.user_id);
  if (!event.reminder_minutes) return;
  const fireAt = new Date(new Date(event.starts_at).getTime() - event.reminder_minutes * 60_000);
  await supabase.from('calendar_event_reminders').insert({
    event_id: event.id,
    user_id: event.user_id,
    fire_at: fireAt.toISOString(),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: EventInput) => {
      if (!user) throw new Error('Não autenticado');
      const { guests, ...rest } = input;
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({ ...rest, user_id: user.id })
        .select('*')
        .single();
      if (error) throw error;
      const event = data as CalendarEvent;
      await syncGuests(event.id, guests);
      await scheduleReminder(event);
      return event;
    },
    onSuccess: () => {
      invalidate(queryClient);
      toast.success('Compromisso criado');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao criar compromisso'),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...input }: EventInput & { id: string }) => {
      if (!user) throw new Error('Não autenticado');
      const { guests, ...rest } = input;
      const { data, error } = await supabase
        .from('calendar_events')
        .update(rest)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      const event = data as CalendarEvent;
      await syncGuests(id, guests);
      await scheduleReminder(event);
      return event;
    },
    onSuccess: () => {
      invalidate(queryClient);
      toast.success('Compromisso atualizado');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao atualizar compromisso'),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      invalidate(queryClient);
      toast.success('Compromisso excluído');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao excluir compromisso'),
  });
}

export function useRespondInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: 'accepted' | 'declined' }) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('calendar_event_guests')
        .update({ response_status: status })
        .eq('event_id', eventId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate(queryClient);
      toast.success('Resposta registrada');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao responder convite'),
  });
}

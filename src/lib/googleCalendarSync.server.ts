import {
  GATEWAY_BASE_URL,
  callAsAppUser,
} from '@/integrations/lovable/appUserConnector.server';
import { getConnectionKeyForUser } from '@/lib/appUserConnections.server';

export const GOOGLE_CONNECTOR_ID = 'google_calendar';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
];

type ItemType = 'event' | 'task' | 'out_of_office' | 'focus_time';

interface GoogleEvent {
  id: string;
  status?: string;
  etag?: string;
  eventType?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { email?: string; displayName?: string; responseStatus?: string; self?: boolean }[];
  outOfOfficeProperties?: { autoDeclineMode?: string };
  reminders?: { useDefault?: boolean; overrides?: { method: string; minutes: number }[] };
}

interface GoogleTask {
  id: string;
  etag?: string;
  title?: string;
  notes?: string;
  due?: string;
  status?: string;
  completed?: string;
  deleted?: boolean;
  updated?: string;
  webViewLink?: string;
}

/** Chamada genérica ao Google pelo gateway (calendar/v3 ou tasks/v1). */
async function googleApi(
  connectionAPIKey: string,
  api: 'calendar/v3' | 'tasks/v1',
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey,
    connectorId: GOOGLE_CONNECTOR_ID,
    path: `/${api}${path}`,
    init: {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

const google = (connectionAPIKey: string, path: string, init?: RequestInit) =>
  googleApi(connectionAPIKey, 'calendar/v3', path, init);

const googleTasks = (connectionAPIKey: string, path: string, init?: RequestInit) =>
  googleApi(connectionAPIKey, 'tasks/v1', path, init);

async function guestEmails(admin: any, eventId: string): Promise<{ email: string; displayName?: string }[]> {
  const { data: guests } = await admin
    .from('calendar_event_guests')
    .select('user_id, email, display_name')
    .eq('event_id', eventId);

  const out: { email: string; displayName?: string }[] = [];
  for (const g of guests ?? []) {
    if (g.email) {
      out.push({ email: g.email, displayName: g.display_name ?? undefined });
      continue;
    }
    if (g.user_id) {
      try {
        const { data } = await admin.auth.admin.getUserById(g.user_id);
        if (data?.user?.email) out.push({ email: data.user.email, displayName: g.display_name ?? undefined });
      } catch {
        /* ignore */
      }
    }
  }
  return out;
}

const EVENT_TYPE_TO_LOCAL: Record<string, ItemType> = {
  default: 'event',
  outOfOffice: 'out_of_office',
  focusTime: 'focus_time',
};

const LOCAL_TO_EVENT_TYPE: Record<ItemType, string> = {
  event: 'default',
  task: 'default',
  out_of_office: 'outOfOffice',
  focus_time: 'focusTime',
};

function toGooglePayload(event: any, attendees: { email: string; displayName?: string }[]) {
  const itemType: ItemType = (event.item_type ?? 'event') as ItemType;
  const payload: Record<string, unknown> = {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
  };
  if (event.all_day) {
    const startDate = new Date(event.starts_at).toISOString().slice(0, 10);
    const endExclusive = new Date(new Date(event.ends_at).getTime() + 24 * 3600_000)
      .toISOString()
      .slice(0, 10);
    payload['start'] = { date: startDate };
    payload['end'] = { date: endExclusive };
  } else {
    payload['start'] = { dateTime: new Date(event.starts_at).toISOString() };
    payload['end'] = { dateTime: new Date(event.ends_at).toISOString() };
  }
  // Ausência e hora de se concentrar não aceitam convidados no Google.
  if (itemType === 'event' && attendees.length) payload['attendees'] = attendees;
  if (itemType === 'out_of_office') {
    payload['eventType'] = 'outOfOffice';
    payload['transparency'] = 'opaque';
    payload['outOfOfficeProperties'] = {
      autoDeclineMode: event.auto_decline ? 'declineAllConflictingInvitations' : 'declineNone',
    };
  } else if (itemType === 'focus_time') {
    payload['eventType'] = 'focusTime';
    payload['transparency'] = 'opaque';
  }
  payload['reminders'] = event.reminder_minutes
    ? { useDefault: false, overrides: [{ method: 'popup', minutes: event.reminder_minutes }] }
    : { useDefault: true };
  return payload;
}

function fromGoogleEvent(ev: GoogleEvent, userId: string, calendarId: string) {
  const allDay = !!ev.start?.date;
  const startsAt = allDay
    ? new Date(`${ev.start!.date}T00:00:00`)
    : new Date(ev.start?.dateTime ?? Date.now());
  const endsAt = allDay
    ? new Date(new Date(`${ev.end?.date ?? ev.start!.date}T00:00:00`).getTime() - 1000)
    : new Date(ev.end?.dateTime ?? startsAt.getTime() + 3600_000);
  const reminder = ev.reminders?.overrides?.[0]?.minutes ?? null;
  const self = (ev.attendees ?? []).find((a) => a.self);

  return {
    user_id: userId,
    title: ev.summary?.trim() || '(sem título)',
    description: ev.description ?? null,
    location: ev.location ?? null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    all_day: allDay,
    reminder_minutes: reminder,
    item_type: EVENT_TYPE_TO_LOCAL[ev.eventType ?? 'default'] ?? 'event',
    auto_decline:
      ev.outOfOfficeProperties?.autoDeclineMode === 'declineAllConflictingInvitations' ||
      ev.outOfOfficeProperties?.autoDeclineMode === 'declineOnlyNewConflictingInvitations',
    response_status: self?.responseStatus ?? null,
    google_event_id: ev.id,
    google_calendar_id: calendarId,
    google_etag: ev.etag ?? null,
    google_html_link: ev.htmlLink ?? null,
    source: 'google',
    last_synced_at: new Date().toISOString(),
    deleted_at: null,
  };
}

function taskDue(task: GoogleTask): { starts: Date; ends: Date } | null {
  if (!task.due) return null;
  const due = new Date(task.due);
  if (Number.isNaN(due.getTime())) return null;
  const day = due.toISOString().slice(0, 10);
  return { starts: new Date(`${day}T00:00:00`), ends: new Date(`${day}T23:59:59`) };
}

function fromGoogleTask(task: GoogleTask, userId: string, listId: string) {
  const range = taskDue(task);
  const starts = range?.starts ?? new Date();
  const ends = range?.ends ?? new Date(starts.getTime() + 3600_000);
  return {
    user_id: userId,
    title: task.title?.trim() || '(sem título)',
    description: task.notes ?? null,
    location: null,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    all_day: true,
    item_type: 'task' as ItemType,
    completed_at: task.status === 'completed' ? task.completed ?? new Date().toISOString() : null,
    google_task_id: task.id,
    google_task_list_id: listId,
    google_etag: task.etag ?? null,
    source: 'google',
    last_synced_at: new Date().toISOString(),
    deleted_at: null,
  };
}

async function markOffline(admin: any, userId: string, message: string) {
  await admin
    .from('calendar_google_accounts')
    .update({ status: 'offline', last_error: message.slice(0, 500) })
    .eq('user_id', userId);
}

export interface SyncResult {
  connected: boolean;
  pushed: number;
  pulled: number;
  removed: number;
  error?: string;
}

export async function syncUserGoogleCalendar(userId: string): Promise<SyncResult> {
  const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');

  const connectionAPIKey = await getConnectionKeyForUser(userId, GOOGLE_CONNECTOR_ID);
  if (!connectionAPIKey) {
    return { connected: false, pushed: 0, pulled: 0, removed: 0 };
  }

  const { data: account } = await admin
    .from('calendar_google_accounts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const calendarId = account?.calendar_id || 'primary';
  let pushed = 0;
  let pulled = 0;
  let removed = 0;

  // Identify the Google account (also validates the credential).
  const profileRes = await google(connectionAPIKey, `/calendars/${encodeURIComponent(calendarId)}`);
  if (!profileRes.ok) {
    const message = typeof profileRes.body === 'string' ? profileRes.body : JSON.stringify(profileRes.body);
    await markOffline(admin, userId, `(${profileRes.status}) ${message}`);
    return { connected: true, pushed: 0, pulled: 0, removed: 0, error: message };
  }
  const googleEmail: string | null = profileRes.body?.id ?? null;

  // ---------- PUSH ----------
  const { data: localEvents } = await admin
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId);

  for (const event of localEvents ?? []) {
    try {
      const itemType: ItemType = (event.item_type ?? 'event') as ItemType;

      // ----- Tarefas: espelhadas na lista de tarefas do Google -----
      if (itemType === 'task') {
        const listId = event.google_task_list_id || '@default';
        const body: Record<string, unknown> = {
          title: event.title,
          notes: event.description ?? undefined,
          due: new Date(event.starts_at).toISOString(),
          status: event.completed_at ? 'completed' : 'needsAction',
        };
        if (event.completed_at) body['completed'] = new Date(event.completed_at).toISOString();

        if (event.deleted_at) {
          if (event.google_task_id) {
            await googleTasks(
              connectionAPIKey,
              `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(event.google_task_id)}`,
              { method: 'DELETE' },
            );
          }
          await admin.from('calendar_events').delete().eq('id', event.id);
          removed += 1;
          continue;
        }

        if (!event.google_task_id) {
          const res = await googleTasks(connectionAPIKey, `/lists/${encodeURIComponent(listId)}/tasks`, {
            method: 'POST',
            body: JSON.stringify(body),
          });
          if (res.ok && res.body?.id) {
            await admin
              .from('calendar_events')
              .update({
                google_task_id: res.body.id,
                google_task_list_id: listId,
                google_etag: res.body.etag ?? null,
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', event.id);
            pushed += 1;
          }
          continue;
        }

        const lastSyncedTask = event.last_synced_at ? new Date(event.last_synced_at).getTime() : 0;
        if (new Date(event.updated_at).getTime() > lastSyncedTask + 1000) {
          const res = await googleTasks(
            connectionAPIKey,
            `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(event.google_task_id)}`,
            { method: 'PATCH', body: JSON.stringify(body) },
          );
          if (res.ok) {
            await admin
              .from('calendar_events')
              .update({ google_etag: res.body?.etag ?? null, last_synced_at: new Date().toISOString() })
              .eq('id', event.id);
            pushed += 1;
          }
        }
        continue;
      }

      // ----- Eventos, ausência e hora de se concentrar -----
      // Itens importados de outras agendas (convites de terceiros) não são reenviados.
      const importedFromOther =
        event.source === 'google' &&
        event.google_calendar_id &&
        event.google_calendar_id !== calendarId;

      if (event.deleted_at) {
        if (event.google_event_id && !importedFromOther) {
          await google(
            connectionAPIKey,
            `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.google_event_id)}?sendUpdates=all`,
            { method: 'DELETE' },
          );
        }
        await admin.from('calendar_events').delete().eq('id', event.id);
        removed += 1;
        continue;
      }

      if (importedFromOther) continue;

      if (!event.google_event_id) {
        const attendees = await guestEmails(admin, event.id);
        const res = await google(
          connectionAPIKey,
          `/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
          { method: 'POST', body: JSON.stringify(toGooglePayload(event, attendees)) },
        );
        if (res.ok && res.body?.id) {
          await admin
            .from('calendar_events')
            .update({
              google_event_id: res.body.id,
              google_calendar_id: calendarId,
              google_etag: res.body.etag ?? null,
              google_html_link: res.body.htmlLink ?? null,
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', event.id);
          await admin
            .from('calendar_event_guests')
            .update({ invite_status: 'sent', invited_at: new Date().toISOString() })
            .eq('event_id', event.id)
            .neq('invite_status', 'sent');
          pushed += 1;
        }
        continue;
      }

      const lastSynced = event.last_synced_at ? new Date(event.last_synced_at).getTime() : 0;
      if (new Date(event.updated_at).getTime() > lastSynced + 1000) {
        const attendees = await guestEmails(admin, event.id);
        const res = await google(
          connectionAPIKey,
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.google_event_id)}?sendUpdates=all`,
          { method: 'PATCH', body: JSON.stringify(toGooglePayload(event, attendees)) },
        );
        if (res.ok) {
          await admin
            .from('calendar_events')
            .update({
              google_etag: res.body?.etag ?? null,
              google_html_link: res.body?.htmlLink ?? event.google_html_link,
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', event.id);
          await admin
            .from('calendar_event_guests')
            .update({ invite_status: 'sent', invited_at: new Date().toISOString() })
            .eq('event_id', event.id)
            .neq('invite_status', 'sent');
          pushed += 1;
        }
      }
    } catch {
      /* keep syncing the remaining events */
    }
  }

  // ---------- PULL: agendas ----------
  const syncTokens: Record<string, string> =
    account?.sync_tokens && typeof account.sync_tokens === 'object'
      ? { ...(account.sync_tokens as Record<string, string>) }
      : {};
  if (account?.sync_token && !syncTokens[calendarId]) syncTokens[calendarId] = account.sync_token;

  const startedAt = Date.now();
  const MAX_SYNC_MS = 25_000;

  // Todas as agendas acessíveis (a principal e as compartilhadas/convites).
  const calendarIds: string[] = [calendarId];
  const listRes = await google(connectionAPIKey, '/users/me/calendarList?maxResults=250');
  if (listRes.ok) {
    for (const cal of (listRes.body?.items ?? []) as { id?: string }[]) {
      if (cal.id && !calendarIds.includes(cal.id)) calendarIds.push(cal.id);
    }
  }

  for (const calId of calendarIds) {
    if (Date.now() - startedAt > MAX_SYNC_MS) break;
    let syncToken: string | null = syncTokens[calId] ?? null;
    let pageToken: string | null = null;
    let nextSyncToken: string | null = null;
    let guard = 0;

    do {
      const params = new URLSearchParams();
      params.set('singleEvents', 'true');
      params.set('showDeleted', 'true');
      params.set('maxResults', '250');
      if (syncToken) params.set('syncToken', syncToken);
      else {
        // Janela padrão: 30 dias atrás até 180 dias à frente.
        const from = new Date();
        from.setDate(from.getDate() - 30);
        const to = new Date();
        to.setDate(to.getDate() + 180);
        params.set('timeMin', from.toISOString());
        params.set('timeMax', to.toISOString());
      }
      if (pageToken) params.set('pageToken', pageToken);

      const res = await google(
        connectionAPIKey,
        `/calendars/${encodeURIComponent(calId)}/events?${params.toString()}`,
      );

      if (!res.ok) {
        if (res.status === 410 && syncToken) {
          // Sync token expired: restart a full sync.
          syncToken = null;
          pageToken = null;
          continue;
        }
        if (calId === calendarId) {
          const message = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
          await markOffline(admin, userId, `(${res.status}) ${message}`);
          return { connected: true, pushed, pulled, removed, error: message };
        }
        break;
      }

      for (const ev of (res.body?.items ?? []) as GoogleEvent[]) {
        if (!ev.id) continue;
        if (ev.status === 'cancelled') {
          const { error } = await admin
            .from('calendar_events')
            .delete()
            .eq('user_id', userId)
            .eq('google_event_id', ev.id);
          if (!error) removed += 1;
          continue;
        }
        const row = fromGoogleEvent(ev, userId, calId);
        const { data: existing } = await admin
          .from('calendar_events')
          .select('id, google_etag')
          .eq('user_id', userId)
          .eq('google_event_id', ev.id)
          .maybeSingle();

        let localId = existing?.id ?? null;
        if (existing) {
          if (existing.google_etag === row.google_etag) continue;
          await admin.from('calendar_events').update(row).eq('id', existing.id);
        } else {
          const { data: inserted } = await admin
            .from('calendar_events')
            .insert({ ...row, color: '#0ea5e9' })
            .select('id')
            .maybeSingle();
          localId = inserted?.id ?? null;
        }

        // Espelha a resposta de cada convidado (Sim/Não/Talvez) vinda do Google.
        if (localId && (ev.attendees ?? []).length) {
          for (const attendee of ev.attendees ?? []) {
            const email = attendee.email?.trim().toLowerCase();
            if (!email) continue;
            await admin
              .from('calendar_event_guests')
              .update({ response_status: attendee.responseStatus ?? 'needsAction' })
              .eq('event_id', localId)
              .eq('email', email);
          }
        }
        pulled += 1;
      }

      pageToken = res.body?.nextPageToken ?? null;
      nextSyncToken = res.body?.nextSyncToken ?? nextSyncToken;
      guard += 1;
    } while (pageToken && guard < 20 && Date.now() - startedAt < MAX_SYNC_MS);

    if (nextSyncToken) syncTokens[calId] = nextSyncToken;
  }

  // ---------- PULL: tarefas do Google ----------
  try {
    const listsRes = await googleTasks(connectionAPIKey, '/users/@me/lists?maxResults=100');
    const lists = (listsRes.ok ? listsRes.body?.items ?? [] : []) as { id?: string }[];
    for (const list of lists) {
      if (!list.id) continue;
      if (Date.now() - startedAt > MAX_SYNC_MS + 10_000) break;
      const params = new URLSearchParams({
        showCompleted: 'true',
        showHidden: 'true',
        showDeleted: 'true',
        maxResults: '100',
      });
      const res = await googleTasks(
        connectionAPIKey,
        `/lists/${encodeURIComponent(list.id)}/tasks?${params.toString()}`,
      );
      if (!res.ok) continue;

      for (const task of (res.body?.items ?? []) as GoogleTask[]) {
        if (!task.id) continue;
        const { data: existing } = await admin
          .from('calendar_events')
          .select('id, google_etag')
          .eq('user_id', userId)
          .eq('google_task_id', task.id)
          .maybeSingle();

        if (task.deleted) {
          if (existing) {
            await admin.from('calendar_events').delete().eq('id', existing.id);
            removed += 1;
          }
          continue;
        }
        // Tarefas sem data não têm lugar na agenda.
        if (!task.due) continue;

        const row = fromGoogleTask(task, userId, list.id);
        if (existing) {
          if (existing.google_etag && existing.google_etag === row.google_etag) continue;
          await admin.from('calendar_events').update(row).eq('id', existing.id);
        } else {
          await admin.from('calendar_events').insert({ ...row, color: '#22c55e' });
        }
        pulled += 1;
      }
    }
  } catch {
    /* tarefas do Google indisponíveis: a agenda continua funcionando */
  }

  await admin.from('calendar_google_accounts').upsert(
    {
      user_id: userId,
      google_email: googleEmail,
      calendar_id: calendarId,
      status: 'online',
      sync_token: syncTokens[calendarId] ?? null,
      sync_tokens: syncTokens,
      last_synced_at: new Date().toISOString(),
      last_error: null,
    },
    { onConflict: 'user_id' },
  );

  return { connected: true, pushed, pulled, removed };
}

/**
 * Envia ao Google a resposta do usuário (accepted/declined/tentative) para um
 * compromisso já sincronizado. Retorna { pushed: false } quando não há Google.
 */
export async function pushRsvpToGoogle(
  userId: string,
  eventId: string,
  status: 'accepted' | 'declined' | 'tentative',
): Promise<{ pushed: boolean; reason?: string }> {
  const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');

  const connectionAPIKey = await getConnectionKeyForUser(userId, GOOGLE_CONNECTOR_ID);
  if (!connectionAPIKey) return { pushed: false, reason: 'sem-conexao' };

  const { data: event } = await admin
    .from('calendar_events')
    .select('google_event_id, google_calendar_id, item_type')
    .eq('id', eventId)
    .maybeSingle();

  if (!event?.google_event_id) return { pushed: false, reason: 'sem-evento-google' };
  if (event.item_type === 'task') return { pushed: false, reason: 'tarefa-sem-rsvp' };

  const calendarId = event.google_calendar_id || 'primary';
  const path = `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.google_event_id)}`;

  const current = await google(connectionAPIKey, path);
  if (!current.ok) {
    const message = typeof current.body === 'string' ? current.body : JSON.stringify(current.body);
    return { pushed: false, reason: message };
  }

  const attendees = (current.body?.attendees ?? []) as NonNullable<GoogleEvent['attendees']>;
  const updated = attendees.map((a) => (a.self ? { ...a, responseStatus: status } : a));
  if (!updated.some((a) => a.self)) return { pushed: false, reason: 'sem-convite-para-o-usuario' };

  const res = await google(connectionAPIKey, `${path}?sendUpdates=all`, {
    method: 'PATCH',
    body: JSON.stringify({ attendees: updated }),
  });
  if (!res.ok) {
    const message = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
    return { pushed: false, reason: message };
  }

  await admin
    .from('calendar_events')
    .update({ response_status: status, last_synced_at: new Date().toISOString() })
    .eq('id', eventId);

  return { pushed: true };
}

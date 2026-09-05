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
];

interface GoogleEvent {
  id: string;
  status?: string;
  etag?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { email?: string; displayName?: string; responseStatus?: string }[];
  reminders?: { useDefault?: boolean; overrides?: { method: string; minutes: number }[] };
}

async function google(
  connectionAPIKey: string,
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey,
    connectorId: GOOGLE_CONNECTOR_ID,
    path: `/calendar/v3${path}`,
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

function toGooglePayload(event: any, attendees: { email: string; displayName?: string }[]) {
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
  if (attendees.length) payload['attendees'] = attendees;
  payload['reminders'] = event.reminder_minutes
    ? { useDefault: false, overrides: [{ method: 'popup', minutes: event.reminder_minutes }] }
    : { useDefault: true };
  return payload;
}

function fromGoogleEvent(ev: GoogleEvent, userId: string) {
  const allDay = !!ev.start?.date;
  const startsAt = allDay
    ? new Date(`${ev.start!.date}T00:00:00`)
    : new Date(ev.start?.dateTime ?? Date.now());
  const endsAt = allDay
    ? new Date(new Date(`${ev.end?.date ?? ev.start!.date}T00:00:00`).getTime() - 1000)
    : new Date(ev.end?.dateTime ?? startsAt.getTime() + 3600_000);
  const reminder = ev.reminders?.overrides?.[0]?.minutes ?? null;

  return {
    user_id: userId,
    title: ev.summary?.trim() || '(sem título)',
    description: ev.description ?? null,
    location: ev.location ?? null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    all_day: allDay,
    reminder_minutes: reminder,
    google_event_id: ev.id,
    google_etag: ev.etag ?? null,
    google_html_link: ev.htmlLink ?? null,
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
      if (event.deleted_at) {
        if (event.google_event_id) {
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
          pushed += 1;
        }
      }
    } catch {
      /* keep syncing the remaining events */
    }
  }

  // ---------- PULL ----------
  let syncToken: string | null = account?.sync_token ?? null;
  let pageToken: string | null = null;
  let nextSyncToken: string | null = null;
  let guard = 0;
  const startedAt = Date.now();
  const MAX_SYNC_MS = 25_000;

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
      `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    );

    if (!res.ok) {
      if (res.status === 410 && syncToken) {
        // Sync token expired: restart a full sync.
        syncToken = null;
        pageToken = null;
        continue;
      }
      const message = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
      await markOffline(admin, userId, `(${res.status}) ${message}`);
      return { connected: true, pushed, pulled, removed, error: message };
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
      const row = fromGoogleEvent(ev, userId);
      const { data: existing } = await admin
        .from('calendar_events')
        .select('id, google_etag, color')
        .eq('user_id', userId)
        .eq('google_event_id', ev.id)
        .maybeSingle();

      if (existing) {
        if (existing.google_etag === row.google_etag) continue;
        await admin.from('calendar_events').update(row).eq('id', existing.id);
      } else {
        await admin.from('calendar_events').insert({ ...row, color: '#0ea5e9' });
      }
      pulled += 1;
    }

    pageToken = res.body?.nextPageToken ?? null;
    nextSyncToken = res.body?.nextSyncToken ?? nextSyncToken;
    guard += 1;
  } while (pageToken && guard < 20 && Date.now() - startedAt < MAX_SYNC_MS);

  await admin.from('calendar_google_accounts').upsert(
    {
      user_id: userId,
      google_email: googleEmail,
      calendar_id: calendarId,
      status: 'online',
      sync_token: nextSyncToken,
      last_synced_at: new Date().toISOString(),
      last_error: null,
    },
    { onConflict: 'user_id' },
  );

  return { connected: true, pushed, pulled, removed };
}

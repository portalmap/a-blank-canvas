-- ============ calendar_events ============
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  color text NOT NULL DEFAULT '#3b82f6',
  reminder_minutes integer,
  google_event_id text,
  google_calendar_id text,
  google_etag text,
  google_html_link text,
  source text NOT NULL DEFAULT 'local',
  last_synced_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX calendar_events_user_google_event_uniq
  ON public.calendar_events (user_id, google_event_id)
  WHERE google_event_id IS NOT NULL;
CREATE INDEX calendar_events_user_range_idx ON public.calendar_events (user_id, starts_at, ends_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- ============ calendar_event_guests ============
CREATE TABLE public.calendar_event_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid,
  email text,
  display_name text,
  response_status text NOT NULL DEFAULT 'needsAction',
  invite_status text NOT NULL DEFAULT 'pending',
  invite_error text,
  invited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_event_guests_target_chk CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

CREATE UNIQUE INDEX calendar_event_guests_user_uniq
  ON public.calendar_event_guests (event_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX calendar_event_guests_email_uniq
  ON public.calendar_event_guests (event_id, lower(email)) WHERE email IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_event_guests TO authenticated;
GRANT ALL ON public.calendar_event_guests TO service_role;
ALTER TABLE public.calendar_event_guests ENABLE ROW LEVEL SECURITY;

-- ============ calendar_event_reminders ============
CREATE TABLE public.calendar_event_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  fire_at timestamptz NOT NULL,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, fire_at)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_event_reminders TO authenticated;
GRANT ALL ON public.calendar_event_reminders TO service_role;
ALTER TABLE public.calendar_event_reminders ENABLE ROW LEVEL SECURITY;

-- ============ calendar_google_accounts ============
CREATE TABLE public.calendar_google_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  google_email text,
  calendar_id text NOT NULL DEFAULT 'primary',
  status text NOT NULL DEFAULT 'online',
  sync_token text,
  last_synced_at timestamptz,
  last_error text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_google_accounts TO authenticated;
GRANT ALL ON public.calendar_google_accounts TO service_role;
ALTER TABLE public.calendar_google_accounts ENABLE ROW LEVEL SECURITY;

-- ============ app_user_connections (server-only) ============
CREATE TABLE public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

-- ============ helper ============
CREATE OR REPLACE FUNCTION public.user_can_access_calendar_event(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = _event_id AND e.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.calendar_event_guests g
    WHERE g.event_id = _event_id AND g.user_id = _user_id
  )
$$;

-- ============ policies ============
CREATE POLICY "Owner manages own events"
ON public.calendar_events FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Guests can view invited events"
ON public.calendar_events FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.calendar_event_guests g
  WHERE g.event_id = calendar_events.id AND g.user_id = auth.uid()
));

CREATE POLICY "Event owner manages guests"
ON public.calendar_event_guests FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.calendar_events e
  WHERE e.id = calendar_event_guests.event_id AND e.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.calendar_events e
  WHERE e.id = calendar_event_guests.event_id AND e.user_id = auth.uid()
));

CREATE POLICY "Guest can view own invitation"
ON public.calendar_event_guests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.user_can_access_calendar_event(auth.uid(), event_id));

CREATE POLICY "Guest can update own response"
ON public.calendar_event_guests FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own reminders"
ON public.calendar_event_reminders FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own google account"
ON public.calendar_google_accounts FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Global admins view all google accounts"
ON public.calendar_google_accounts FOR SELECT TO authenticated
USING (public.is_global_owner(auth.uid()) OR public.is_system_admin(auth.uid()));

CREATE POLICY "Global admins remove google accounts"
ON public.calendar_google_accounts FOR DELETE TO authenticated
USING (public.is_global_owner(auth.uid()) OR public.is_system_admin(auth.uid()));

-- ============ updated_at triggers ============
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_event_guests_updated_at
BEFORE UPDATE ON public.calendar_event_guests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_google_accounts_updated_at
BEFORE UPDATE ON public.calendar_google_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_user_connections_updated_at
BEFORE UPDATE ON public.app_user_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- realtime
ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
CREATE OR REPLACE FUNCTION public.user_is_calendar_event_guest(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_event_guests g
    WHERE g.event_id = _event_id AND g.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.user_owns_calendar_event(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = _event_id AND e.user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Guests can view invited events" ON public.calendar_events;
CREATE POLICY "Guests can view invited events"
ON public.calendar_events
FOR SELECT
TO authenticated
USING (public.user_is_calendar_event_guest(auth.uid(), id));

DROP POLICY IF EXISTS "Guest can view own invitation" ON public.calendar_event_guests;
CREATE POLICY "Guest can view own invitation"
ON public.calendar_event_guests
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.user_owns_calendar_event(auth.uid(), event_id));

DROP POLICY IF EXISTS "Event owner manages guests" ON public.calendar_event_guests;
CREATE POLICY "Event owner manages guests"
ON public.calendar_event_guests
FOR ALL
TO authenticated
USING (public.user_owns_calendar_event(auth.uid(), event_id))
WITH CHECK (public.user_owns_calendar_event(auth.uid(), event_id));
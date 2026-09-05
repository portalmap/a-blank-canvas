-- 1) Módulo Gestão: convidados
CREATE TABLE public.management_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  granted_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.management_members TO authenticated;
GRANT ALL ON public.management_members TO service_role;

ALTER TABLE public.management_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_management(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_global_owner(_user_id)
    OR public.is_system_admin(_user_id)
    OR EXISTS (SELECT 1 FROM public.management_members m WHERE m.user_id = _user_id)
$$;

CREATE POLICY "management_members_select"
ON public.management_members FOR SELECT TO authenticated
USING (public.can_access_management(auth.uid()));

CREATE POLICY "management_members_admin_write"
ON public.management_members FOR ALL TO authenticated
USING (public.is_global_owner(auth.uid()) OR public.is_system_admin(auth.uid()))
WITH CHECK (public.is_global_owner(auth.uid()) OR public.is_system_admin(auth.uid()));

-- 2) Link/código do Meet nos eventos
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS hangout_link text,
  ADD COLUMN IF NOT EXISTS meet_code text;

CREATE INDEX IF NOT EXISTS idx_calendar_events_meet_code ON public.calendar_events (meet_code) WHERE meet_code IS NOT NULL;

-- 3) Conferências (reuniões realizadas)
CREATE TABLE public.meeting_attendance_conferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  organizer_user_id uuid,
  meet_code text,
  google_conference_record text NOT NULL UNIQUE,
  title text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  collected_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.meeting_attendance_conferences TO authenticated;
GRANT ALL ON public.meeting_attendance_conferences TO service_role;

ALTER TABLE public.meeting_attendance_conferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_conferences_select"
ON public.meeting_attendance_conferences FOR SELECT TO authenticated
USING (public.can_access_management(auth.uid()));

CREATE TRIGGER update_meeting_attendance_conferences_updated_at
BEFORE UPDATE ON public.meeting_attendance_conferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Sessões de presença (entradas/saídas)
CREATE TABLE public.meeting_attendance_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conference_id uuid NOT NULL REFERENCES public.meeting_attendance_conferences(id) ON DELETE CASCADE,
  google_session_id text NOT NULL UNIQUE,
  participant_key text NOT NULL,
  display_name text,
  email text,
  user_id uuid,
  participant_type text NOT NULL DEFAULT 'signed_in',
  join_time timestamp with time zone,
  leave_time timestamp with time zone,
  duration_seconds integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.meeting_attendance_sessions TO authenticated;
GRANT ALL ON public.meeting_attendance_sessions TO service_role;

ALTER TABLE public.meeting_attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_sessions_select"
ON public.meeting_attendance_sessions FOR SELECT TO authenticated
USING (public.can_access_management(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_conference ON public.meeting_attendance_sessions (conference_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_participant ON public.meeting_attendance_sessions (participant_key);
CREATE INDEX IF NOT EXISTS idx_attendance_conferences_start ON public.meeting_attendance_conferences (start_time DESC);

CREATE TRIGGER update_meeting_attendance_sessions_updated_at
BEFORE UPDATE ON public.meeting_attendance_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
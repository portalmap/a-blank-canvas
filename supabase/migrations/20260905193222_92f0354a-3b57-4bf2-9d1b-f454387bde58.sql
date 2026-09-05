ALTER TABLE public.calendar_google_accounts
  ADD COLUMN IF NOT EXISTS sync_cursor jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.calendar_events
SET google_calendar_id = 'primary'
WHERE source = 'google'
  AND google_event_id IS NOT NULL
  AND google_calendar_id IS NULL;
-- Normaliza valores existentes
UPDATE public.calendar_event_guests
SET response_status = 'needsAction'
WHERE response_status IS NULL
   OR response_status NOT IN ('needsAction','accepted','declined','tentative');

UPDATE public.calendar_events
SET response_status = NULL
WHERE response_status IS NOT NULL
  AND response_status NOT IN ('needsAction','accepted','declined','tentative');

ALTER TABLE public.calendar_event_guests
  ALTER COLUMN response_status SET DEFAULT 'needsAction';

-- Validação por trigger (evita CHECK imutável)
CREATE OR REPLACE FUNCTION public.validate_calendar_response_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.response_status IS NOT NULL
     AND NEW.response_status NOT IN ('needsAction','accepted','declined','tentative') THEN
    RAISE EXCEPTION 'Resposta de convite inválida: %', NEW.response_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_guest_response_status ON public.calendar_event_guests;
CREATE TRIGGER trg_validate_guest_response_status
  BEFORE INSERT OR UPDATE ON public.calendar_event_guests
  FOR EACH ROW EXECUTE FUNCTION public.validate_calendar_response_status();

DROP TRIGGER IF EXISTS trg_validate_event_response_status ON public.calendar_events;
CREATE TRIGGER trg_validate_event_response_status
  BEFORE INSERT OR UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.validate_calendar_response_status();
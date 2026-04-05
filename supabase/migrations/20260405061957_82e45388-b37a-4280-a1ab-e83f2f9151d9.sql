
CREATE OR REPLACE FUNCTION public.calc_delivery_pct(
  p_start_date date,
  p_due_date date,
  p_reference timestamptz
) RETURNS double precision
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE 
    WHEN p_start_date IS NULL OR p_due_date IS NULL THEN NULL
    WHEN (p_due_date::timestamptz + interval '23 hours 59 minutes 59 seconds') <= p_start_date::timestamptz THEN 200.0
    ELSE LEAST(200.0, GREATEST(0.0,
      EXTRACT(EPOCH FROM (p_reference - p_start_date::timestamptz)) /
      EXTRACT(EPOCH FROM ((p_due_date::timestamptz + interval '23 hours 59 minutes 59 seconds') - p_start_date::timestamptz)) * 100.0
    ))
  END;
$$;

CREATE OR REPLACE FUNCTION public.calc_productivity_score(p_delivery_pct double precision)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_delivery_pct IS NULL THEN 100
    ELSE GREATEST(0, LEAST(200, (200 - p_delivery_pct)::integer))
  END;
$$;

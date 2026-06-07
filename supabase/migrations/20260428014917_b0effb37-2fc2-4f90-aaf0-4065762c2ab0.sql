UPDATE task_activities
SET metadata = COALESCE(metadata, '{}'::jsonb)
  || jsonb_build_object(
       'api_token_name','GCSM',
       'integration_label','Social Flow'
     )
WHERE activity_type = 'task.created'
  AND metadata->>'source' IN ('api-gateway','backfill')
  AND (metadata->>'integration_label') IS NULL;
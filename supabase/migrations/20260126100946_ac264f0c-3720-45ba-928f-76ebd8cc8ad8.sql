-- Add remove_all_assignees to automation_action enum
ALTER TYPE automation_action ADD VALUE IF NOT EXISTS 'remove_all_assignees';